const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/summary', DashboardController.summary);
router.get('/pedidos-por-mes', DashboardController.pedidosPorMes);
router.get('/pedidos-por-veiculo', DashboardController.pedidosPorVeiculo);
router.get('/pedidos-por-usuario', DashboardController.pedidosPorUsuario);
router.get('/gastos-por-fornecedor', DashboardController.gastosPorFornecedor);
router.get('/pedidos-por-status', DashboardController.pedidosPorStatus);
router.get('/gastos-por-periodo', DashboardController.gastosPorPeriodo);
router.get('/top-usuarios', DashboardController.topUsuarios);
router.get('/kpi', DashboardController.kpi);
router.get('/kpis', DashboardController.kpis);
router.get('/gastos-mensais', DashboardController.gastosMensais);
router.get('/desempenho-setores', DashboardController.desempenhoSetores);
router.get('/recentes', DashboardController.recentes);
router.get('/ranking-solicitantes', DashboardController.rankingSolicitantes);
router.get('/tempo-medio-orcamento', DashboardController.tempoMedioOrcamento);
router.get('/pedidos-rejeitados', DashboardController.pedidosRejeitados);
router.get('/pedidos-aceitos', DashboardController.pedidosAceitos);
router.get('/pedidos-por-placa', DashboardController.pedidosPorPlaca);
router.get('/suggest-placas', DashboardController.suggestPlacas);

module.exports = router;
