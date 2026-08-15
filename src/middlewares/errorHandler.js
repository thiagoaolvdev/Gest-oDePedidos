const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack, url: req.originalUrl, method: req.method });
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Erro interno do servidor';
  const payload = {
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  if (err.fields) payload.fields = err.fields;
  if (err.campos_pendentes) payload.fields = err.campos_pendentes;
  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
