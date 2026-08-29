const express = require('express');
const router = express.Router();
const KpiController = require('../controllers/KpiController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', KpiController.listar);
router.get('/:chave/detalhe', KpiController.detalhar);
router.get('/:chave/export', KpiController.exportar);

module.exports = router;
