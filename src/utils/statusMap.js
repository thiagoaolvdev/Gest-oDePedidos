const STATUS_MAP = {
  pendente: 'Pendente',
  em_compra: 'Em Compra',
  aguardando_aprovacao: 'Aguarda Aprovação',
  novo_orcamento: 'Novo Orçamento',
  aprovado: 'Aprovado',
  rejeitado: 'Cancelado',
  comprado: 'Comprado',
  concluido: 'Concluído'
};

const statusLabel = (s) => STATUS_MAP[s] || s || '-';

const statusColor = (s) => {
  if (s === 'aprovado' || s === 'comprado' || s === 'concluido') return '#16a34a';
  if (s === 'pendente' || s === 'aguardando_aprovacao' || s === 'em_compra' || s === 'novo_orcamento') return '#d97706';
  if (s === 'rejeitado') return '#dc2626';
  return '#6b7280';
};

module.exports = { STATUS_MAP, statusLabel, statusColor };
