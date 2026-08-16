const db = require('../config/database');

const periodoFilter = (dias, table = '') => {
  const d = Math.min(parseInt(dias, 10) || 0, 3650);
  return d > 0 ? ` AND ${table}data_pedido >= DATE_SUB(NOW(), INTERVAL ${d} DAY)` : '';
};

class DashboardService {
  async getSummary() {
    const [pedidosMes] = await db.execute(`
      SELECT COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status IN ('aprovado', 'comprado', 'concluido') THEN valor_total END), 0) as valor_total
      FROM pedidos WHERE MONTH(data_pedido) = MONTH(NOW()) AND YEAR(data_pedido) = YEAR(NOW())
    `);
    const [pendentes] = await db.execute(`
      SELECT COUNT(*) as total FROM pedidos
      WHERE status = 'pendente' AND MONTH(data_pedido) = MONTH(NOW()) AND YEAR(data_pedido) = YEAR(NOW())
    `);
    const [aprovados] = await db.execute(`
      SELECT COUNT(*) as total FROM pedidos
      WHERE status = 'aprovado' AND MONTH(data_pedido) = MONTH(NOW()) AND YEAR(data_pedido) = YEAR(NOW())
    `);
    const [rejeitados] = await db.execute(`
      SELECT COUNT(*) as total FROM pedidos
      WHERE status = 'rejeitado' AND MONTH(data_pedido) = MONTH(NOW()) AND YEAR(data_pedido) = YEAR(NOW())
    `);
    const [veiculos] = await db.execute(`SELECT COUNT(*) as total FROM veiculos WHERE ativo = 1`);
    const [pecas] = await db.execute(`SELECT COUNT(*) as total FROM pecas WHERE ativo = 1`);

    return {
      pedidos_mes: pedidosMes[0].total,
      valor_mes: pedidosMes[0].valor_total,
      pendentes: pendentes[0].total,
      aprovados: aprovados[0].total,
      rejeitados: rejeitados[0].total,
      veiculos: veiculos[0].total,
      pecas: pecas[0].total
    };
  }

  async getPedidosPorMes(ano) {
    const [rows] = await db.execute(`
      SELECT MONTH(data_pedido) as mes, COUNT(*) as total, COALESCE(SUM(valor_total), 0) as valor
      FROM pedidos WHERE YEAR(data_pedido) = ? GROUP BY MONTH(data_pedido) ORDER BY mes
    `, [ano || new Date().getFullYear()]);
    return rows;
  }

  async getPedidosPorVeiculo(limit = 10, dias) {
    const [rows] = await db.query(`
      SELECT v.placa, mo.nome as modelo, ma.nome as marca, COUNT(p.id) as total, COALESCE(SUM(p.valor_total), 0) as valor
      FROM pedidos p LEFT JOIN veiculos v ON v.id = p.veiculo_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      LEFT JOIN marcas ma ON ma.id = mo.marca_id
      WHERE 1=1 ${periodoFilter(dias, 'p.')}
      GROUP BY p.veiculo_id ORDER BY total DESC LIMIT ?
    `, [Number(limit) || 10]);
    return rows;
  }

  async getPedidosPorUsuario(limit = 10, dias) {
    const [rows] = await db.query(`
      SELECT u.nome, u.nick, COUNT(p.id) as total, COALESCE(SUM(p.valor_total), 0) as valor
      FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE 1=1 ${periodoFilter(dias, 'p.')}
      GROUP BY p.usuario_id ORDER BY total DESC LIMIT ?
    `, [Number(limit) || 10]);
    return rows;
  }

  async getPedidosPorSetor(dias) {
    const [rows] = await db.query(`
      SELECT COALESCE(u.setor, 'Sem setor') as setor,
        COUNT(p.id) as total,
        COALESCE(SUM(p.valor_total), 0) as valor
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE 1=1 ${periodoFilter(dias, 'p.')}
      GROUP BY u.setor
      ORDER BY total DESC
    `);
    return rows;
  }

  async getGastosPorFornecedor(limit = 10) {
    const [rows] = await db.query(`
      SELECT pi.fornecedor_id, f.razao_social as fornecedor, COUNT(pi.id) as total_itens, COALESCE(SUM(pi.valor_total), 0) as valor
      FROM pedido_itens pi
      LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
      INNER JOIN pedidos p ON p.id = pi.pedido_id
      WHERE pi.fornecedor_id IS NOT NULL AND p.status IN ('aprovado', 'comprado', 'concluido')
      GROUP BY pi.fornecedor_id ORDER BY valor DESC LIMIT ?
    `, [Number(limit) || 10]);
    return rows;
  }

  async getGastosPorPeriodo(tipo = 'mensal', limite = 12) {
    let grupo;
    switch (tipo) {
      case 'diario': grupo = "DATE(data_pedido)"; break;
      case 'semanal': grupo = "YEARWEEK(data_pedido, 1)"; break;
      case 'anual': grupo = "YEAR(data_pedido)"; break;
      default: grupo = "DATE_FORMAT(data_pedido, '%Y-%m')";
    }
    const [rows] = await db.query(`
      SELECT ${grupo} as periodo, COUNT(*) as total_pedidos, COALESCE(SUM(valor_total), 0) as valor
      FROM pedidos WHERE status IN ('aprovado', 'comprado', 'concluido')
      GROUP BY periodo ORDER BY periodo DESC LIMIT ?
    `, [Number(limite) || 12]);
    return rows.reverse();
  }

