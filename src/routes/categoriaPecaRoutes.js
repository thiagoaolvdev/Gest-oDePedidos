const express = require('express');
const router = express.Router();
const CategoriaPecaController = require('../controllers/CategoriaPecaController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', CategoriaPecaController.index);
router.get('/:id', CategoriaPecaController.show);
router.post('/', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), CategoriaPecaController.store);
router.put('/:id', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), CategoriaPecaController.update);
router.delete('/:id', authorize('administrativo', 'diretor'), CategoriaPecaController.destroy);

module.exports = router;
