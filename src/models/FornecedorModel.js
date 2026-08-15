class FornecedorModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.razao_social = data.razao_social || '';
    this.nome_fantasia = data.nome_fantasia || null;
    this.cnpj = data.cnpj || null;
    this.telefone = data.telefone || null;
    this.email = data.email || null;
    this.cidade = data.cidade || null;
    this.estado = data.estado || null;
    this.ativo = data.ativo !== undefined ? data.ativo : 1;
  }
}
module.exports = FornecedorModel;
