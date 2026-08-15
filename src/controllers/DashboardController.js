const DashboardService = require('../services/DashboardService');

const service = new DashboardService();

const summary = async (req, res, next) => {
  try {
    const data = await service.getSummary();
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosPorMes = async (req, res, next) => {
  try {
    const data = await service.getPedidosPorMes(req.query.ano);
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosPorVeiculo = async (req, res, next) => {
  try {
    const data = await service.getPedidosPorVeiculo(req.query.limit);
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosPorUsuario = async (req, res, next) => {
  try {
    const data = await service.getPedidosPorUsuario(req.query.limit);
    res.json(data);
  } catch (err) { next(err); }
};

const gastosPorFornecedor = async (req, res, next) => {
  try {
    const data = await service.getGastosPorFornecedor(req.query.limit);
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosPorStatus = async (req, res, next) => {
  try {
    const data = await service.getPedidosPorStatus();
    res.json(data);
  } catch (err) { next(err); }
};

const gastosPorPeriodo = async (req, res, next) => {
  try {
    const data = await service.getGastosPorPeriodo(req.query.tipo, req.query.limite);
    res.json(data);
  } catch (err) { next(err); }
};

const topUsuarios = async (req, res, next) => {
  try {
    const data = await service.getTopUsuarios(req.query.limit);
    res.json(data);
  } catch (err) { next(err); }
};

const kpi = async (req, res, next) => {
  try {
    const data = await service.getKpi();
    res.json(data);
  } catch (err) { next(err); }
};

const kpis = async (req, res, next) => {
  try {
    const data = await service.getKpis();
    res.json(data);
  } catch (err) { next(err); }
};

const gastosMensais = async (req, res, next) => {
  try {
    const data = await service.getGastosMensais();
    res.json(data);
  } catch (err) { next(err); }
};

const desempenhoSetores = async (req, res, next) => {
  try {
    const data = await service.getDesempenhoSetores();
    res.json(data);
  } catch (err) { next(err); }
};

const recentes = async (req, res, next) => {
  try {
    const data = await service.getRecentes(req.query.limit || 8);
    res.json(data);
  } catch (err) { next(err); }
};

const rankingSolicitantes = async (req, res, next) => {
  try {
    const data = await service.getRankingSolicitantes(req.query.limit);
    res.json(data);
  } catch (err) { next(err); }
};

const tempoMedioOrcamento = async (req, res, next) => {
  try {
    const data = await service.getTempoMedioOrcamento();
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosRejeitados = async (req, res, next) => {
  try {
    const data = await service.getPedidosRejeitados();
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosAceitos = async (req, res, next) => {
  try {
    const data = await service.getPedidosAceitos();
    res.json(data);
  } catch (err) { next(err); }
};

const pedidosPorPlaca = async (req, res, next) => {
  try {
    const data = await service.getPedidosPorPlaca(req.query.placa || '');
    res.json(data);
  } catch (err) { next(err); }
};

const suggestPlacas = async (req, res, next) => {
  try {
    const data = await service.suggestPlacas(req.query.q || '');
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { summary, pedidosPorMes, pedidosPorVeiculo, pedidosPorUsuario, gastosPorFornecedor, pedidosPorStatus, gastosPorPeriodo, topUsuarios, kpi, kpis, gastosMensais, desempenhoSetores, recentes, rankingSolicitantes, tempoMedioOrcamento, pedidosRejeitados, pedidosAceitos, pedidosPorPlaca, suggestPlacas };
