const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authConfig = require('../config/auth');
const UserRepository = require('../repositories/UserRepository');
const { registerAudit } = require('../utils/audit');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.userRepo = new UserRepository();
  }

  async login(nick, password, ip) {
    const user = await this.userRepo.findByNick(String(nick).trim().toLowerCase());
    if (!user) {
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    }
    if (!user.ativo) {
      throw { statusCode: 403, message: 'Usuário inativo' };
    }
    const valid = await bcrypt.compare(password, user.senha);
    if (!valid) {
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    }
    const payload = { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil };
    const token = jwt.sign(payload, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    await this._saveRefreshToken(user.id, refreshToken);
    await registerAudit({ userId: user.id, action: 'login', entity: 'usuarios', entityId: user.id, ip });
    logger.info(`Login: ${user.nick}`, { userId: user.id, perfil: user.perfil });
    return { token, refreshToken, user: { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil } };
  }

  async refresh(refreshToken, ip) {
    const db = require('../config/database');
    const [rows] = await db.execute('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()', [refreshToken]);
    if (!rows[0]) {
      throw { statusCode: 401, message: 'Refresh token inválido ou expirado' };
    }
    const user = await this.userRepo.findById(rows[0].usuario_id);
    if (!user || !user.ativo) {
      throw { statusCode: 403, message: 'Usuário não encontrado ou inativo' };
    }
    await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    const payload = { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil };
    const token = jwt.sign(payload, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn });
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    await this._saveRefreshToken(user.id, newRefreshToken);
    await registerAudit({ userId: user.id, action: 'refresh_token', entity: 'usuarios', entityId: user.id, ip });
    return { token, refreshToken: newRefreshToken, user: { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil } };
  }

  async logout(userId, refreshToken, ip) {
    const db = require('../config/database');
    if (refreshToken) {
      await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }
    await registerAudit({ userId, action: 'logout', entity: 'usuarios', entityId: userId, ip });
    logger.info(`Logout: ${userId}`);
  }

  async _saveRefreshToken(userId, token) {
    const db = require('../config/database');
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    await db.execute(
      'INSERT INTO refresh_tokens (usuario_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expires.toISOString().slice(0, 19).replace('T', ' ')]
    );
  }
}

module.exports = AuthService;
