const DashboardService = require('../services/DashboardService');

const service = new DashboardService();

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

module.exports = { pedidosPorPlaca, suggestPlacas };