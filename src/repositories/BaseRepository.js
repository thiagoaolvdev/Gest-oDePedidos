const db = require('../config/database');

class BaseRepository {
  constructor(table) {
    this.table = table;
  }

  async findAll({ where, order, limit, offset } = {}) {
    let query = `SELECT * FROM ${this.table}`;
    const params = [];
    if (where) {
      const clauses = [];
      for (const [key, value] of Object.entries(where)) {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
      if (clauses.length) query += ` WHERE ${clauses.join(' AND ')}`;
    }
    if (order) query += ` ORDER BY ${order}`;
    if (limit) query += ` LIMIT ${limit}`;
    if (offset) query += ` OFFSET ${offset}`;
    const [rows] = await db.execute(query, params);
    return rows;
  }

  async findById(id) {
    const [rows] = await db.execute(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const [result] = await db.execute(query, values);
    return { id: result.insertId, ...data };
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const query = `UPDATE ${this.table} SET ${set} WHERE id = ?`;
    await db.execute(query, [...values, id]);
    return this.findById(id);
  }

  async delete(id) {
    const query = `DELETE FROM ${this.table} WHERE id = ?`;
    await db.execute(query, [id]);
    return true;
  }

  async count(where = {}) {
    let query = `SELECT COUNT(*) as total FROM ${this.table}`;
    const params = [];
    if (Object.keys(where).length) {
      const clauses = Object.keys(where).map(k => {
        params.push(where[k]);
        return `${k} = ?`;
      });
      query += ` WHERE ${clauses.join(' AND ')}`;
    }
    const [rows] = await db.execute(query, params);
    return rows[0].total;
  }
}

module.exports = BaseRepository;
