const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', NotificationController.index);
router.patch('/:id/read', NotificationController.markAsRead);
router.patch('/read-all', NotificationController.markAllAsRead);

module.exports = router;
