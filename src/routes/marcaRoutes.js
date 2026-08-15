const express = require('express');
const router = express.Router();
const MarcaController = require('../controllers/MarcaController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', MarcaController.index);
router.post('/', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), MarcaController.store);
router.put('/:id', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), MarcaController.update);
router.delete('/:id', authorize('administrativo', 'diretor'), MarcaController.destroy);

module.exports = router;
