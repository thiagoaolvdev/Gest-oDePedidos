const PartRepository = require('../repositories/PartRepository');
const { registerAudit } = require('../utils/audit');
const logger = require('../utils/logger');

class PartService {
  constructor() {
    this.repo = new PartRepository();
  }

  async findAll(page, limit, search) {
    return this.repo.findAllWithPagination(page, limit, search);
  }

  async findById(id) {
    const part = await this.repo.findById(id);
    if (!part) throw { statusCode: 404, message: 'Peça não encontrada' };
    return part;
  }

  async create(data, userId, ip) {
    const existing = await this.repo.findByCodigoInterno(data.codigo_interno);
    if (existing) throw { statusCode: 409, message: 'Código interno já cadastrado' };
    data.ativo = 1;
    const result = await this.repo.create(data);
    await registerAudit({ userId, action: 'create', entity: 'pecas', entityId: result.id, newValues: data, ip });
    logger.info(`Peça criada: ${result.id} - ${data.nome}`);
    return this.repo.findById(result.id);
  }

  async update(id, data, userId, ip) {
    const part = await this.repo.findById(id);
    if (!part) throw { statusCode: 404, message: 'Peça não encontrada' };
    if (data.codigo_interno && data.codigo_interno !== part.codigo_interno) {
      const existing = await this.repo.findByCodigoInterno(data.codigo_interno);
      if (existing) throw { statusCode: 409, message: 'Código interno já cadastrado' };
    }
    const oldValues = { nome: part.nome, codigo_interno: part.codigo_interno };
    await this.repo.update(id, data);
    await registerAudit({ userId, action: 'update', entity: 'pecas', entityId: id, oldValues, newValues: data, ip });
    logger.info(`Peça atualizada: ${id}`);
    return this.repo.findById(id);
  }

  async delete(id, userId, ip) {
    const part = await this.repo.findById(id);
    if (!part) throw { statusCode: 404, message: 'Peça não encontrada' };
    await this.repo.update(id, { ativo: 0 });
    await registerAudit({ userId, action: 'delete', entity: 'pecas', entityId: id, oldValues: part, ip });
    logger.info(`Peça desativada: ${id}`);
    return true;
  }

  async search(term) {
    return this.repo.search(term);
  }
}

module.exports = PartService;
