const db = require('../../src/config/database');

async function up() {
  console.log('Migração 021: triagem do pedido (urgente / carro vendido / carro estoque)...');

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'triagem'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE pedidos
      ADD COLUMN triagem ENUM('urgente','carro_vendido','carro_estoque') NULL DEFAULT NULL AFTER duplicidade_ignorada
    `);
    console.log('Coluna pedidos.triagem criada.');
  } else {
    console.log('Coluna pedidos.triagem já existe.');
  }

  console.log('Migração 021 concluída.');
}

async function down() {
  console.log('Migração 021 (rollback): removendo triagem...');
  await db.execute('ALTER TABLE pedidos DROP COLUMN IF EXISTS triagem');
  console.log('Rollback da migração 021 concluído.');
}

module.exports = { up, down };
