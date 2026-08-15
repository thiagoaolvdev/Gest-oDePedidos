const express = require('express');
const router = express.Router();
const FornecedorController = require('../controllers/FornecedorController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', FornecedorController.index);
router.get('/:id', FornecedorController.show);
router.post('/', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), FornecedorController.store);
router.put('/:id', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), FornecedorController.update);
router.delete('/:id', authorize('administrativo', 'diretor'), FornecedorController.destroy);

module.exports = router;
