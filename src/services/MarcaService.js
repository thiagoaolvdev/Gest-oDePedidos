const MarcaRepository = require('../repositories/MarcaRepository');

class MarcaService {
  constructor() { this.repo = new MarcaRepository(); }

  async findAll() { return this.repo.findAll(); }

  async findById(id) {
    const item = await this.repo.findById(id);
    if (!item) throw { statusCode: 404, message: 'Marca não encontrada' };
    return item;
  }

  async create(data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    const result = await this.repo.create(data);
    await registerAudit({ userId, action: 'create', entity: 'marcas', entityId: result.id, newValues: data, ip });
    return result;
  }

  async update(id, data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    await this.findById(id);
    const old = await this.repo.findById(id);
    await this.repo.update(id, data);
    await registerAudit({ userId, action: 'update', entity: 'marcas', entityId: id, oldValues: old, newValues: data, ip });
    return this.repo.findById(id);
  }

  async delete(id, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    const old = await this.findById(id);
    await this.repo.delete(id);
    await registerAudit({ userId, action: 'delete', entity: 'marcas', entityId: id, oldValues: old, ip });
    return true;
  }
}

module.exports = MarcaService;
