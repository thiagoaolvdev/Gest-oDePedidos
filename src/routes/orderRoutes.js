const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { createOrderSchema, statusSchema } = require('../validators/orderValidator');
const upload = require('../config/multer');

router.use(authenticate);

router.get('/', OrderController.index);
router.get('/:id', OrderController.show);
router.post('/', validate(createOrderSchema), OrderController.store);
router.put('/:id', OrderController.update);
router.patch('/:id/status', authorize('logistica'), OrderController.updateStatus);
router.patch('/:id/entrega', authorize('logistica'), OrderController.updateEntrega);
router.post('/:id/approve', OrderController.approve);
router.post('/:id/reject', OrderController.reject);
router.post('/:id/request-new-quote', OrderController.requestNewQuote);
router.delete('/:id', OrderController.destroy);
router.post('/:id/upload', authorize('oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'), (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
      if (err.message) return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: 'Erro no upload do arquivo' });
    }
    next();
  });
}, OrderController.upload);

module.exports = router;
