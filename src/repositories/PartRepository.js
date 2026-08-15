const db = require('../config/database');

class PartRepository {
  async findByCodigoInterno(codigo) {
    const [rows] = await db.query('SELECT * FROM pecas WHERE codigo_interno = ?', [codigo]);
    return rows[0] || null;
  }

  async findById(id) {
    const [rows] = await db.query('SELECT p.*, c.nome as categoria_nome FROM pecas p LEFT JOIN categorias_pecas c ON c.id = p.categoria_id WHERE p.id = ?', [id]);
    return rows[0] || null;
  }

  async search(term) {
    const like = `%${term}%`;
    const [rows] = await db.query(
      'SELECT p.*, c.nome as categoria_nome FROM pecas p LEFT JOIN categorias_pecas c ON c.id = p.categoria_id WHERE (p.nome LIKE ? OR p.codigo_interno LIKE ?) AND p.ativo = 1 LIMIT 20',
      [like, like]
    );
    return rows;
  }

  async findAllWithPagination(page, limit, search = '') {
    const offset = (page - 1) * limit;
    let where = 'WHERE p.ativo = 1';
    let params = [];
    if (search) {
      where = 'WHERE (p.nome LIKE ? OR p.codigo_interno LIKE ?) AND p.ativo = 1';
      params = [`%${search}%`, `%${search}%`];
    }
    const [rows] = await db.query(
      `SELECT p.*, c.nome as categoria_nome FROM pecas p LEFT JOIN categorias_pecas c ON c.id = p.categoria_id ${where} ORDER BY p.nome ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [count] = await db.query(`SELECT COUNT(*) as total FROM pecas p ${where}`, params);
    return { data: rows, total: count[0].total, page, limit };
  }

  async create(data) {
    const [result] = await db.query(
      'INSERT INTO pecas (categoria_id, nome, codigo_interno, codigo_fabricante, unidade, estoque, valor_medio, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [data.categoria_id || null, data.nome, data.codigo_interno, data.codigo_fabricante || null, data.unidade || 'un', data.estoque || 0, data.valor_medio || 0]
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const fields = [];
    const params = [];
    for (const key of ['categoria_id', 'nome', 'codigo_interno', 'codigo_fabricante', 'unidade', 'estoque', 'valor_medio', 'ativo']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    await db.query(`UPDATE pecas SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async incrementStock(id, amount) {
    if (!id || !amount) return null;
    await db.query('UPDATE pecas SET estoque = COALESCE(estoque, 0) + ? WHERE id = ?', [amount, id]);
    return this.findById(id);
  }

  async delete(id) {
    await db.query('UPDATE pecas SET ativo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = PartRepository;
