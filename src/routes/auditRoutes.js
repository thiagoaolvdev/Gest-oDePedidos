const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/AuditController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', authorize('administrativo', 'diretor'), AuditController.index);

module.exports = router;
