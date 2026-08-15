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

    const existing = await this.repo.findByPedidoId(pedidoId);
    if (existing) {
      return this.repo.findPrintableByPedidoId(pedidoId);
    }

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
    const desconto = money(data.desconto);
    const rateioGuara = data.rateio_guara !== undefined ? money(data.rateio_guara) : null;
    const rateioLorena = data.rateio_lorena !== undefined ? money(data.rateio_lorena) : null;
    const rateioOutros = data.rateio_outros !== undefined ? money(data.rateio_outros) : null;

    const printableItens = itens
      .map((item) => {
        const descricao = sanitizeText(item.item_nome || item.descricao || item.peca_nome || '');
        const quantidade = Number(item.quantidade || 0);
        const valorUnitario = Number(item.valor_unitario || 0);
        const valorTotal = Number(item.valor_total || (quantidade * valorUnitario));
        return {
          descricao,
          quantidade,
          unidade: sanitizeText(item.unidade || 'un') || 'un',
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          ci_os: sanitizeText(item.ci_os || item.peca_codigo || ''),
          aplicacao: sanitizeText(pedido.placa || data.placa_uso || '')
        };
      })
      .filter(item => item.descricao && item.quantidade > 0 && item.valor_unitario > 0);

    const subtotalItens = printableItens.reduce((sum, item) => sum + item.valor_total, 0);
    const valorAprovado = Number(pedido.valor_total ?? subtotalItens);
    const subtotal = valorAprovado;
    const total = valorAprovado;

    const missing = [];
    if (!fornecedorNome) missing.push('fornecedor_nome');
    if (!fornecedorEndereco) missing.push('fornecedor_endereco');
    if (!tipo) missing.push('tipo');
    if (!prazoEntrega) missing.push('prazo_entrega');
    if (!condicoesPagamento) missing.push('condicoes_pagamento');
    if (!printableItens.length) missing.push('itens');

    if (missing.length) {
      throw { statusCode: 400, message: 'Campos obrigatórios pendentes', fields: missing };
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SELECT id FROM pedidos WHERE id = ? FOR UPDATE', [pedidoId]);

      const [lockedExisting] = await conn.query('SELECT id FROM ordens_compra WHERE pedido_id = ? FOR UPDATE', [pedidoId]);
      if (lockedExisting[0]) {
        await conn.commit();
        return this.repo.findPrintableByPedidoId(pedidoId);
      }

      const createdId = await this.repo.create(conn, {
        pedido_id: pedidoId,
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
        subtotal,
        desconto,
        total,
        criado_por: userId
      });

      const numero = `OC-${String(createdId).padStart(6, '0')}`;
      await this.repo.updateNumero(conn, createdId, numero);
      await conn.commit();

      await registerAudit({
        userId,
        action: 'create',
        entity: 'ordens_compra',
        entityId: createdId,
        newValues: {
          pedido_id: pedidoId,
          numero,
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedorNome,
          tipo,
          prazo_entrega: prazoEntrega,
          condicoes_pagamento: condicoesPagamento,
          centro_custo: centroCusto,
          subtotal,
          desconto,
          total
        },
        ip
      });

      return this.repo.findPrintableByPedidoId(pedidoId);
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (err && err.statusCode) throw err;
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw { statusCode: 409, message: 'A ordem de compra já foi gerada para este pedido' };
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  async findPrintable(pedidoId) {
    const oc = await this.repo.findPrintableByPedidoId(pedidoId);
    if (!oc) {
      throw { statusCode: 404, message: 'Gere a ordem de compra antes de imprimir' };
    }
    return oc;
  }
}

module.exports = OrdemCompraService;
