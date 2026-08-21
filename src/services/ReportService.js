const db = require('../config/database');

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

class ReportService {
  async getRelatorioDetalhadoVeiculo(placa, filtros = {}) {
    const [veiculo] = await db.execute(`
      SELECT v.id, v.placa, v.ano, v.cor, v.motor,
        mo.nome as modelo, ma.nome as marca
      FROM veiculos v
      INNER JOIN modelos mo ON mo.id = v.modelo_id
      INNER JOIN marcas ma ON ma.id = mo.marca_id
      WHERE v.placa = ? AND v.ativo = 1
      LIMIT 1
    `, [placa]);

    if (!veiculo.length) {
      return { veiculo: null, meses: [], totalGeral: 0, totalAprovados: 0, geradoEm: new Date().toISOString(), periodo: null };
    }

    const v = veiculo[0];
    let whereExtra = '';
    const params = [v.id];
    if (filtros.dataInicio && filtros.dataFim) {
      whereExtra = ' AND p.data_pedido BETWEEN ? AND ?';
      params.push(filtros.dataInicio, filtros.dataFim);
    }

    const [itens] = await db.execute(`
      SELECT
        pi.quantidade, pi.valor_unitario, pi.valor_total,
        COALESCE(pe.nome, pi.descricao) as peca_nome,
        f.razao_social as fornecedor,
        p.status, p.numero as numero_pedido,
        p.data_pedido,
        YEAR(p.data_pedido) as ano_mes,
        MONTH(p.data_pedido) as mes_num
      FROM pedido_itens pi
      LEFT JOIN pecas pe ON pe.id = pi.peca_id
      LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
      INNER JOIN pedidos p ON p.id = pi.pedido_id
      WHERE p.veiculo_id = ?${whereExtra}
      ORDER BY p.data_pedido DESC, pi.id
    `, params);

    const mesesMap = {};
    for (const item of itens) {
      const chave = `${item.ano_mes}-${String(item.mes_num).padStart(2, '0')}`;
      if (!mesesMap[chave]) {
        mesesMap[chave] = {
          referencia: chave,
          label: `${MESES_PT[item.mes_num - 1]}/${item.ano_mes}`,
          itens: [],
          subtotal: 0,
          subtotalAprovados: 0
        };
      }
      mesesMap[chave].itens.push({
        data: item.data_pedido,
        numero_pedido: item.numero_pedido,
        peca_nome: item.peca_nome || '-',
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        fornecedor: item.fornecedor || '-',
        status: item.status
      });
      mesesMap[chave].subtotal += Number(item.valor_total) || 0;
      if (['aprovado', 'comprado', 'concluido'].includes(item.status)) {
        mesesMap[chave].subtotalAprovados += Number(item.valor_total) || 0;
      }
    }

    const meses = Object.values(mesesMap).sort((a, b) => b.referencia.localeCompare(a.referencia));
    const totalGeral = meses.reduce((acc, m) => acc + m.subtotal, 0);
    const totalAprovados = meses.reduce((acc, m) => acc + m.subtotalAprovados, 0);

    let periodo = null;
    if (filtros.dataInicio && filtros.dataFim) {
      const fmtPt = (d) => { const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('pt-BR'); };
      periodo = `${fmtPt(filtros.dataInicio)} a ${fmtPt(filtros.dataFim)}`;
    }

    return {
      veiculo: { placa: v.placa, marca: v.marca, modelo: v.modelo, ano: v.ano, cor: v.cor, motor: v.motor },
      meses,
      totalGeral,
      totalAprovados,
      geradoEm: new Date().toISOString(),
      periodo
    };
  }

  async getRelatorioFrotaPeriodo(filtros = {}) {
    let whereExtra = '';
    const params = [];
    if (filtros.dataInicio && filtros.dataFim) {
      whereExtra = ' AND p.data_pedido BETWEEN ? AND ?';
      params.push(filtros.dataInicio, filtros.dataFim);
    }

    const [veiculos] = await db.execute(`
      SELECT DISTINCT v.id, v.placa, v.ano, v.cor, v.motor,
        mo.nome as modelo, ma.nome as marca
      FROM veiculos v
      INNER JOIN modelos mo ON mo.id = v.modelo_id
      INNER JOIN marcas ma ON ma.id = mo.marca_id
      INNER JOIN pedidos p ON p.veiculo_id = v.id
      WHERE v.ativo = 1${whereExtra}
      ORDER BY v.placa ASC
    `, params);

    const veiculosDados = [];
    let totalGeral = 0;
    let totalAprovados = 0;

    for (const v of veiculos) {
      const itensParams = [v.id, ...params];
      const [itens] = await db.execute(`
        SELECT
          pi.quantidade, pi.valor_unitario, pi.valor_total,
          COALESCE(pe.nome, pi.descricao) as peca_nome,
          f.razao_social as fornecedor,
          p.status, p.numero as numero_pedido,
          p.data_pedido,
          YEAR(p.data_pedido) as ano_mes,
          MONTH(p.data_pedido) as mes_num
        FROM pedido_itens pi
        LEFT JOIN pecas pe ON pe.id = pi.peca_id
        LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
        INNER JOIN pedidos p ON p.id = pi.pedido_id
        WHERE p.veiculo_id = ?${whereExtra}
        ORDER BY p.data_pedido DESC, pi.id
      `, itensParams);

      const mesesMap = {};
      let subtotalVeic = 0;
      let subtotalVeicAprov = 0;

      for (const item of itens) {
        const chave = `${item.ano_mes}-${String(item.mes_num).padStart(2, '0')}`;
        if (!mesesMap[chave]) {
          mesesMap[chave] = {
            referencia: chave,
            label: `${MESES_PT[item.mes_num - 1]}/${item.ano_mes}`,
            itens: [],
            subtotal: 0,
            subtotalAprovados: 0
          };
        }
        mesesMap[chave].itens.push({
          data: item.data_pedido,
          numero_pedido: item.numero_pedido,
          peca_nome: item.peca_nome || '-',
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          fornecedor: item.fornecedor || '-',
          status: item.status
        });
        const val = Number(item.valor_total) || 0;
        mesesMap[chave].subtotal += val;
        subtotalVeic += val;
        if (['aprovado', 'comprado', 'concluido'].includes(item.status)) {
          mesesMap[chave].subtotalAprovados += val;
          subtotalVeicAprov += val;
        }
      }

      const meses = Object.values(mesesMap).sort((a, b) => b.referencia.localeCompare(a.referencia));

      veiculosDados.push({
        veiculo: { placa: v.placa, marca: v.marca, modelo: v.modelo, ano: v.ano, cor: v.cor, motor: v.motor },
        meses,
        subtotal: subtotalVeic,
        subtotalAprovados: subtotalVeicAprov
      });

      totalGeral += subtotalVeic;
      totalAprovados += subtotalVeicAprov;
    }

    let periodo = null;
    if (filtros.dataInicio && filtros.dataFim) {
      const fmtPt = (d) => { const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('pt-BR'); };
      periodo = `${fmtPt(filtros.dataInicio)} a ${fmtPt(filtros.dataFim)}`;
    }

    return {
      veiculos: veiculosDados,
      totalGeral,
      totalAprovados,
      geradoEm: new Date().toISOString(),
      periodo
    };
  }
}

module.exports = ReportService;