  async getTopUsuarios(limit = 10) {
    const [rows] = await db.query(`
      SELECT u.nome, u.nick, COUNT(p.id) as total_pedidos, COALESCE(SUM(p.valor_total), 0) as valor_total
      FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.status NOT IN ('rejeitado', 'cancelado')
      GROUP BY p.usuario_id ORDER BY total_pedidos DESC LIMIT ?
    `, [Number(limit) || 10]);
    return rows;
  }

  async getPedidosPorStatus(dias) {
    const [rows] = await db.execute(`
      SELECT status, COUNT(*) as total, COALESCE(SUM(valor_total), 0) as valor
      FROM pedidos WHERE 1=1 ${periodoFilter(dias)}
      GROUP BY status ORDER BY FIELD(status, 'pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','comprado','concluido')
    `);
    return rows;
  }

  async getKpi() {
    const [abertos] = await db.execute(`
      SELECT COUNT(*) as total FROM pedidos WHERE status NOT IN ('concluido','rejeitado')
    `);
    const [finalizadosMes] = await db.execute(`
      SELECT COUNT(*) as total FROM pedidos WHERE status = 'concluido' AND MONTH(data_pedido) = MONTH(NOW()) AND YEAR(data_pedido) = YEAR(NOW())
    `);
    const [finalizadosMesAnterior] = await db.execute(`
      SELECT COUNT(*) as total FROM pedidos WHERE status = 'concluido' AND MONTH(data_pedido) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(data_pedido) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    `);
    const [valorGasto] = await db.execute(`
      SELECT COALESCE(SUM(valor_total), 0) as total FROM pedidos WHERE status IN ('aprovado', 'comprado', 'concluido')
    `);
    const [tempoMedio] = await db.execute(`
      SELECT COALESCE(AVG(DATEDIFF(COALESCE(data_aprovacao, ultima_atualizacao), data_pedido)), 0) as media
      FROM pedidos WHERE status IN ('concluido', 'comprado', 'aprovado')
    `);

    const fim = finalizadosMes[0].total;
    const fimAnt = finalizadosMesAnterior[0].total;
    const crescimentoFinalizados = fimAnt > 0 ? ((fim - fimAnt) / fimAnt * 100).toFixed(1) : 0;

    return {
      pedidos_abertos: { quantidade: abertos[0].total, crescimento: 0 },
      pedidos_finalizados: { quantidade: fim, crescimento: parseFloat(crescimentoFinalizados) },
      valor_gasto: valorGasto[0].total,
      tempo_medio_atendimento: parseFloat(Number(tempoMedio[0].media).toFixed(1))
    };
  }

  async getKpis(dias) {
    const [rows] = await db.execute(`
      SELECT
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pedidos_pendentes,
        COUNT(CASE WHEN status = 'aguardando_aprovacao' THEN 1 END) as pedidos_aguardando_aprovacao,
        COUNT(CASE WHEN status = 'comprado' THEN 1 END) as pedidos_comprados,
        COUNT(CASE WHEN status_entrega = 'chegou' THEN 1 END) as pedidos_chegados,
        COALESCE(SUM(CASE WHEN status IN ('aprovado', 'comprado', 'concluido') THEN valor_total END), 0) as total_valores_aprovados
      FROM pedidos WHERE 1=1 ${periodoFilter(dias)}
    `);
    return {
      pedidos_pendentes: rows[0].pedidos_pendentes,
      pedidos_aguardando_aprovacao: rows[0].pedidos_aguardando_aprovacao,
      pedidos_comprados: rows[0].pedidos_comprados,
      pedidos_chegados: rows[0].pedidos_chegados,
      total_valores_aprovados: rows[0].total_valores_aprovados
    };
  }

  async getKpisDiretor(dias) {
    const [rows] = await db.execute(`
      SELECT
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pedidos_pendentes,
        COUNT(CASE WHEN status IN ('pendente', 'em_compra', 'novo_orcamento')
          AND ultima_atualizacao < DATE_SUB(NOW(), INTERVAL 48 HOUR) THEN 1 END) as pedidos_urgentes,
        COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as pedidos_aprovados
      FROM pedidos WHERE 1=1 ${periodoFilter(dias)}
    `);
    return {
      pedidos_pendentes: rows[0].pedidos_pendentes,
      pedidos_urgentes: rows[0].pedidos_urgentes,
      pedidos_aprovados: rows[0].pedidos_aprovados
    };
  }

