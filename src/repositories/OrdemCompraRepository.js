const db = require('../config/database');

class OrdemCompraRepository {
  async findByPedidoId(pedidoId, conn = db) {
    const [rows] = await conn.query('SELECT * FROM ordens_compra WHERE pedido_id = ? ORDER BY id ASC', [pedidoId]);
    return rows;
  }

  async findByPedidoItemId(pedidoItemId, conn = db) {
    const [rows] = await conn.query('SELECT * FROM ordens_compra WHERE pedido_item_id = ? LIMIT 1', [pedidoItemId]);
    return rows[0] || null;
  }

  async findById(id, conn = db) {
    const [rows] = await conn.query('SELECT * FROM ordens_compra WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async create(conn, data) {
    const [result] = await conn.query(
      `INSERT INTO ordens_compra (
        pedido_id, pedido_item_id, fornecedor_id, fornecedor_nome, fornecedor_endereco, fornecedor_telefone,
        numero, tipo, prazo_entrega, condicoes_pagamento, data_emissao,
        uso_veiculo, veiculo_uso, placa_uso,
        rateio_guara, rateio_lorena, rateio_outros,
        centro_custo, observacoes, subtotal, desconto, total, criado_por
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.pedido_id,
        data.pedido_item_id,
        data.fornecedor_id,
        data.fornecedor_nome,
        data.fornecedor_endereco,
        data.fornecedor_telefone || null,
        data.tipo,
        data.prazo_entrega,
        data.condicoes_pagamento,
        data.data_emissao,
        data.uso_veiculo || null,
        data.veiculo_uso || null,
        data.placa_uso || null,
        data.rateio_guara ?? null,
        data.rateio_lorena ?? null,
        data.rateio_outros ?? null,
        data.centro_custo,
        data.observacoes || null,
        data.subtotal || 0,
        data.desconto || 0,
        data.total || 0,
        data.criado_por
      ]
    );
    return result.insertId;
  }

  async updateNumero(conn, id, numero) {
    await conn.query('UPDATE ordens_compra SET numero = ? WHERE id = ?', [numero, id]);
  }

  async linkItemToOc(conn, itemId, ocId) {
    await conn.query('UPDATE pedido_itens SET ordem_compra_id = ? WHERE id = ?', [ocId, itemId]);
  }

  async unlinkAllItemsByPedido(conn, pedidoId) {
    await conn.query('UPDATE pedido_itens SET ordem_compra_id = NULL WHERE pedido_id = ?', [pedidoId]);
  }

  async findPrintableByOcId(ocId, conn = db) {
    const [rows] = await conn.query(`
      SELECT
        oc.*,
        p.numero as pedido_numero,
        p.observacoes as pedido_observacoes,
        p.valor_total as pedido_valor_total,
        v.placa as veiculo_placa,
        v.ano as veiculo_ano,
        mo.nome as veiculo_modelo,
        ma.nome as veiculo_marca,
        u.nome as criado_por_nome,
        aprovador.nome as aprovado_por_nome,
        aprovador.perfil as aprovado_por_perfil
      FROM ordens_compra oc
      INNER JOIN pedidos p ON p.id = oc.pedido_id
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      LEFT JOIN marcas ma ON ma.id = mo.marca_id
      LEFT JOIN usuarios u ON u.id = oc.criado_por
      LEFT JOIN usuarios aprovador ON aprovador.id = p.aprovado_por
      WHERE oc.id = ?
    `, [ocId]);

    if (!rows[0]) return null;

    const [itens] = await conn.query(`
      SELECT
        pi.id,
        pi.quantidade,
        pi.valor_unitario,
        pi.valor_total,
        pi.fornecedor_id,
        pi.fornecedor_origem,
        COALESCE(pi.descricao, pe.nome, pe.codigo_interno) as descricao,
        pe.unidade,
        pe.codigo_interno as ci_os,
        f.razao_social as fornecedor_nome
      FROM pedido_itens pi
      LEFT JOIN pecas pe ON pe.id = pi.peca_id
      LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
      WHERE pi.id = ?
      ORDER BY pi.id ASC
    `, [rows[0].pedido_item_id]);

    return { ...rows[0], itens };
  }

  async findPrintableByPedidoId(pedidoId, conn = db) {
    const [ocs] = await conn.query(`
      SELECT
        oc.*,
        p.numero as pedido_numero,
        p.observacoes as pedido_observacoes,
        p.valor_total as pedido_valor_total,
        v.placa as veiculo_placa,
        v.ano as veiculo_ano,
        mo.nome as veiculo_modelo,
        ma.nome as veiculo_marca,
        u.nome as criado_por_nome,
        aprovador.nome as aprovado_por_nome,
        aprovador.perfil as aprovado_por_perfil
      FROM ordens_compra oc
      INNER JOIN pedidos p ON p.id = oc.pedido_id
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      LEFT JOIN marcas ma ON ma.id = mo.marca_id
      LEFT JOIN usuarios u ON u.id = oc.criado_por
      LEFT JOIN usuarios aprovador ON aprovador.id = p.aprovado_por
      WHERE oc.pedido_id = ?
      ORDER BY oc.id ASC
    `, [pedidoId]);

    if (!ocs.length) return [];

    const results = [];
    for (const oc of ocs) {
      const [itens] = await conn.query(`
        SELECT
          pi.id,
          pi.quantidade,
          pi.valor_unitario,
          pi.valor_total,
          pi.fornecedor_id,
          pi.fornecedor_origem,
          COALESCE(pi.descricao, pe.nome, pe.codigo_interno) as descricao,
          pe.unidade,
          pe.codigo_interno as ci_os,
          f.razao_social as fornecedor_nome
        FROM pedido_itens pi
        LEFT JOIN pecas pe ON pe.id = pi.peca_id
        LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
        WHERE pi.id = ?
        ORDER BY pi.id ASC
      `, [oc.pedido_item_id]);

      results.push({ ...oc, itens });
    }

    return results;
  }
}

module.exports = OrdemCompraRepository;
