require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const resolveDbHost = () => {
  const configuredHost = process.env.DB_HOST || '127.0.0.1';
  return configuredHost === 'localhost' ? '127.0.0.1' : configuredHost;
};

(async () => {
  const db = await mysql.createConnection({
    host: resolveDbHost(),
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chemarauto'
  });
  console.log('Atualizando usuarios de administrativo para diretor...');
  const [result] = await db.execute("UPDATE usuarios SET perfil = 'diretor' WHERE perfil = 'administrativo'");
  console.log('Usuarios atualizados:', result.affectedRows);
  console.log('Atualizando ENUM da tabela usuarios...');
  await db.execute("ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','garantia','diretor','mecanico') NOT NULL DEFAULT 'oficina'");
  console.log('ENUM atualizado com sucesso.');
  await db.end();
})().catch(err => { console.error('Erro:', err.message); process.exit(1); });
