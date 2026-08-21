const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

const authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.id;
    req.userPerfil = decoded.perfil;
    req.userNome = decoded.nome;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const authorize = (...perfis) => {
  return (req, res, next) => {
    if (!req.userPerfil) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!perfis.includes(req.userPerfil)) {
      return res.status(403).json({ error: 'Acesso não autorizado para este perfil' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