  async getValoresPorMes(ano, dias) {
    const period = periodoFilter(dias);
    const yearFilter = period ? '' : ' AND YEAR(data_pedido) = ?';
    const params = period ? [] : [ano || new Date().getFullYear()];
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(data_pedido, '%Y-%m') as mes,
        COALESCE(SUM(CASE WHEN status IN ('aprovado', 'comprado', 'concluido') THEN valor_total END), 0) as valor_aprovado,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor_total END), 0) as valor_pendente,
        COUNT(*) as total_pedidos
      FROM pedidos
      WHERE 1=1 ${yearFilter} ${period}
      GROUP BY DATE_FORMAT(data_pedido, '%Y-%m')
      ORDER BY mes
    `, params);
    return rows;
  }

  async getValoresGastosPorUsuario(usuarioId, dias) {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(data_pedido, '%Y-%m') as mes,
        COALESCE(SUM(valor_total), 0) as valor
      FROM pedidos
      WHERE usuario_id = ?
        AND status IN ('aprovado', 'comprado', 'concluido')
        ${periodoFilter(dias)}
      GROUP BY DATE_FORMAT(data_pedido, '%Y-%m')
      ORDER BY mes
    `, [usuarioId]);
    return rows;
  }

  async getGastosMensais() {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(data_pedido, '%Y-%m') as mes, COALESCE(SUM(valor_total), 0) as valor
      FROM pedidos WHERE status IN ('aprovado', 'comprado', 'concluido')
      GROUP BY mes ORDER BY mes LIMIT 12
    `);
    return rows;
  }

  async getDesempenhoSetores() {
    return [
      { setor: 'Oficina', pontuacao: 85 },
      { setor: 'Logística', pontuacao: 72 },
      { setor: 'Compras', pontuacao: 68 },
      { setor: 'Financeiro', pontuacao: 90 },
      { setor: 'Administrativo', pontuacao: 78 }
    ];
  }

  async getRecentes(limit = 8) {
    const [rows] = await db.query(`
      SELECT p.id, p.numero, v.placa, u.nome as solicitante,
        (SELECT f.razao_social FROM pedido_itens pi2
         LEFT JOIN fornecedores f ON f.id = pi2.fornecedor_id
         WHERE pi2.pedido_id = p.id LIMIT 1) as fornecedor,
        p.valor_total,
        p.status, p.data_pedido, m.nome as responsavel
      FROM pedidos p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN usuarios m ON m.id = p.mecanico_id
      ORDER BY p.data_pedido DESC
      LIMIT ?
    `, [Number(limit) || 8]);
    return rows;
  }

  async getRankingSolicitantes(limit = 10, dias) {
    const [rows] = await db.query(`
      SELECT u.id, u.nome, u.nick, COUNT(p.id) as total_pedidos,
        SUM(CASE WHEN p.status = 'pendente' THEN 1 ELSE 0 END) as pedidos_pendentes,
        SUM(CASE WHEN p.status = 'aprovado' THEN 1 ELSE 0 END) as pedidos_aprovados,
        COALESCE(SUM(p.valor_total), 0) as valor_total
      FROM pedidos p
      INNER JOIN usuarios u ON u.id = p.usuario_id
      WHERE 1=1 ${periodoFilter(dias, 'p.')}
      GROUP BY p.usuario_id
      ORDER BY total_pedidos DESC
      LIMIT ?
    `, [Number(limit) || 10]);
    return rows;
  }

  async getTempoMedioOrcamento() {
    const [rows] = await db.execute(`
      SELECT COALESCE(AVG(DATEDIFF(data_aprovacao, data_pedido)), 0) as media_dias
      FROM pedidos
      WHERE status IN ('aprovado', 'rejeitado') AND data_aprovacao IS NOT NULL
    `);
    return { media_dias: parseFloat(rows[0].media_dias.toFixed(1)) };
  }

  async getTempoMedioResposta(dias) {
    const [rows] = await db.execute(`
      SELECT COALESCE(AVG(TIMESTAMPDIFF(HOUR, p.data_pedido, p.data_aprovacao)), 0) as media_horas,
        COUNT(*) as total_respondidos
      FROM pedidos p
      WHERE p.data_aprovacao IS NOT NULL
        AND p.data_aprovacao > p.data_pedido
        ${periodoFilter(dias, 'p.')}
    `);
    return {
      media_horas: Number(rows[0].media_horas) || 0,
      total_respondidos: Number(rows[0].total_respondidos) || 0
    };
  }

  async getPedidosRejeitados() {
    const [rows] = await db.execute(`
      SELECT COUNT(*) as total, COALESCE(SUM(valor_total), 0) as valor_total
      FROM pedidos WHERE status = 'rejeitado'
    `);
    return { total: rows[0].total, valor_total: rows[0].valor_total };
  }

  async getPedidosAceitos() {
    const [rows] = await db.execute(`
      SELECT COUNT(*) as total, COALESCE(SUM(valor_total), 0) as valor_total
      FROM pedidos WHERE status = 'aprovado'
    `);
    return { total: rows[0].total, valor_total: rows[0].valor_total };
  }

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
          pe.nome as peca_nome, pe.codigo_interno,
          f.razao_social as fornecedor
        FROM pedido_itens pi
        INNER JOIN pecas pe ON pe.id = pi.peca_id
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
