const db = require('../config/database');

class AuditService {
  async findAll(page = 1, limit = 50, filters = {}) {
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    let params = [];

    if (filters.acao) { where.push('a.acao = ?'); params.push(filters.acao); }
    if (filters.entidade) { where.push('a.entidade = ?'); params.push(filters.entidade); }
    if (filters.usuario_id) { where.push('a.usuario_id = ?'); params.push(filters.usuario_id); }
    if (filters.data_inicio) { where.push('a.data_criacao >= ?'); params.push(filters.data_inicio); }
    if (filters.data_fim) { where.push('a.data_criacao <= ?'); params.push(filters.data_fim); }

    const [rows] = await db.query(`
      SELECT a.*, u.nome as usuario_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${where.join(' AND ')}
      ORDER BY a.data_criacao DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);

    const [count] = await db.query(`
      SELECT COUNT(*) as total FROM auditoria a WHERE ${where.join(' AND ')}
    `, params);

    return { data: rows, total: count[0].total, page, limit };
  }
}

module.exports = AuditService;
