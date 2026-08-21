const ReportService = require('../services/ReportService');
const gerarRelatorioVeiculoPDF = require('../utils/pdfReportGenerator');
const gerarRelatorioVeiculoExcel = require('../utils/excelReportGenerator');
const gerarRelatorioFrotaPDF = require('../utils/pdfFrotaGenerator');
const gerarRelatorioFrotaExcel = require('../utils/excelFrotaGenerator');

const service = new ReportService();

const exportRelatorioVeiculo = async (req, res, next) => {
  try {
    const { placa } = req.params;
    const { formato, dataInicio, dataFim } = req.query;

    if (!formato || !['pdf', 'excel'].includes(formato)) {
      return res.status(400).json({ message: 'Formato invalido. Use "pdf" ou "excel".' });
    }

    if (!placa || !placa.trim()) {
      return res.status(400).json({ message: 'Informe a placa do veiculo.' });
    }

    const filtros = {};
    if (dataInicio && dataFim) {
      filtros.dataInicio = dataInicio;
      filtros.dataFim = dataFim;
    }

    const dados = await service.getRelatorioDetalhadoVeiculo(placa.trim().toUpperCase(), filtros);

    if (!dados.veiculo) {
      return res.status(404).json({ message: 'Veiculo nao encontrado.' });
    }

    const nomeArquivo = `relatorio-${dados.veiculo.placa}-${Date.now()}`;

    if (formato === 'excel') {
      const workbook = await gerarRelatorioVeiculoExcel(dados);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.pdf"`);
      const doc = gerarRelatorioVeiculoPDF(dados);
      doc.pipe(res);
      doc.end();
    }
  } catch (err) { next(err); }
};

const exportRelatorioFrota = async (req, res, next) => {
  try {
    const { formato, dataInicio, dataFim } = req.query;

    if (!formato || !['pdf', 'excel'].includes(formato)) {
      return res.status(400).json({ message: 'Formato invalido. Use "pdf" ou "excel".' });
    }

    const filtros = {};
    if (dataInicio && dataFim) {
      filtros.dataInicio = dataInicio;
      filtros.dataFim = dataFim;
    }

    const dados = await service.getRelatorioFrotaPeriodo(filtros);

    if (!dados.veiculos || !dados.veiculos.length) {
      return res.status(404).json({ message: 'Nenhum veiculo com pedidos encontrado para o periodo informado.' });
    }

    const nomeArquivo = `relatorio-frota-${Date.now()}`;

    if (formato === 'excel') {
      const workbook = await gerarRelatorioFrotaExcel(dados);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.pdf"`);
      const doc = gerarRelatorioFrotaPDF(dados);
      doc.pipe(res);
      doc.end();
    }
  } catch (err) { next(err); }
};

module.exports = { exportRelatorioVeiculo, exportRelatorioFrota };
