const db = require('../config/database');
const OrderRepository = require('../repositories/OrderRepository');
const FornecedorRepository = require('../repositories/FornecedorRepository');
const OrdemCompraRepository = require('../repositories/OrdemCompraRepository');
const { registerAudit } = require('../utils/audit');
const { sanitizeText } = require('../utils/sanitize');

const money = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

class OrdemCompraService {
  constructor() {
    this.orderRepo = new OrderRepository();
    this.fornecedorRepo = new FornecedorRepository();
    this.repo = new OrdemCompraRepository();
  }

  async create(pedidoId, data, userId, ip) {
    const pedido = await this.orderRepo.findFullById(pedidoId);
    if (!pedido) {
      throw { statusCode: 404, message: 'Pedido não encontrado' };
    }

    const grupos = Array.isArray(data.grupos) && data.grupos.length ? data.grupos : null;

    if (grupos) {
      return this._createPerItem(pedido, grupos, data, userId, ip);
    }

    return this._createPerItemLegacy(pedido, data, userId, ip);
  }

  async _createPerItem(pedido, grupos, globalData, userId, ip) {
    const pedidoId = pedido.id;
    const tipo = sanitizeText(globalData.tipo || '');
    const prazoEntrega = normalizeDate(globalData.prazo_entrega);
    const condicoesPagamento = sanitizeText(globalData.condicoes_pagamento || '');
    const dataEmissao = normalizeDate(globalData.data_emissao) || new Date().toISOString().slice(0, 10);
    const centroCusto = sanitizeText(globalData.centro_custo || '') || null;
    const observacoes = sanitizeText(globalData.observacoes || '');
    const usoVeiculo = sanitizeText(globalData.uso_veiculo || '') || null;
    const veiculoUso = sanitizeText(globalData.veiculo_uso || '');
    const placaUso = sanitizeText(globalData.placa_uso || '');
    const descontoTotal = money(globalData.desconto);
    const rateioGuara = globalData.rateio_guara !== undefined ? money(globalData.rateio_guara) : null;
    const rateioLorena = globalData.rateio_lorena !== undefined ? money(globalData.rateio_lorena) : null;
    const rateioOutros = globalData.rateio_outros !== undefined ? money(globalData.rateio_outros) : null;

    const missing = [];
    if (!tipo) missing.push('tipo');
    if (!prazoEntrega) missing.push('prazo_entrega');
    if (!condicoesPagamento) missing.push('condicoes_pagamento');
    if (!grupos.length) missing.push('grupos');
    if (missing.length) {
      throw { statusCode: 400, message: 'Campos obrigatórios pendentes', fields: missing };
    }

    const allItemIds = grupos.flatMap(g => (g.itens || []).map(i => i.id).filter(Boolean));
    if (!allItemIds.length) {
      throw { statusCode: 400, message: 'Nenhum item válido encontrado nos grupos' };
    }

    const totalValorItens = grupos.reduce((sum, g) =>
      sum + (g.itens || []).reduce((s, i) => s + Number(i.valor_total || 0), 0), 0
    );

    const createdOcIds = [];
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SELECT id FROM pedidos WHERE id = ? FOR UPDATE', [pedidoId]);

      const existingOcs = await this.repo.findByPedidoId(pedidoId, conn);
      const existingItemIds = new Set(existingOcs.map(oc => oc.pedido_item_id));

      for (const grupo of grupos) {
        const fornecedorId = grupo.fornecedor_id || null;
        const fornecedor = fornecedorId ? await this.fornecedorRepo.findById(fornecedorId) : null;

        const fornecedorNome = sanitizeText(grupo.fornecedor_nome || fornecedor?.razao_social || '');
        const fornecedorEndereco = sanitizeText(grupo.fornecedor_endereco || fornecedor?.endereco || '');
        const fornecedorTelefone = sanitizeText(grupo.fornecedor_telefone || fornecedor?.telefone || '');

        const itensGrupo = Array.isArray(grupo.itens) ? grupo.itens : [];

        for (const item of itensGrupo) {
          const pedidoItemId = item.id;
          if (!pedidoItemId || existingItemIds.has(pedidoItemId)) continue;

          const descricao = sanitizeText(item.item_nome || item.descricao || item.peca_nome || '');
          const quantidade = Number(item.quantidade || 0);
          const valorUnitario = Number(item.valor_unitario || 0);
          const valorTotal = Number(item.valor_total || (quantidade * valorUnitario));

          if (!descricao || quantidade <= 0 || valorUnitario <= 0) continue;

          const subtotalItem = valorTotal;
          const descontoItem = totalValorItens > 0
            ? Math.round((valorTotal / totalValorItens) * descontoTotal * 100) / 100
            : 0;
          const totalItem = subtotalItem - descontoItem;

          const createdId = await this.repo.create(conn, {
            pedido_id: pedidoId,
            pedido_item_id: pedidoItemId,
            fornecedor_id: fornecedorId,
            fornecedor_nome: fornecedorNome,
            fornecedor_endereco: fornecedorEndereco,
            fornecedor_telefone: fornecedorTelefone || null,
            tipo,
            prazo_entrega: prazoEntrega,
            condicoes_pagamento: condicoesPagamento,
            data_emissao: dataEmissao,
            uso_veiculo: usoVeiculo,
            veiculo_uso: veiculoUso || null,
            placa_uso: placaUso || null,
            rateio_guara: rateioGuara,
            rateio_lorena: rateioLorena,
            rateio_outros: rateioOutros,
            centro_custo: centroCusto,
            observacoes: observacoes || null,
            subtotal: subtotalItem,
            desconto: descontoItem,
            total: totalItem,
            criado_por: userId
          });

          const numero = `OC-${String(createdId).padStart(6, '0')}`;
          await this.repo.updateNumero(conn, createdId, numero);
          await this.repo.linkItemToOc(conn, pedidoItemId, createdId);

          createdOcIds.push(createdId);
          existingItemIds.add(pedidoItemId);

          await registerAudit({
            userId,
            action: 'create',
            entity: 'ordens_compra',
            entityId: createdId,
            newValues: {
              pedido_id: pedidoId,
              pedido_item_id: pedidoItemId,
              numero,
              fornecedor_id: fornecedorId,
              fornecedor_nome: fornecedorNome,
              tipo,
              prazo_entrega: prazoEntrega,
              condicoes_pagamento: condicoesPagamento,
              centro_custo: centroCusto,
              subtotal: subtotalItem,
              desconto: descontoItem,
              total: totalItem
            },
            ip
          });
        }
      }

      await conn.commit();
      return createdOcIds;
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (err && err.statusCode) throw err;
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw { statusCode: 409, message: 'Ordem de compra já foi gerada para este item' };
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  async _createPerItemLegacy(pedido, data, userId, ip) {
    const itens = Array.isArray(data.itens) && data.itens.length ? data.itens : (Array.isArray(pedido.itens) ? pedido.itens : []);
    const fornecedorId = data.fornecedor_id || itens.find(item => item.fornecedor_id)?.fornecedor_id || null;
    const fornecedor = fornecedorId ? await this.fornecedorRepo.findById(fornecedorId) : null;

    const fornecedorNome = sanitizeText(data.fornecedor_nome || fornecedor?.razao_social || '');
    const fornecedorEndereco = sanitizeText(data.fornecedor_endereco || fornecedor?.endereco || '');
    const fornecedorTelefone = sanitizeText(data.fornecedor_telefone || fornecedor?.telefone || '');
    const tipo = sanitizeText(data.tipo || '');
    const prazoEntrega = normalizeDate(data.prazo_entrega);
    const condicoesPagamento = sanitizeText(data.condicoes_pagamento || '');
    const dataEmissao = normalizeDate(data.data_emissao) || new Date().toISOString().slice(0, 10);
    const centroCusto = sanitizeText(data.centro_custo || '') || null;
    const observacoes = sanitizeText(data.observacoes || '');
    const usoVeiculo = sanitizeText(data.uso_veiculo || '') || null;
    const veiculoUso = sanitizeText(data.veiculo_uso || '');
    const placaUso = sanitizeText(data.placa_uso || '');
    const descontoTotal = money(data.desconto);
    const rateioGuara = data.rateio_guara !== undefined ? money(data.rateio_guara) : null;
    const rateioLorena = data.rateio_lorena !== undefined ? money(data.rateio_lorena) : null;
    const rateioOutros = data.rateio_outros !== undefined ? money(data.rateio_outros) : null;

    const missing = [];
    if (!tipo) missing.push('tipo');
    if (!prazoEntrega) missing.push('prazo_entrega');
    if (!condicoesPagamento) missing.push('condicoes_pagamento');
    if (!itens.length) missing.push('itens');
    if (missing.length) {
      throw { statusCode: 400, message: 'Campos obrigatórios pendentes', fields: missing };
    }

    const pedidoId = pedido.id;
    const totalValorItens = itens.reduce((sum, i) => sum + Number(i.valor_total || 0), 0);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SELECT id FROM pedidos WHERE id = ? FOR UPDATE', [pedidoId]);

      const existingOcs = await this.repo.findByPedidoId(pedidoId, conn);
      const existingItemIds = new Set(existingOcs.map(oc => oc.pedido_item_id));

      const createdOcIds = [];
      for (const item of itens) {
        const pedidoItemId = item.id;
        if (!pedidoItemId || existingItemIds.has(pedidoItemId)) continue;

        const descricao = sanitizeText(item.item_nome || item.descricao || item.peca_nome || '');
        const quantidade = Number(item.quantidade || 0);
        const valorUnitario = Number(item.valor_unitario || 0);
        const valorTotal = Number(item.valor_total || (quantidade * valorUnitario));

        if (!descricao || quantidade <= 0 || valorUnitario <= 0) continue;

        const subtotalItem = valorTotal;
        const descontoItem = totalValorItens > 0
          ? Math.round((valorTotal / totalValorItens) * descontoTotal * 100) / 100
          : 0;
        const totalItem = subtotalItem - descontoItem;

        const createdId = await this.repo.create(conn, {
          pedido_id: pedidoId,
          pedido_item_id: pedidoItemId,
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedorNome,
          fornecedor_endereco: fornecedorEndereco,
          fornecedor_telefone: fornecedorTelefone || null,
          tipo,
          prazo_entrega: prazoEntrega,
          condicoes_pagamento: condicoesPagamento,
          data_emissao: dataEmissao,
          uso_veiculo: usoVeiculo,
          veiculo_uso: veiculoUso || null,
          placa_uso: placaUso || null,
          rateio_guara: rateioGuara,
          rateio_lorena: rateioLorena,
          rateio_outros: rateioOutros,
          centro_custo: centroCusto,
          observacoes: observacoes || null,
          subtotal: subtotalItem,
          desconto: descontoItem,
          total: totalItem,
          criado_por: userId
        });

        const numero = `OC-${String(createdId).padStart(6, '0')}`;
        await this.repo.updateNumero(conn, createdId, numero);
        await this.repo.linkItemToOc(conn, pedidoItemId, createdId);

        createdOcIds.push(createdId);
        existingItemIds.add(pedidoItemId);
      }

      await conn.commit();

      if (createdOcIds.length) {
        await registerAudit({
          userId,
          action: 'create',
          entity: 'ordens_compra',
          entityId: createdOcIds[0],
          newValues: {
            pedido_id: pedidoId,
            numero: `OC-${String(createdOcIds[0]).padStart(6, '0')}`,
            fornecedor_nome: fornecedorNome,
            tipo,
            prazo_entrega: prazoEntrega,
            condicoes_pagamento: condicoesPagamento,
            centro_custo: centroCusto
          },
          ip
        });
      }

      return createdOcIds;
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (err && err.statusCode) throw err;
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw { statusCode: 409, message: 'Ordem de compra já foi gerada para este item' };
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  async findAllByPedido(pedidoId) {
    const ocs = await this.repo.findByPedidoId(pedidoId);
    return ocs.map(oc => ({
      id: oc.id,
      numero: oc.numero,
      fornecedor_nome: oc.fornecedor_nome,
      fornecedor_id: oc.fornecedor_id,
      subtotal: oc.subtotal,
      total: oc.total,
      tipo: oc.tipo,
      prazo_entrega: oc.prazo_entrega,
      data_emissao: oc.data_emissao,
      created_at: oc.created_at
    }));
  }

  async findPrintable(pedidoId, ocId) {
    if (ocId) {
      const oc = await this.repo.findPrintableByOcId(ocId);
      if (!oc) {
        throw { statusCode: 404, message: 'Ordem de compra não encontrada' };
      }
      return [oc];
    }

    const ocs = await this.repo.findPrintableByPedidoId(pedidoId);
    if (!ocs.length) {
      throw { statusCode: 404, message: 'Gere a ordem de compra antes de imprimir' };
    }

    return ocs;
  }
}

module.exports = OrdemCompraService;
