const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    if (schema.body && req.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        for (const rule of rules) {
          const error = rule(value, field);
          if (error) { errors.push(error); break; }
        }
      }
    }
    if (schema.params && req.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params[field];
        for (const rule of rules) {
          const error = rule(value, field);
          if (error) { errors.push(error); break; }
        }
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Erro de validação', details: errors });
    }
    next();
  };
};

const required = (value, field) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `O campo ${field} é obrigatório`;
  }
  return null;
};

const isEmail = (value, field) => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `O campo ${field} deve ser um e-mail válido`;
  }
  return null;
};

const minLength = (min) => (value, field) => {
  if (value && String(value).length < min) {
    return `O campo ${field} deve ter no mínimo ${min} caracteres`;
  }
  return null;
};

const isNumber = (value, field) => {
  if (value !== undefined && value !== null && isNaN(Number(value))) {
    return `O campo ${field} deve ser numérico`;
  }
  return null;
};

const isIn = (options) => (value, field) => {
  if (value && !options.includes(value)) {
    return `O campo ${field} deve ser um dos valores: ${options.join(', ')}`;
  }
  return null;
};

module.exports = { validate, required, isEmail, minLength, isNumber, isIn };
