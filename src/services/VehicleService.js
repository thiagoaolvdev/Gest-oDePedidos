const VehicleRepository = require('../repositories/VehicleRepository');
const { registerAudit } = require('../utils/audit');
const logger = require('../utils/logger');

class VehicleService {
  constructor() {
    this.repo = new VehicleRepository();
  }

  async findAll(page, limit, search) {
    return this.repo.findAllWithPagination(page, limit, search);
  }

  async findById(id) {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) throw { statusCode: 404, message: 'Veículo não encontrado' };
    return vehicle;
  }

  async create(data, userId, ip) {
    const existing = await this.repo.findByPlaca(data.placa);
    if (existing) throw { statusCode: 409, message: 'Placa já cadastrada' };
    data.ativo = 1;
    const result = await this.repo.create(data);
    await registerAudit({ userId, action: 'create', entity: 'veiculos', entityId: result.id, newValues: data, ip });
    logger.info(`Veículo criado: ${result.id} - ${data.placa}`);
    return this.repo.findById(result.id);
  }

  async update(id, data, userId, ip) {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) throw { statusCode: 404, message: 'Veículo não encontrado' };
    if (data.placa && data.placa !== vehicle.placa) {
      const existing = await this.repo.findByPlaca(data.placa);
      if (existing) throw { statusCode: 409, message: 'Placa já cadastrada' };
    }
    const oldValues = { placa: vehicle.placa, modelo_id: vehicle.modelo_id };
    await this.repo.update(id, data);
    await registerAudit({ userId, action: 'update', entity: 'veiculos', entityId: id, oldValues, newValues: data, ip });
    logger.info(`Veículo atualizado: ${id}`);
    return this.repo.findById(id);
  }

  async delete(id, userId, ip) {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) throw { statusCode: 404, message: 'Veículo não encontrado' };
    await this.repo.update(id, { ativo: 0 });
    await registerAudit({ userId, action: 'delete', entity: 'veiculos', entityId: id, oldValues: vehicle, ip });
    logger.info(`Veículo desativado: ${id}`);
    return true;
  }

  async search(term) {
    return this.repo.search(term);
  }
}

module.exports = VehicleService;
