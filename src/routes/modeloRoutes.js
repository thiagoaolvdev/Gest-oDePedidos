const express = require('express');
const router = express.Router();
const ModeloController = require('../controllers/ModeloController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', ModeloController.index);
router.get('/por-marca/:marcaId', ModeloController.findByMarca);
router.get('/:id', ModeloController.show);
router.post('/', authorize('oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'), ModeloController.store);
router.put('/:id', authorize('oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'), ModeloController.update);
router.delete('/:id', authorize('administrativo', 'diretor'), ModeloController.destroy);

module.exports = router;
