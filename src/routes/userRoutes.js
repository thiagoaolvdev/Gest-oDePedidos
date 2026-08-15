const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { createUserSchema, updateUserSchema } = require('../validators/userValidator');

router.use(authenticate);

router.get('/list-dropdown', UserController.listDropdown);
router.get('/perfil/:perfil', authorize('garantia', 'funilaria', 'administrativo', 'diretor', 'logistica', 'oficina'), UserController.listByPerfil);
router.get('/', authorize('administrativo'), UserController.index);
router.get('/:id', authorize('administrativo'), UserController.show);
router.post('/', authorize('administrativo'), validate(createUserSchema), UserController.store);
router.put('/:id', authorize('administrativo'), validate(updateUserSchema), UserController.update);
router.delete('/:id', authorize('administrativo'), UserController.destroy);

module.exports = router;
