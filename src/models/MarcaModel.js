class MarcaModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nome = data.nome || '';
  }
}
module.exports = MarcaModel;
