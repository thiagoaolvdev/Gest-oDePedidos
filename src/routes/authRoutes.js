const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const nick = String(req.body?.nick || '').trim().toLowerCase();
    return `${req.ip}:${nick || 'anonymous'}`;
  },
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

module.exports = router;
