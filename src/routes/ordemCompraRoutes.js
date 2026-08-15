const express = require('express');
const router = express.Router();
const OrdemCompraController = require('../controllers/OrdemCompraController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/pedidos/:id/ordem-compra', authorize('logistica', 'administrativo', 'diretor'), OrdemCompraController.store);
router.get('/pedidos/:id/ordem-compra/pdf', authorize('logistica', 'administrativo', 'diretor'), OrdemCompraController.pdf);

module.exports = router;
