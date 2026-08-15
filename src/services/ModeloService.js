const ModeloRepository = require('../repositories/ModeloRepository');

class ModeloService {
  constructor() { this.repo = new ModeloRepository(); }

  async findByMarca(marcaId) { return this.repo.findByMarca(marcaId); }

  async findAll() { return this.repo.findAllWithJoin(); }

  async findById(id) {
    const item = await this.repo.findById(id);
    if (!item) throw { statusCode: 404, message: 'Modelo não encontrado' };
    return item;
  }

  async create(data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    const result = await this.repo.create(data);
    await registerAudit({ userId, action: 'create', entity: 'modelos', entityId: result.id, newValues: data, ip });
    return result;
  }

  async update(id, data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    await this.findById(id);
    await this.repo.update(id, data);
    await registerAudit({ userId, action: 'update', entity: 'modelos', entityId: id, newValues: data, ip });
    return this.repo.findById(id);
  }

  async delete(id, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    await this.findById(id);
    await this.repo.delete(id);
    await registerAudit({ userId, action: 'delete', entity: 'modelos', entityId: id, ip });
    return true;
  }
}

module.exports = ModeloService;
