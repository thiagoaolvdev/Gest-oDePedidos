const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const ReportController = require('../controllers/ReportController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/pedidos-por-placa', DashboardController.pedidosPorPlaca);
router.get('/suggest-placas', DashboardController.suggestPlacas);
router.get('/relatorio-frota/export', ReportController.exportRelatorioFrota);
router.get('/relatorio-veiculo/:placa/export', ReportController.exportRelatorioVeiculo);

module.exports = router;