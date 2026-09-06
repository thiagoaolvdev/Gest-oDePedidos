const db = require('../../src/config/database');

async function up() {
  console.log('Migração 025: atividade do refresh token (sessão)');

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'refresh_tokens'
      AND COLUMN_NAME = 'ultima_atividade'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE refresh_tokens
      ADD COLUMN ultima_atividade DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER token
    `);
    console.log('Coluna refresh_tokens.ultima_atividade criada.');
  } else {
    console.log('Coluna refresh_tokens.ultima_atividade já existe.');
  }

  console.log('Migração 025 concluída.');
}

async function down() {
  console.log('Migração 025 (rollback): removendo refresh_tokens.ultima_atividade');
  await db.execute('ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS ultima_atividade');
  console.log('Rollback da migração 025 concluído.');
}

module.exports = { up, down };
