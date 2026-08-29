const db = require('../../src/config/database');

async function up() {
  console.log('Migração 017: uma ordem de compra por item do pedido...');

  // Verificar se o UNIQUE em pedido_id ainda existe antes de tentar remover
  const [indexes] = await db.query(`
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ordens_compra'
      AND NON_UNIQUE = 0
      AND INDEX_NAME != 'PRIMARY'
      AND COLUMN_NAME = 'pedido_id'
  `);

  if (indexes.length) {
    await db.execute(`ALTER TABLE ordens_compra DROP INDEX \`${indexes[0].INDEX_NAME}\``);
    console.log('UNIQUE em pedido_id removido.');
  }

  const [columns] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ordens_compra'
      AND COLUMN_NAME = 'pedido_item_id'
  `);

  if (!columns.length) {
    await db.execute(`
      ALTER TABLE ordens_compra
      ADD COLUMN pedido_item_id INT NOT NULL AFTER pedido_id
    `);
    console.log('Coluna ordens_compra.pedido_item_id criada.');
  } else {
    console.log('Coluna ordens_compra.pedido_item_id já existe.');
  }

  // Popular pedido_item_id a partir do vínculo existente em pedido_itens.ordem_compra_id
  await db.execute(`
    UPDATE ordens_compra oc
    SET pedido_item_id = (
      SELECT pi.id FROM pedido_itens pi
      WHERE pi.ordem_compra_id = oc.id
      ORDER BY pi.id ASC LIMIT 1
    )
    WHERE oc.pedido_item_id = 0 OR oc.pedido_item_id IS NULL
  `);

  const [fks] = await db.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ordens_compra'
      AND CONSTRAINT_NAME = 'fk_oc_pedido_item'
  `);

  if (!fks.length) {
    await db.execute(`
      ALTER TABLE ordens_compra
      ADD CONSTRAINT fk_oc_pedido_item FOREIGN KEY (pedido_item_id) REFERENCES pedido_itens(id)
    `);
    console.log('Constraint fk_oc_pedido_item criada.');
  }

  const [uniqueKeys] = await db.query(`
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ordens_compra'
      AND INDEX_NAME = 'uq_oc_pedido_item'
  `);

  if (!uniqueKeys.length) {
    await db.execute(`
      ALTER TABLE ordens_compra
      ADD UNIQUE KEY uq_oc_pedido_item (pedido_item_id)
    `);
    console.log('Unique uq_oc_pedido_item criado.');
  }

  console.log('Migração 017 concluída.');
}

async function down() {
  console.log('Migração 017 (rollback): removendo pedido_item_id...');

  await db.execute(`
    ALTER TABLE ordens_compra DROP FOREIGN KEY fk_oc_pedido_item
  `);

  await db.execute(`
    ALTER TABLE ordens_compra DROP COLUMN pedido_item_id
  `);

  // Restaurar UNIQUE em pedido_id se necessário
  await db.execute(`
    ALTER TABLE ordens_compra
    ADD UNIQUE KEY pedido_id (pedido_id)
  `);

  console.log('Rollback da migração 017 concluído.');
}

module.exports = { up, down };
