const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { createUserSchema, updateUserSchema } = require('../validators/userValidator');

router.use(authenticate);

router.get('/list-dropdown', UserController.listDropdown);
router.get('/perfil/:perfil', authorize('garantia', 'funilaria', 'administrativo', 'diretor', 'logistica', 'oficina'), UserController.listByPerfil);
router.get('/', authorize('administrativo', 'diretor'), UserController.index);
router.get('/:id', authorize('administrativo', 'diretor'), UserController.show);
router.post('/', authorize('administrativo', 'diretor'), validate(createUserSchema), UserController.store);
router.put('/:id', authorize('administrativo', 'diretor'), validate(updateUserSchema), UserController.update);
router.delete('/:id', authorize('administrativo', 'diretor'), UserController.destroy);

module.exports = router;
