const db = require('../config/database');

class DashboardService {
  async getPedidosPorPlaca(placa) {
    const [veiculo] = await db.execute(`
      SELECT v.id, v.placa, v.motor, v.chassi, v.cor, v.ano, v.quilometragem,
        mo.nome as modelo, ma.nome as marca
      FROM veiculos v
      INNER JOIN modelos mo ON mo.id = v.modelo_id
      INNER JOIN marcas ma ON ma.id = mo.marca_id
      WHERE v.placa = ? AND v.ativo = 1
      LIMIT 1
    `, [placa]);

    if (!veiculo.length) {
      return { veiculo: null, pedidos: [] };
    }

    const [pedidos] = await db.execute(`
      SELECT p.id, p.numero, p.valor_total, p.status, p.data_pedido,
        p.data_aprovacao, p.observacoes, p.motivo_rejeicao,
        u.nome as solicitante, COALESCE(m.nome, p.mecanico_nome) as mecanico
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN usuarios m ON m.id = p.mecanico_id
      WHERE p.veiculo_id = ?
      ORDER BY p.data_pedido DESC
    `, [veiculo[0].id]);

    for (const pedido of pedidos) {
      const [itens] = await db.execute(`
        SELECT pi.id, pi.quantidade, pi.valor_unitario, pi.valor_total,
          COALESCE(pe.nome, pi.descricao) as peca_nome, pe.codigo_interno,
          f.razao_social as fornecedor
        FROM pedido_itens pi
        LEFT JOIN pecas pe ON pe.id = pi.peca_id
        LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
        WHERE pi.pedido_id = ?
      `, [pedido.id]);
      pedido.itens = itens;
    }

    return { veiculo: veiculo[0], pedidos };
  }

  async suggestPlacas(q) {
    const [rows] = await db.execute(`
      SELECT v.placa, mo.nome as modelo, ma.nome as marca
      FROM veiculos v
      INNER JOIN modelos mo ON mo.id = v.modelo_id
      INNER JOIN marcas ma ON ma.id = mo.marca_id
      WHERE v.placa LIKE ? AND v.ativo = 1
      ORDER BY v.placa
      LIMIT 10
    `, [`${q}%`]);
    return rows;
  }
}

module.exports = DashboardService;