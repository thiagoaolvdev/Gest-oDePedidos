const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

const authenticate = async (req, res, next) => {
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
    if (decoded.sid) {
      const db = require('../config/database');
      const [rows] = await db.execute(
        'SELECT ultima_atividade FROM refresh_tokens WHERE id = ?',
        [decoded.sid]
      );
      if (!rows[0]) {
        return res.status(401).json({ error: 'Sessão encerrada', code: 'SESSION_ENDED' });
      }
      const minutosInativo =
        (Date.now() - new Date(rows[0].ultima_atividade).getTime()) / 60000;
      if (minutosInativo > require('../config/auth').sessionInactivityMinutes) {
        await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [decoded.sid]);
        return res.status(401).json({ error: 'Sessão expirada por inatividade', code: 'SESSION_INACTIVE' });
      }
      db.execute('UPDATE refresh_tokens SET ultima_atividade = NOW() WHERE id = ?', [decoded.sid]).catch(() => {});
    }
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
