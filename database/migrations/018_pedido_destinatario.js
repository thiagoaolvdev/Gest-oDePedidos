const db = require('../../src/config/database');

async function up() {
  console.log('Migração 018: destinatário do pedido (envio para confirmação de compra)...');

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'destinatario_id'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE pedidos
      ADD COLUMN destinatario_id INT NULL AFTER usuario_id
    `);
    console.log('Coluna pedidos.destinatario_id criada.');
  } else {
    console.log('Coluna pedidos.destinatario_id já existe.');
  }

  const [constraints] = await db.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND CONSTRAINT_NAME = 'fk_pedido_destinatario'
  `);

  if (!constraints.length) {
    await db.execute(`
      ALTER TABLE pedidos
      ADD CONSTRAINT fk_pedido_destinatario FOREIGN KEY (destinatario_id)
        REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    console.log('Constraint fk_pedido_destinatario criada.');
  }

  const [indexes] = await db.query(`
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND INDEX_NAME = 'idx_pedidos_destinatario'
  `);

  if (!indexes.length) {
    await db.execute(`
      ALTER TABLE pedidos
      ADD INDEX idx_pedidos_destinatario (destinatario_id)
    `);
    console.log('Índice idx_pedidos_destinatario criado.');
  }

  console.log('Migração 018 concluída.');
}

async function down() {
  console.log('Migração 018 (rollback): removendo destinatário do pedido...');

  await db.execute('ALTER TABLE pedidos DROP FOREIGN KEY fk_pedido_destinatario');
  await db.execute('ALTER TABLE pedidos DROP INDEX idx_pedidos_destinatario');
  await db.execute('ALTER TABLE pedidos DROP COLUMN destinatario_id');

  console.log('Rollback da migração 018 concluído.');
}

module.exports = { up, down };
