const crypto = require('crypto');

const resolveSecret = (name) => {
  const value = process.env[name];
  if (value && String(value).trim()) {
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Variável obrigatória ausente em produção: ${name}`);
  }
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  jwtSecret: resolveSecret('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  jwtRefreshSecret: resolveSecret('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: 10,
  directorApprovalLimit: Number(process.env.APROVACAO_DIRETOR_LIMITE) || 599
};
