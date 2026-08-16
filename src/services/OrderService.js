const OrderRepository = require('../repositories/OrderRepository');
const NotificationRepository = require('../repositories/NotificationRepository');
const PartRepository = require('../repositories/PartRepository');
const UserRepository = require('../repositories/UserRepository');
const { registerAudit } = require('../utils/audit');
const { generateOrderNumber } = require('../utils/helpers');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');
const { sanitizePayload, sanitizeText } = require('../utils/sanitize');

class OrderService {
  constructor() {
    this.repo = new OrderRepository();
    this.notifRepo = new NotificationRepository();
    this.partRepo = new PartRepository();
    this.userRepo = new UserRepository();
  }

  async findAll(filters, page, limit) {
    return this.repo.findAllWithFilters(filters, page, limit);
  }

  async findById(id) {
    const order = await this.repo.findFullById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };
    return order;
  }

  async create(data, userId, ip) {
    const safeData = sanitizePayload(data, ['observacoes', 'mecanico_nome', 'previsao_entrega']);
    const numero = generateOrderNumber();
    let valorTotal = 0;

    const orderData = {
      numero,
      veiculo_id: safeData.veiculo_id,
      previsao_entrega: safeData.previsao_entrega || null,
      usuario_id: userId,
      mecanico_id: safeData.mecanico_id || null,
      mecanico_nome: safeData.mecanico_nome || null,
      status: 'pendente',
      observacoes: safeData.observacoes || null,
      valor_total: 0
    };

    const result = await this.repo.create(orderData);
    const orderId = result.id;

    for (const item of (safeData.itens || [])) {
      const db = require('../config/database');
      const valorUnitario = item.valor_unitario || 0;
      const valorTotalItem = (item.quantidade || 1) * valorUnitario;
      valorTotal += valorTotalItem;
      await db.query(
        'INSERT INTO pedido_itens (pedido_id, peca_id, descricao, quantidade, valor_unitario, valor_total, fornecedor_id, fornecedor_origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.peca_id || null, item.descricao || null, item.quantidade || 1, valorUnitario, valorTotalItem, item.fornecedor_id || null, item.fornecedor_origem || null]
      );
    }

    let status = 'pendente';
    if (valorTotal > authConfig.directorApprovalLimit) {
      status = 'aguardando_aprovacao';
      await this._notifyDirectors(orderId, numero, valorTotal);
    }

    await this.repo.updateStatus(orderId, status, { valor_total: valorTotal });
    await this._registrarHistorico(orderId, userId, status, 'Pedido criado');
    await registerAudit({ userId, action: 'create', entity: 'pedidos', entityId: orderId, newValues: { numero, valor_total: valorTotal }, ip });
    logger.info(`Pedido criado: ${numero} - R$ ${valorTotal}`);

    return this.repo.findFullById(orderId);
  }

  async update(id, data, userId, perfil, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };
    if (!['pendente', 'em_compra', 'novo_orcamento'].includes(order.status)) {
      throw { statusCode: 400, message: 'Pedido não pode ser alterado no status atual' };
    }

    if (perfil !== 'logistica') {
      throw { statusCode: 403, message: 'Apenas o perfil logística pode editar pedidos' };
    }

    const oldValues = order;
    const updateData = {};
    const safeData = sanitizePayload(data, ['observacoes', 'mecanico_nome', 'previsao_entrega']);
    if (safeData.observacoes !== undefined) updateData.observacoes = safeData.observacoes;
    if (data.veiculo_id) updateData.veiculo_id = data.veiculo_id;
    if (safeData.mecanico_nome !== undefined) updateData.mecanico_nome = safeData.mecanico_nome;
    if (safeData.mecanico_id !== undefined) updateData.mecanico_id = safeData.mecanico_id;
    if (safeData.previsao_entrega !== undefined) updateData.previsao_entrega = safeData.previsao_entrega;

    let temCotacao = false;
    const podeDefinirPreco = perfil === 'logistica';

    if (safeData.itens && safeData.itens.length > 0) {
      const invalidItem = safeData.itens.some((item) => {
        const descricao = String(item.descricao || '').trim();
        const quantidade = Number(item.quantidade || 0);
        if (!descricao || quantidade < 1) return true;
        if (perfil === 'logistica') {
          const valorUnitario = Number(item.valor_unitario || 0);
          const origem = String(item.fornecedor_origem || '').trim();
          if (!(valorUnitario > 0) || !origem) return true;
        }
        return false;
      });
      if (invalidItem) {
        throw { statusCode: 400, message: 'Preencha todos os campos obrigatórios dos itens antes de finalizar' };
      }
      const db = require('../config/database');
      await db.execute('DELETE FROM pedido_itens WHERE pedido_id = ?', [id]);
      let valorTotal = 0;
      temCotacao = podeDefinirPreco && safeData.itens.some((item) => item.fornecedor_id || item.valor_unitario !== undefined);
      for (const item of safeData.itens) {
        const valorUnitario = podeDefinirPreco ? (item.valor_unitario || 0) : 0;
        const valorTotalItem = (item.quantidade || 1) * valorUnitario;
        valorTotal += valorTotalItem;
        await db.query(
          'INSERT INTO pedido_itens (pedido_id, peca_id, descricao, quantidade, valor_unitario, valor_total, fornecedor_id, fornecedor_origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, item.peca_id || null, item.descricao || null, item.quantidade || 1, valorUnitario, valorTotalItem, item.fornecedor_id || null, item.fornecedor_origem || null]
        );
      }
      updateData.valor_total = valorTotal;

      if (temCotacao && !['aguardando_aprovacao', 'aprovado'].includes(order.status)) {
        updateData.status = 'aguardando_aprovacao';
      }
    }

    await this.repo.update(id, updateData);
    if (updateData.status && updateData.status !== order.status) {
      await this._registrarHistorico(id, userId, updateData.status, 'Cotação enviada pela logística');
    }
    await registerAudit({ userId, action: 'update', entity: 'pedidos', entityId: id, oldValues, newValues: safeData, ip });
    logger.info(`Pedido atualizado: ${order.numero}`);

    if (updateData.status === 'aguardando_aprovacao') {
      await this._notifyRequesterForApproval(id, order.numero, updateData.valor_total);
    } else if (temCotacao && podeDefinirPreco) {
      await this._notifyRequesterForApproval(id, order.numero, updateData.valor_total || order.valor_total);
    }

    if (Number(updateData.valor_total || order.valor_total) > authConfig.directorApprovalLimit) {
      await this._notifyDirectors(id, order.numero, updateData.valor_total || order.valor_total);
    }

    return this.repo.findFullById(id);
  }

  async updateStatus(id, data, userId, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };

    const novoStatus = data.status;
    const statusFlow = ['pendente', 'em_compra', 'aguardando_aprovacao', 'novo_orcamento', 'aprovado', 'comprado', 'concluido'];
    const currentIdx = statusFlow.indexOf(order.status);
    const newIdx = statusFlow.indexOf(novoStatus);

    const canResubmitQuote = order.status === 'novo_orcamento' && novoStatus === 'aguardando_aprovacao';
    if (newIdx < currentIdx && novoStatus !== 'rejeitado' && !canResubmitQuote) {
      throw { statusCode: 400, message: 'Não é possível retroceder o status' };
    }

    const oldValues = { status: order.status };
    const extra = {};

    if (novoStatus === 'em_compra') {
      if (data.fornecedor_id || data.valor_total) {
        const db = require('../config/database');
        const itens = data.itens || [];
        for (const item of itens) {
          await db.query(
            'UPDATE pedido_itens SET fornecedor_id = ?, valor_unitario = ?, valor_total = ? WHERE id = ?',
            [item.fornecedor_id || null, item.valor_unitario || 0, (item.quantidade || 1) * (item.valor_unitario || 0), item.id]
          );
        }
        if (data.valor_total !== undefined) {
          extra.valor_total = data.valor_total;
          await this.repo.updateStatus(id, 'aguardando_aprovacao', { ...extra, valor_total: data.valor_total });
          await this._registrarHistorico(id, userId, 'aguardando_aprovacao', 'Cotação enviada pela logística');
          await registerAudit({ userId, action: 'status_update', entity: 'pedidos', entityId: id, oldValues, newValues: { status: 'aguardando_aprovacao' }, ip });
          await this._notifyRequesterForApproval(id, order.numero, data.valor_total);
          if (Number(data.valor_total) > authConfig.directorApprovalLimit) {
            await this._notifyDirectors(id, order.numero, data.valor_total);
          }
          return this.repo.findFullById(id);
        }
      }
    }

    await this.repo.updateStatus(id, novoStatus, extra);
    await this._registrarHistorico(id, userId, novoStatus);
    await registerAudit({ userId, action: 'status_update', entity: 'pedidos', entityId: id, oldValues, newValues: { status: novoStatus }, ip });
    logger.info(`Pedido ${order.numero} status: ${novoStatus}`);

    if (canResubmitQuote) {
      await this._notifyRequesterForApproval(id, order.numero, order.valor_total);
      if (Number(order.valor_total) > authConfig.directorApprovalLimit) {
        await this._notifyDirectors(id, order.numero, order.valor_total);
      }
    }

    const user = await this.userRepo.findById(order.usuario_id);
    if (user) {
      await this.notifRepo.create({
        usuario_id: user.id,
        titulo: `Pedido ${order.numero} atualizado`,
        mensagem: `O pedido ${order.numero} foi atualizado para "${novoStatus}".`,
        tipo: 'info',
        pedido_id: id
      });
    }

    return this.repo.findFullById(id);
  }

  async updateEntrega(id, data, userId, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };

    const { status_entrega } = data;
    if (!['pendente', 'em_transito', 'chegou'].includes(status_entrega)) {
      throw { statusCode: 400, message: 'Status de entrega inválido' };
    }

    const oldStatusEntrega = order.status_entrega;
    await this.repo.updateEntrega(id, status_entrega);
    await this._registrarHistorico(id, userId, `entrega_${status_entrega}`, `Entrega atualizada para "${status_entrega}"`);

    if (status_entrega === 'chegou' && oldStatusEntrega !== 'chegou' && order.status === 'comprado') {
      const fullOrder = await this.repo.findFullById(id);
      for (const item of fullOrder.itens || []) {
        if (item.peca_id && Number(item.quantidade || 0) > 0) {
          await this.partRepo.incrementStock(item.peca_id, Number(item.quantidade || 0));
        }
      }
    }

    await registerAudit({ userId, action: 'update_entrega', entity: 'pedidos', entityId: id, oldValues: { status_entrega: order.status_entrega }, newValues: { status_entrega }, ip });
    logger.info(`Pedido ${order.numero} entrega: ${status_entrega}`);

    return this.repo.findFullById(id);
  }

  async approve(id, userId, perfil, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };
    if (order.status !== 'aguardando_aprovacao') {
      throw { statusCode: 400, message: 'Pedido não está aguardando aprovação' };
    }

    if (Number(order.valor_total) > authConfig.directorApprovalLimit && perfil !== 'diretor') {
      const limite = authConfig.directorApprovalLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      throw { statusCode: 403, message: `Pedido acima de ${limite} requer autorização do diretor` };
    }

    const isOwner = Number(order.usuario_id) === Number(userId);
    const isLogistica = perfil === 'logistica';
    const isDiretor = perfil === 'diretor';
    if (!isOwner && !isLogistica && !isDiretor) {
      throw { statusCode: 403, message: 'Apenas quem solicitou o pedido pode aprovar esta cotação' };
    }

    await this.repo.updateStatus(id, 'aprovado', {
      aprovado_por: userId,
      data_aprovacao: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });

    await this._registrarHistorico(id, userId, 'aprovado', 'Pedido aprovado');
    await registerAudit({ userId, action: 'approve', entity: 'pedidos', entityId: id, oldValues: { status: order.status }, newValues: { status: 'aprovado' }, ip });
    logger.info(`Pedido ${order.numero} aprovado por usuário ${userId}`);

    const user = await this.userRepo.findById(order.usuario_id);
    if (user) {
      await this.notifRepo.create({
        usuario_id: user.id,
        titulo: `Pedido ${order.numero} aprovado`,
        mensagem: `Seu pedido ${order.numero} foi aprovado.`,
        tipo: 'aprovacao',
        pedido_id: id
      });
    }

    return this.repo.findFullById(id);
  }

  async reject(id, userId, perfil, data, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };
    if (order.status !== 'aguardando_aprovacao') {
      throw { statusCode: 400, message: 'Pedido não está aguardando aprovação' };
    }

    if (Number(order.valor_total) > authConfig.directorApprovalLimit && perfil !== 'diretor') {
      const limite = authConfig.directorApprovalLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      throw { statusCode: 403, message: `Pedido acima de ${limite} requer autorização do diretor` };
    }

    const isOwner = Number(order.usuario_id) === Number(userId);
    const isLogistica = perfil === 'logistica';
    const isDiretor = perfil === 'diretor';
    if (!isOwner && !isLogistica && !isDiretor) {
      throw { statusCode: 403, message: 'Apenas quem solicitou o pedido pode rejeitar esta cotação' };
    }

    await this.repo.updateStatus(id, 'rejeitado', {
      motivo_rejeicao: sanitizeText(data.motivo || 'Sem justificativa'),
      aprovado_por: userId,
      data_aprovacao: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });

    await this._registrarHistorico(id, userId, 'rejeitado', 'Pedido cancelado/rejeitado');
    await registerAudit({ userId, action: 'reject', entity: 'pedidos', entityId: id, oldValues: { status: order.status }, newValues: { status: 'rejeitado', motivo: data.motivo }, ip });
    logger.info(`Pedido ${order.numero} cancelado por usuário ${userId}`);

    const user = await this.userRepo.findById(order.usuario_id);
    if (user) {
      await this.notifRepo.create({
        usuario_id: user.id,
        titulo: `Pedido ${order.numero} cancelado`,
        mensagem: `Seu pedido ${order.numero} foi cancelado. Motivo: ${sanitizeText(data.motivo || 'Sem justificativa')}`,
        tipo: 'rejeicao',
        pedido_id: id
      });
    }

    return this.repo.findFullById(id);
  }

  async requestNewQuote(id, userId, perfil, data, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };
    if (order.status !== 'aguardando_aprovacao') {
      throw { statusCode: 400, message: 'Pedido não está aguardando aprovação' };
    }

    const isOwner = Number(order.usuario_id) === Number(userId);
    const isLogistica = perfil === 'logistica';
    if (!isOwner && !isLogistica) {
      throw { statusCode: 403, message: 'Apenas quem solicitou o pedido pode solicitar um novo orçamento' };
    }

    const motivo = sanitizeText(data.motivo || '');

    await this.repo.updateStatus(id, 'novo_orcamento', {
      motivo_rejeicao: motivo || null,
      aprovado_por: userId,
      data_aprovacao: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });

    await this._registrarHistorico(id, userId, 'novo_orcamento', 'Novo orçamento solicitado');
    await registerAudit({ userId, action: 'request_new_quote', entity: 'pedidos', entityId: id, oldValues: { status: order.status }, newValues: { status: 'novo_orcamento', motivo }, ip });
    logger.info(`Pedido ${order.numero} novo orçamento solicitado por usuário ${userId}`);

    const logistics = await this.userRepo.findByPerfil('logistica');
    for (const log of logistics) {
      await this.notifRepo.create({
        usuario_id: log.id,
        titulo: `Novo orçamento solicitado - Pedido ${order.numero}`,
        mensagem: `O solicitante pediu um novo orçamento para o pedido ${order.numero}.${motivo ? ` Motivo: ${motivo}` : ''}`,
        tipo: 'info',
        pedido_id: id
      });
    }

    return this.repo.findFullById(id);
  }

  async delete(id, userId, perfil, ip) {
    const order = await this.repo.findById(id);
    if (!order) throw { statusCode: 404, message: 'Pedido não encontrado' };

    const isOwner = order.usuario_id === userId;
    const isAdmin = perfil === 'garantia' || perfil === 'funilaria' || perfil === 'diretor';

    if (!isOwner && !isAdmin) {
      throw { statusCode: 403, message: 'Você só pode excluir seus próprios pedidos' };
    }

    if (order.status !== 'pendente' && !isAdmin) {
      throw { statusCode: 400, message: 'Apenas pedidos pendentes podem ser excluídos' };
    }

    const db = require('../config/database');
    await db.execute('DELETE FROM pedido_itens WHERE pedido_id = ?', [id]);
    await db.execute('DELETE FROM notificacoes WHERE pedido_id = ?', [id]);
    await db.execute('DELETE FROM pedido_historico WHERE pedido_id = ?', [id]);
    await db.execute('DELETE FROM pedidos WHERE id = ?', [id]);

    await registerAudit({ userId, action: 'delete', entity: 'pedidos', entityId: id, oldValues: { numero: order.numero }, ip });
    logger.info(`Pedido excluído: ${order.numero}`);
    return true;
  }

  async _registrarHistorico(pedidoId, userId, status, descricao = '') {
    const db = require('../config/database');
    await db.query(
      'INSERT INTO pedido_historico (pedido_id, usuario_id, status, descricao) VALUES (?, ?, ?, ?)',
      [pedidoId, userId || null, status, descricao || null]
    );
  }

  async _notifyDirectors(orderId, numero, valorTotal) {
    const directors = await this.userRepo.findByPerfil('diretor');
    for (const dir of directors) {
      await this.notifRepo.create({
        usuario_id: dir.id,
        titulo: `Pedido ${numero} aguarda aprovação`,
        mensagem: `Pedido ${numero} no valor de R$ ${valorTotal.toFixed(2)} aguarda sua aprovação.`,
        tipo: 'aprovacao',
        pedido_id: orderId
      });
    }
  }

  async _notifyRequesterForApproval(orderId, numero, valorTotal) {
    const order = await this.repo.findById(orderId);
    if (!order) return;
    const user = await this.userRepo.findById(order.usuario_id);
    if (!user) return;

    await this.notifRepo.create({
      usuario_id: user.id,
      titulo: `Cotação do pedido ${numero} pronta para aprovação`,
      mensagem: `A cotação do pedido ${numero} ficou pronta no valor de R$ ${Number(valorTotal || 0).toFixed(2)}. Aceite o pedido ou solicite um novo orçamento.`,
      tipo: 'aprovacao',
      pedido_id: orderId
    });
  }
}

module.exports = OrderService;
