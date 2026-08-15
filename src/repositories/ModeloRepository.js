const BaseRepository = require('./BaseRepository');
const db = require('../config/database');

class ModeloRepository extends BaseRepository {
  constructor() {
    super('modelos');
  }

  async findByMarca(marcaId) {
    const [rows] = await db.query(
      'SELECT m.*, mr.nome as marca_nome FROM modelos m LEFT JOIN marcas mr ON mr.id = m.marca_id WHERE m.marca_id = ? ORDER BY m.nome',
      [marcaId]
    );
    return rows;
  }

  async findAllWithJoin() {
    const [rows] = await db.query(
      'SELECT m.*, mr.nome as marca_nome FROM modelos m LEFT JOIN marcas mr ON mr.id = m.marca_id ORDER BY mr.nome, m.nome'
    );
    return rows;
  }
}

module.exports = ModeloRepository;
