const db = require('../../src/config/database');

async function up() {
  console.log('Migração 020: flag de duplicidade ignorada na criação do pedido...');

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'duplicidade_ignorada'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE pedidos
      ADD COLUMN duplicidade_ignorada BOOLEAN NOT NULL DEFAULT FALSE AFTER motivo_rejeicao
    `);
    console.log('Coluna pedidos.duplicidade_ignorada criada.');
  } else {
    console.log('Coluna pedidos.duplicidade_ignorada já existe.');
  }

  console.log('Migração 020 concluída.');
}

async function down() {
  console.log('Migração 020 (rollback): removendo duplicidade_ignorada...');
  await db.execute('ALTER TABLE pedidos DROP COLUMN IF EXISTS duplicidade_ignorada');
  console.log('Rollback da migração 020 concluído.');
}

module.exports = { up, down };
