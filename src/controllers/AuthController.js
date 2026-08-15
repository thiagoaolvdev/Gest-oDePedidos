const AuthService = require('../services/AuthService');

const service = new AuthService();

const login = async (req, res, next) => {
  try {
    const { nick, password } = req.body;
    if (!nick || !password) {
      return res.status(400).json({ error: 'Nick e senha são obrigatórios' });
    }
    if (typeof nick === 'string' && typeof password === 'string') {
      req.body.nick = nick.trim().toLowerCase();
    }
    const ip = req.ip || req.connection.remoteAddress;
    const result = await service.login(nick, password, ip);
    res.json(result);
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório' });
    }
    const ip = req.ip || req.connection.remoteAddress;
    const result = await service.refresh(refreshToken, ip);
    res.json(result);
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    await service.logout(req.userId, refreshToken, ip);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const UserService = require('../services/UserService');
    const userService = new UserService();
    const user = await userService.findById(req.userId);
    res.json(user);
  } catch (err) { next(err); }
};

module.exports = { login, refresh, logout, me };
