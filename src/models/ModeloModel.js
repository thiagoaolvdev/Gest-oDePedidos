class ModeloModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.marca_id = data.marca_id || null;
    this.nome = data.nome || '';
    this.marca_nome = data.marca_nome || null;
  }
}
module.exports = ModeloModel;
