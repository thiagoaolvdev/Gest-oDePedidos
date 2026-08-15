const mysql = require('mysql2/promise');

const getDbPassword = () => {
  const value = process.env.DB_PASSWORD;
  if (value && String(value).trim()) {
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Variável obrigatória ausente em produção: DB_PASSWORD');
  }
  return '';
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: getDbPassword(),
  database: process.env.DB_NAME || 'chemarauto',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

module.exports = pool;
