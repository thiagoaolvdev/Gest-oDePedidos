const db = require('../config/database');

class NotificationRepository {
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM notificacoes WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findByUser(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query('SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
    const [count] = await db.query('SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ?', [userId]);
    const [unread] = await db.query('SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ? AND lida = 0', [userId]);
    return { data: rows, total: count[0].total, unread: unread[0].total, page, limit };
  }

  async create(data) {
    const [result] = await db.query(
      'INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, pedido_id) VALUES (?, ?, ?, ?, ?)',
      [data.usuario_id, data.titulo, data.mensagem, data.tipo || 'info', data.pedido_id || null]
    );
    return { id: result.insertId, ...data };
  }

  async markAsRead(id) {
    await db.query('UPDATE notificacoes SET lida = 1 WHERE id = ?', [id]);
  }

  async markAllAsRead(userId) {
    await db.query('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?', [userId]);
  }
}

module.exports = NotificationRepository;
