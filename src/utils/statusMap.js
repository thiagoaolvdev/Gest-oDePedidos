const STATUS_MAP = {
  pendente: 'Pendente',
  em_compra: 'Em Compra',
  aguardando_aprovacao: 'Aguarda Aprovação',
  aguardando_autorizacao: 'Aguarda Autorização Diretor',
  novo_orcamento: 'Novo Orçamento',
  aprovado: 'Aprovado',
  rejeitado: 'Cancelado',
  comprado: 'Comprado',
  concluido: 'Concluído'
};

const statusLabel = (s) => STATUS_MAP[s] || s || '-';

const statusColor = (s) => {
  const cores = {
    pendente: '#d4a017',
    em_compra: '#2563eb',
    aguardando_aprovacao: '#7c3aed',
    aguardando_autorizacao: '#9333ea',
    novo_orcamento: '#ea580c',
    aprovado: '#16a34a',
    rejeitado: '#dc2626',
    comprado: '#0d9488',
    concluido: '#4f46e5'
  };
  return cores[s] || '#6b7280';
};

module.exports = { STATUS_MAP, statusLabel, statusColor };
