const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserRepository = require('../repositories/UserRepository');
const { registerAudit } = require('../utils/audit');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');
const { sanitizePayload } = require('../utils/sanitize');
const db = require('../config/database');

class UserService {
  constructor() {
    this.repo = new UserRepository();
  }

  async findAll(page, limit) {
    return this.repo.findAllWithPagination(page, limit);
  }

  async findById(id) {
    const user = await this.repo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };
    delete user.senha;
    return user;
  }

  async create(data, userId, ip) {
    const safeData = sanitizePayload(data, ['nome', 'setor', 'nick', 'perfil']);
    let nick = safeData.nick;
    if (!nick) {
      const base = String(safeData.nome || 'usuario').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'usuario';
      let candidate = base;
      let i = 1;
      while (await this.repo.findByNick(candidate)) {
        candidate = `${base}${i}`;
        i++;
      }
      nick = candidate;
    }
    safeData.nick = String(nick).trim().toLowerCase();
    const existing = await this.repo.findByNick(safeData.nick);
    if (existing) throw { statusCode: 409, message: 'Nick já cadastrado' };
    const senhaEmClaro = safeData.senha || crypto.randomBytes(10).toString('hex');
    const [cols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'deve_trocar_senha'`);
    const novoUsuario = {
      ...safeData,
      senha: await bcrypt.hash(senhaEmClaro, authConfig.bcryptSaltRounds)
    };
    if (cols.length > 0) {
      novoUsuario.deve_trocar_senha = safeData.senha ? 0 : 1;
    }
    const result = await this.repo.create(novoUsuario);
    await registerAudit({ userId, action: 'create', entity: 'usuarios', entityId: result.id, newValues: { ...novoUsuario, senha: '[oculta]' }, ip });
    logger.info(`Usuário criado: ${result.id}`);
    return this.findById(result.id);
  }

  async update(id, data, userId, ip) {
    const user = await this.repo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };
    const safeData = sanitizePayload(data, ['nome', 'setor', 'nick', 'perfil']);
    if (safeData.nick) {
      safeData.nick = String(safeData.nick).trim().toLowerCase();
      if (safeData.nick !== user.nick) {
        const existing = await this.repo.findByNick(safeData.nick);
        if (existing) throw { statusCode: 409, message: 'Nick já cadastrado' };
      }
    }
    if (safeData.senha) {
      safeData.senha = await bcrypt.hash(safeData.senha, authConfig.bcryptSaltRounds);
      const [cols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'deve_trocar_senha'`);
      if (cols.length > 0) {
        safeData.deve_trocar_senha = 0;
      }
    } else {
      delete safeData.senha;
    }
    const oldValues = { nome: user.nome, setor: user.setor, nick: user.nick, perfil: user.perfil, ativo: user.ativo };
    await this.repo.update(id, safeData);
    await registerAudit({ userId, action: 'update', entity: 'usuarios', entityId: id, oldValues, newValues: { ...safeData, senha: safeData.senha ? '[oculta]' : undefined }, ip });
    logger.info(`Usuário atualizado: ${id}`);
    return this.findById(id);
  }

  async delete(id, userId, ip) {
    const user = await this.repo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };
    await this.repo.update(id, { ativo: 0 });
    await registerAudit({ userId, action: 'delete', entity: 'usuarios', entityId: id, oldValues: user, newValues: { ativo: 0 }, ip });
    logger.info(`Usuário desativado: ${id}`);
    return true;
  }

  async findByPerfil(perfil) {
    return this.repo.findByPerfil(perfil);
  }

  async listDropdown() {
    return this.repo.listDropdown();
  }
}

module.exports = UserService;
