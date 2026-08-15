const db = require('../config/database');

class MarcaRepository {
  async findAll() {
    const [rows] = await db.query('SELECT * FROM marcas ORDER BY nome');
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM marcas WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async create(data) {
    const [result] = await db.query('INSERT INTO marcas (nome) VALUES (?)', [data.nome]);
    return { id: result.insertId, ...data };
  }

  async update(id, data) {
    await db.query('UPDATE marcas SET nome = ? WHERE id = ?', [data.nome, id]);
    return this.findById(id);
  }

  async delete(id) {
    await db.query('DELETE FROM marcas WHERE id = ?', [id]);
    return true;
  }
}

module.exports = MarcaRepository;
