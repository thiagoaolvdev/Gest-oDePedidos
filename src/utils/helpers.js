const crypto = require('crypto');
const xss = require('xss');

const generateOrderNumber = () => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = crypto.randomInt(1000, 9999);
  return `PED${y}${m}${d}${rand}`;
};

const sanitizeString = (str) => {
  if (!str) return '';
  return xss(String(str), {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  }).trim();
};

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
};

const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { offset: (p - 1) * l, limit: l, page: p };
};

module.exports = {
  generateOrderNumber,
  sanitizeString,
  parseDate,
  formatCurrency,
  formatDate,
  paginate
};
