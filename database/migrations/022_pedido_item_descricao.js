const db = require('../../src/config/database');

async function up() {
  console.log('Migração 022: descrição livre no item do pedido...');

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedido_itens'
      AND COLUMN_NAME = 'descricao'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE pedido_itens
      ADD COLUMN descricao VARCHAR(255) NULL AFTER peca_id
    `);
    console.log('Coluna pedido_itens.descricao criada.');
  } else {
    console.log('Coluna pedido_itens.descricao já existe.');
  }

  console.log('Migração 022 concluída.');
}

async function down() {
  console.log('Migração 022 (rollback): removendo descricao...');
  await db.execute('ALTER TABLE pedido_itens DROP COLUMN IF EXISTS descricao');
  console.log('Rollback da migração 022 concluído.');
}

module.exports = { up, down };