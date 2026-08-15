const xss = require('xss');

const sanitizeText = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;
  return xss(value, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  }).trim();
};

const sanitizePayload = (value, fields = []) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(item => sanitizePayload(item, fields));
  }
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === 'object') {
      output[key] = sanitizePayload(item, fields);
    } else {
      output[key] = typeof item === 'string' ? sanitizeText(item) : item;
    }
    if (fields.includes(key) && typeof output[key] === 'string') {
      output[key] = sanitizeText(output[key]);
    }
  }
  return output;
};

module.exports = { sanitizeText, sanitizePayload };
