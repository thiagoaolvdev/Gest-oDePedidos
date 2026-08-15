const CategoriaPecaRepository = require('../repositories/CategoriaPecaRepository');

class CategoriaPecaService {
  constructor() { this.repo = new CategoriaPecaRepository(); }

  async findAll() { return this.repo.findAll(); }

  async findById(id) { return this.repo.findById(id); }

  async create(data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    const result = await this.repo.create(data);
    await registerAudit({ userId, action: 'create', entity: 'categorias_pecas', entityId: result.id, newValues: data, ip });
    return result;
  }

  async update(id, data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    const oldData = await this.repo.findById(id);
    const result = await this.repo.update(id, data);
    await registerAudit({ userId, action: 'update', entity: 'categorias_pecas', entityId: id, oldValues: oldData, newValues: data, ip });
    return result;
  }

  async delete(id, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    await this.repo.delete(id);
    await registerAudit({ userId, action: 'delete', entity: 'categorias_pecas', entityId: id, ip });
    return true;
  }
}

module.exports = CategoriaPecaService;
