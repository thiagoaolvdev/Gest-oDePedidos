const express = require('express');
const router = express.Router();
const PartController = require('../controllers/PartController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', PartController.index);
router.get('/search', PartController.search);
router.get('/:id', PartController.show);
router.post('/', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), PartController.store);
router.put('/:id', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), PartController.update);
router.delete('/:id', authorize('garantia', 'funilaria', 'administrativo', 'diretor'), PartController.destroy);

module.exports = router;
