const BaseRepository = require('./BaseRepository');
const db = require('../config/database');

class UserRepository extends BaseRepository {
  constructor() {
    super('usuarios');
  }

  async findByNick(nick) {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE nick = ?', [nick]);
    return rows[0] || null;
  }

  async findByPerfil(perfil) {
    const [rows] = await db.execute('SELECT id, nome, nick, perfil FROM usuarios WHERE perfil = ? AND ativo = 1', [perfil]);
    return rows;
  }

  async findAllWithPagination(page, limit) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT id, nome, setor, nick, perfil, ativo, avatar, created_at, updated_at FROM usuarios ORDER BY nome LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)]
    );
    const [count] = await db.query('SELECT COUNT(*) as total FROM usuarios');
    return { data: rows, total: count[0].total, page, limit };
  }

  async listDropdown() {
    const [rows] = await db.query('SELECT id, nome FROM usuarios WHERE ativo = 1 ORDER BY nome');
    return rows;
  }
}

module.exports = UserRepository;
