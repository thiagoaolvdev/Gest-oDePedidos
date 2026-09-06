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
    const db = require('../config/database');
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

    await db.execute(
      'DELETE FROM refresh_tokens WHERE ultima_atividade <= DATE_SUB(NOW(), INTERVAL ? MINUTE) OR expires_at <= NOW()',
      [authConfig.sessionInactivityMinutes]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM refresh_tokens');
    if (total >= authConfig.maxSessoesSimultaneas) {
      throw { statusCode: 403, message: `Limite de ${authConfig.maxSessoesSimultaneas} acessos simultâneos atingido. Tente novamente em instantes.` };
    }

    const sessao = await this._saveRefreshToken(user.id);
    const payload = { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil, sid: sessao.id };
    const token = jwt.sign(payload, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn });
    await registerAudit({ userId: user.id, action: 'login', entity: 'usuarios', entityId: user.id, ip });
    logger.info(`Login: ${user.nick}`, { userId: user.id, perfil: user.perfil });
    return {
      token,
      refreshToken: sessao.token,
      user: {
        id: user.id,
        nome: user.nome,
        nick: user.nick,
        perfil: user.perfil,
        deveTrocarSenha: Boolean(user.deve_trocar_senha)
      }
    };
  }

  async changePassword(userId, currentPassword, newPassword, ip) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }
    if (!user.ativo) {
      throw { statusCode: 403, message: 'Usuário inativo' };
    }
    const valid = await bcrypt.compare(String(currentPassword), user.senha);
    if (!valid) {
      throw { statusCode: 401, message: 'Senha atual incorreta' };
    }
    const db = require('../config/database');
    await db.execute('UPDATE usuarios SET senha = ?, deve_trocar_senha = 0 WHERE id = ?', [
      await bcrypt.hash(String(newPassword), authConfig.bcryptSaltRounds),
      user.id
    ]);
    await registerAudit({ userId: user.id, action: 'change_password', entity: 'usuarios', entityId: user.id, ip });
    logger.info(`Senha alterada: ${user.nick}`, { userId: user.id });
    return true;
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
    const sessao = await this._saveRefreshToken(user.id);
    const payload = { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil, sid: sessao.id };
    const token = jwt.sign(payload, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn });
    await registerAudit({ userId: user.id, action: 'refresh_token', entity: 'usuarios', entityId: user.id, ip });
    return { token, refreshToken: sessao.token, user: { id: user.id, nome: user.nome, nick: user.nick, perfil: user.perfil } };
  }

  async logout(userId, refreshToken, ip) {
    const db = require('../config/database');
    if (refreshToken) {
      await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }
    await registerAudit({ userId, action: 'logout', entity: 'usuarios', entityId: userId, ip });
    logger.info(`Logout: ${userId}`);
  }

  async _saveRefreshToken(userId) {
    const db = require('../config/database');
    const token = crypto.randomBytes(40).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const [result] = await db.execute(
      'INSERT INTO refresh_tokens (usuario_id, token, expires_at, ultima_atividade) VALUES (?, ?, ?, NOW())',
      [userId, token, expires.toISOString().slice(0, 19).replace('T', ' ')]
    );
    return { id: result.insertId, token };
  }
}

module.exports = AuthService;
