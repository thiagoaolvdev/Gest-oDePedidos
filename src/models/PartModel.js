class PartModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.categoria_id = data.categoria_id || null;
    this.nome = data.nome || '';
    this.codigo_interno = data.codigo_interno || '';
    this.codigo_fabricante = data.codigo_fabricante || null;
    this.unidade = data.unidade || 'un';
    this.estoque = data.estoque || 0;
    this.valor_medio = data.valor_medio || 0;
    this.ativo = data.ativo !== undefined ? data.ativo : 1;
    this.categoria_nome = data.categoria_nome || null;
  }
}
module.exports = PartModel;
