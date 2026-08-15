class VehicleModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.modelo_id = data.modelo_id || null;
    this.placa = data.placa || '';
    this.ano = data.ano || null;
    this.motor = data.motor || null;
    this.cor = data.cor || null;
    this.chassi = data.chassi || null;
    this.quilometragem = data.quilometragem || 0;
    this.observacoes = data.observacoes || null;
    this.ativo = data.ativo !== undefined ? data.ativo : 1;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.modelo_nome = data.modelo_nome || null;
    this.marca_nome = data.marca_nome || null;
  }
}
module.exports = VehicleModel;
