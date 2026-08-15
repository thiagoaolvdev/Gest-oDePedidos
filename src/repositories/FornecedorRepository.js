const BaseRepository = require('./BaseRepository');
const db = require('../config/database');

class FornecedorRepository extends BaseRepository {
  constructor() {
    super('fornecedores');
  }

  async findAllWithPagination(page, limit, search = '') {
    const offset = (page - 1) * limit;
    let where = 'WHERE ativo = 1';
    let params = [];
    if (search) {
      where = 'WHERE (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?)';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    const [rows] = await db.query(`SELECT * FROM fornecedores ${where} ORDER BY razao_social LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const [count] = await db.query(`SELECT COUNT(*) as total FROM fornecedores ${where}`, params);
    return { data: rows, total: count[0].total, page, limit };
  }
}

module.exports = FornecedorRepository;
