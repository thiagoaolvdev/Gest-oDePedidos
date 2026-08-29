const db = require('../../src/config/database');

async function up() {
  console.log('Migração 019: data de entrega real do pedido (lead time por fornecedor)...');

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'data_entrega_real'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE pedidos
      ADD COLUMN data_entrega_real DATETIME NULL AFTER previsao_entrega
    `);
    console.log('Coluna pedidos.data_entrega_real criada.');
  } else {
    console.log('Coluna pedidos.data_entrega_real já existe.');
  }

  console.log('Migração 019 concluída.');
}

async function down() {
  console.log('Migração 019 (rollback): removendo data_entrega_real...');
  await db.execute('ALTER TABLE pedidos DROP COLUMN IF EXISTS data_entrega_real');
  console.log('Rollback da migração 019 concluído.');
}

module.exports = { up, down };
