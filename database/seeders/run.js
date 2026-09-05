require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
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

  const seedersDir = __dirname;
  const files = fs.readdirSync(seedersDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedersDir, file), 'utf8');
    const semComentarios = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && !line.trim().startsWith('/*'))
      .join('\n');
    const statements = semComentarios
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await db.query(stmt);
    }
    console.log(`Seeder ${file} executado com sucesso.`);
  }

  await db.end();
  console.log('Seeders concluídos.');
};

run().catch((err) => {
  console.error('Erro nos seeders:', err.message);
  process.exit(1);
});