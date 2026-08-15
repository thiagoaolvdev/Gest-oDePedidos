require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const resolveDbHost = () => {
  const configuredHost = process.env.DB_HOST || '127.0.0.1';
  return configuredHost === 'localhost' ? '127.0.0.1' : configuredHost;
};

const run = async () => {
  const db = await mysql.createConnection({
    host: resolveDbHost(),
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chemarauto'
  });

  await db.execute(`
    ALTER TABLE pedidos
    ADD COLUMN status_entrega ENUM('pendente','em_transito','chegou') NOT NULL DEFAULT 'pendente'
    AFTER status
  `);
  console.log('Coluna status_entrega adicionada com sucesso.');
  await db.end();
};

run().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
