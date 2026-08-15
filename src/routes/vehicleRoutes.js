const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/VehicleController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { createVehicleSchema } = require('../validators/vehicleValidator');

router.use(authenticate);

router.get('/', VehicleController.index);
router.get('/search', VehicleController.search);
router.get('/:id', VehicleController.show);
router.post('/', authorize('oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'), validate(createVehicleSchema), VehicleController.store);
router.put('/:id', authorize('oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'), VehicleController.update);
router.delete('/:id', authorize('oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'), VehicleController.destroy);

module.exports = router;
