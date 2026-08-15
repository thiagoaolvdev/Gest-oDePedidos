const db = require('../config/database');

class VehicleRepository {
  async findByPlaca(placa) {
    const [rows] = await db.query('SELECT v.*, mo.nome as modelo_nome, mo.marca_id, ma.nome as marca_nome FROM veiculos v LEFT JOIN modelos mo ON mo.id = v.modelo_id LEFT JOIN marcas ma ON ma.id = mo.marca_id WHERE v.placa = ?', [placa]);
    return rows[0] || null;
  }

  async findById(id) {
    const [rows] = await db.query('SELECT v.*, mo.nome as modelo_nome, mo.marca_id, ma.nome as marca_nome FROM veiculos v LEFT JOIN modelos mo ON mo.id = v.modelo_id LEFT JOIN marcas ma ON ma.id = mo.marca_id WHERE v.id = ?', [id]);
    return rows[0] || null;
  }

  async search(term) {
    const like = `%${term}%`;
    const [rows] = await db.query(
      'SELECT v.*, mo.nome as modelo_nome, mo.marca_id, ma.nome as marca_nome FROM veiculos v LEFT JOIN modelos mo ON mo.id = v.modelo_id LEFT JOIN marcas ma ON ma.id = mo.marca_id WHERE (v.placa LIKE ? OR mo.nome LIKE ? OR ma.nome LIKE ?) AND v.ativo = 1 LIMIT 20',
      [like, like, like]
    );
    return rows;
  }

  async findAllWithPagination(page, limit, search = '') {
    const offset = (page - 1) * limit;
    let where = 'WHERE v.ativo = 1';
    let params = [];
    if (search) {
      where = 'WHERE (v.placa LIKE ? OR mo.nome LIKE ? OR ma.nome LIKE ?) AND v.ativo = 1';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    const [rows] = await db.query(
      `SELECT v.*, mo.nome as modelo_nome, mo.marca_id, ma.nome as marca_nome FROM veiculos v LEFT JOIN modelos mo ON mo.id = v.modelo_id LEFT JOIN marcas ma ON ma.id = mo.marca_id ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [count] = await db.query(`SELECT COUNT(*) as total FROM veiculos v LEFT JOIN modelos mo ON mo.id = v.modelo_id LEFT JOIN marcas ma ON ma.id = mo.marca_id ${where}`, params);
    return { data: rows, total: count[0].total, page, limit };
  }

  async create(data) {
    const [result] = await db.query(
      'INSERT INTO veiculos (modelo_id, placa, ano, motor, cor, chassi, quilometragem, observacoes, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [data.modelo_id, data.placa, data.ano, data.motor || null, data.cor || null, data.chassi || null, data.quilometragem || 0, data.observacoes || null]
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const fields = [];
    const params = [];
    for (const key of ['modelo_id', 'placa', 'ano', 'motor', 'cor', 'chassi', 'quilometragem', 'observacoes', 'ativo']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    await db.query(`UPDATE veiculos SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    await db.query('UPDATE veiculos SET ativo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = VehicleRepository;
