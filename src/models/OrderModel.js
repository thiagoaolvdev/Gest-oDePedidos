class OrderModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.numero = data.numero || '';
    this.veiculo_id = data.veiculo_id || null;
    this.usuario_id = data.usuario_id || null;
    this.data_pedido = data.data_pedido || null;
    this.status = data.status || 'pendente';
    this.valor_total = data.valor_total || 0;
    this.observacoes = data.observacoes || null;
    this.aprovado_por = data.aprovado_por || null;
    this.data_aprovacao = data.data_aprovacao || null;
    this.motivo_rejeicao = data.motivo_rejeicao || null;
    this.ultima_atualizacao = data.ultima_atualizacao || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.itens = data.itens || [];
    this.veiculo = data.veiculo || null;
    this.usuario = data.usuario || null;
    this.aprovador = data.aprovador || null;
  }
}

module.exports = OrderModel;
