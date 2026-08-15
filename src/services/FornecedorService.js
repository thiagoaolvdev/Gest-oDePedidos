const FornecedorRepository = require('../repositories/FornecedorRepository');

class FornecedorService {
  constructor() { this.repo = new FornecedorRepository(); }

  async findAll(page, limit, search) { return this.repo.findAllWithPagination(page, limit, search); }

  async findById(id) {
    const item = await this.repo.findById(id);
    if (!item) throw { statusCode: 404, message: 'Fornecedor não encontrado' };
    return item;
  }

  async create(data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    data.ativo = 1;
    const result = await this.repo.create(data);
    await registerAudit({ userId, action: 'create', entity: 'fornecedores', entityId: result.id, newValues: data, ip });
    return result;
  }

  async update(id, data, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    await this.findById(id);
    const old = await this.repo.findById(id);
    await this.repo.update(id, data);
    await registerAudit({ userId, action: 'update', entity: 'fornecedores', entityId: id, oldValues: old, newValues: data, ip });
    return this.repo.findById(id);
  }

  async delete(id, userId, ip) {
    const { registerAudit } = require('../utils/audit');
    await this.findById(id);
    await this.repo.update(id, { ativo: 0 });
    await registerAudit({ userId, action: 'delete', entity: 'fornecedores', entityId: id, ip });
    return true;
  }
}

module.exports = FornecedorService;
