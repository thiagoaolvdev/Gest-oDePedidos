const KpiService = require('../services/KpiService');
const { formatarValor } = require('../services/KpiService');
const { STATUS_MAP } = require('../utils/statusMap');
const gerarRelatorioKpiExcel = require('../utils/excelReportGenerator').gerarRelatorioKpiExcel;

const service = new KpiService();

const extrairPeriodo = (req) => ({
  dataInicio: req.query.dataInicio,
  dataFim: req.query.dataFim
});

const listar = async (req, res, next) => {
  try {
    const dados = await service.getTodosKpis(extrairPeriodo(req));
    res.json(dados);
  } catch (err) { next(err); }
};

const detalhar = async (req, res, next) => {
  try {
    const { chave } = req.params;
    if (!service.existe(chave)) {
      return res.status(404).json({ error: 'KPI não encontrado' });
    }
    const periodo = extrairPeriodo(req);
    const dados = await service.detalhar(chave, periodo);
    const grafico = dados.indisponivel
      ? null
      : await service.getGraficoKpi(chave, periodo, dados.registros);
    res.json({ ...dados, grafico });
  } catch (err) { next(err); }
};

const exportar = async (req, res, next) => {
  try {
    const { chave } = req.params;
    const { formato, dataInicio, dataFim } = req.query;

    if (!service.existe(chave)) {
      return res.status(404).json({ error: 'KPI não encontrado' });
    }
    if (formato && !['pdf', 'excel'].includes(formato)) {
      return res.status(400).json({ error: 'Formato invalido. Use "pdf" ou "excel".' });
    }

    const periodo = { dataInicio, dataFim };
    const kpi = await service.getKpi(chave, periodo);

    if (kpi.indisponivel) {
      return res.status(409).json({ error: kpi.motivo || 'Indicador indisponível no momento.' });
    }

    const detalhe = await service.detalhar(chave, periodo);

    const dados = {
      titulo: 'Relatório por Indicador (KPI)',
      empresa: 'Chemar Auto',
      kpi: { chave: kpi.chave, label: kpi.label, unidade: kpi.unidade },
      valor: kpi.valor,
      valorFormatado: formatarValor(kpi.unidade, kpi.valor),
      variacao: kpi.variacao,
      sem_periodo: !!kpi.sem_periodo,
      periodoTexto: kpi.periodoTexto,
      geradoPor: req.userNome || '-',
      geradoEm: new Date().toISOString(),
      colunas: detalhe.colunas,
      registros: detalhe.registros.map(r => {
        const copia = { ...r };
        if (typeof copia.status === 'string' && STATUS_MAP[copia.status]) {
          copia.status = STATUS_MAP[copia.status];
        }
        return copia;
      })
    };

    const nomeArquivo = `relatorio-kpi-${chave}-${Date.now()}`;

    if (formato === 'excel') {
      const workbook = await gerarRelatorioKpiExcel(dados);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.render('relatorio-kpi', dados);
    }
  } catch (err) { next(err); }
};

module.exports = { listar, detalhar, exportar };
