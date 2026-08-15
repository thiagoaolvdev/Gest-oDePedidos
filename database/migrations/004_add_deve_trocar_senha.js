const db = require('../../src/config/database');

async function up() {
  const [cols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'deve_trocar_senha'`);
  if (cols.length === 0) {
    await db.query(`ALTER TABLE usuarios ADD COLUMN deve_trocar_senha TINYINT(1) NOT NULL DEFAULT 0 AFTER ativo`);
    console.log('Coluna deve_trocar_senha adicionada');
  }
}

async function down() {
  await db.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS deve_trocar_senha`);
  console.log('Coluna deve_trocar_senha removida');
}

module.exports = { up, down };
