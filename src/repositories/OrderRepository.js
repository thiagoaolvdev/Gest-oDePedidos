const db = require('../config/database');

class OrderRepository {
  async findByNumero(numero) {
    const [rows] = await db.query('SELECT * FROM pedidos WHERE numero = ?', [numero]);
    return rows[0] || null;
  }

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM pedidos WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findFullById(id) {
    const [rows] = await db.query(`
      SELECT p.*, v.placa, v.ano as veiculo_ano,
        mo.nome as veiculo_modelo, ma.nome as veiculo_marca,
        u.nome as usuario_nome, u.nick as usuario_nick, u.perfil as usuario_perfil,
        a.nome as aprovador_nome,
        COALESCE(m.nome, p.mecanico_nome) as mecanico_nome,
        oc.id as ordem_compra_id,
        oc.numero as ordem_compra_numero,
        oc.tipo as ordem_compra_tipo,
        oc.data_emissao as ordem_compra_data_emissao,
        oc.prazo_entrega as ordem_compra_prazo_entrega
      FROM pedidos p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      LEFT JOIN marcas ma ON ma.id = mo.marca_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN usuarios a ON a.id = p.aprovado_por
      LEFT JOIN usuarios m ON m.id = p.mecanico_id
      LEFT JOIN ordens_compra oc ON oc.pedido_id = p.id
      WHERE p.id = ?
    `, [id]);
    if (!rows[0]) return null;
    const [itens] = await db.query(`
      SELECT pi.*, pe.nome as peca_nome, pe.codigo_interno as peca_codigo,
        COALESCE(pi.descricao, pe.nome, pe.codigo_interno) as item_nome,
        f.razao_social as fornecedor_nome
      FROM pedido_itens pi
      LEFT JOIN pecas pe ON pe.id = pi.peca_id
      LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
      WHERE pi.pedido_id = ?
    `, [id]);
    const [fotos] = await db.query(
      'SELECT id, url, created_at FROM pedido_fotos WHERE pedido_id = ? ORDER BY created_at DESC', [id]
    );
    return { ...rows[0], itens, fotos };
  }

  async findAllWithFilters(filters, page, limit) {
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    let params = [];

    if (filters.status) { where.push('p.status = ?'); params.push(filters.status); }
    if (filters.status_entrega) { where.push('p.status_entrega = ?'); params.push(filters.status_entrega); }
    if (filters.veiculo_id) { where.push('p.veiculo_id = ?'); params.push(filters.veiculo_id); }
    if (filters.usuario_id) { where.push('p.usuario_id = ?'); params.push(filters.usuario_id); }
    if (filters.data_inicio) { where.push('p.data_pedido >= ?'); params.push(filters.data_inicio); }
    if (filters.data_fim) {
      where.push('p.data_pedido <= ?');
      params.push(String(filters.data_fim).length <= 10 ? `${filters.data_fim} 23:59:59` : filters.data_fim);
    }
    if (filters.search) {
      where.push('(p.numero LIKE ? OR v.placa LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    const urgenteCond = `(p.status IN ('pendente', 'em_compra', 'novo_orcamento')
      AND p.ultima_atualizacao < DATE_SUB(NOW(), INTERVAL 48 HOUR))`;
    const temFiltroData = !!(filters.data_inicio || filters.data_fim);
    if (filters.urgente === '1') {
      where.push(urgenteCond);
    } else if (!temFiltroData) {
      where.push(`NOT ${urgenteCond}`);
    }

    const whereStr = where.join(' AND ');

    const [rows] = await db.query(`
      SELECT p.*, v.placa, mo.nome as veiculo_modelo, ma.nome as veiculo_marca,
        u.nome as usuario_nome,
        COALESCE(mec.nome, p.mecanico_nome) as mecanico_nome,
        (p.status IN ('pendente', 'em_compra', 'novo_orcamento')
          AND p.ultima_atualizacao < DATE_SUB(NOW(), INTERVAL 48 HOUR)) as urgente,
        GREATEST(TIMESTAMPDIFF(HOUR, p.ultima_atualizacao, NOW()), 0) as horas_sem_resposta
      FROM pedidos p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      LEFT JOIN marcas ma ON ma.id = mo.marca_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN usuarios mec ON mec.id = p.mecanico_id
      WHERE ${whereStr}
      ORDER BY urgente DESC, p.ultima_atualizacao DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [count] = await db.query(`
      SELECT COUNT(*) as total FROM pedidos p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
      WHERE ${whereStr}
    `, params);

    return { data: rows, total: count[0].total, page, limit };
  }

  async findStaleOrders(hours = 48) {
    const [rows] = await db.query(`
      SELECT p.*, u.nome as usuario_nome, u.nick as usuario_nick
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.status NOT IN ('concluido', 'rejeitado')
      AND p.ultima_atualizacao < DATE_SUB(NOW(), INTERVAL ? HOUR)
    `, [hours]);
    return rows;
  }

  async updateStatus(id, status, extra = {}) {
    const fields = ['status = ?'];
    const params = [status];
    if (extra.data_aprovacao) { fields.push('data_aprovacao = ?'); params.push(extra.data_aprovacao); }
    if (extra.aprovado_por) { fields.push('aprovado_por = ?'); params.push(extra.aprovado_por); }
    if (extra.motivo_rejeicao) { fields.push('motivo_rejeicao = ?'); params.push(extra.motivo_rejeicao); }
    if (extra.observacoes) { fields.push('observacoes = ?'); params.push(extra.observacoes); }
    if (extra.valor_total) { fields.push('valor_total = ?'); params.push(extra.valor_total); }
    fields.push('ultima_atualizacao = NOW()');
    params.push(id);
    await db.query(`UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  async create(data) {
    const [result] = await db.query(
      'INSERT INTO pedidos (numero, veiculo_id, usuario_id, mecanico_id, mecanico_nome, status, observacoes, valor_total, previsao_entrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.numero, data.veiculo_id, data.usuario_id, data.mecanico_id || null, data.mecanico_nome || null, data.status || 'pendente', data.observacoes || null, data.valor_total || 0, data.previsao_entrega || null]
    );
    return { id: result.insertId, ...data };
  }

  async updateEntrega(id, statusEntrega) {
    await db.query('UPDATE pedidos SET status_entrega = ?, ultima_atualizacao = NOW() WHERE id = ?', [statusEntrega, id]);
  }

  async update(id, data) {
    const fields = [];
    const params = [];
    for (const key of ['veiculo_id', 'mecanico_id', 'mecanico_nome', 'observacoes', 'valor_total', 'previsao_entrega', 'status']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push('ultima_atualizacao = NOW()');
    params.push(id);
    await db.query(`UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`, params);
  }
}

module.exports = OrderRepository;
