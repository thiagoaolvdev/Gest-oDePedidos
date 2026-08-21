const db = require('../../src/config/database');

async function up() {
  console.log('Migração 015: uma OC por fornecedor...');

  // Remover UNIQUE constraint de pedido_id para permitir múltiplas OCs por pedido
  await db.execute(`
    ALTER TABLE ordens_compra
    DROP INDEX pedido_id
  `).catch(() => {});

  await db.execute(`
    ALTER TABLE ordens_compra
    ADD INDEX idx_oc_pedido_fornecedor (pedido_id, fornecedor_id)
  `).catch(() => {});

  // Adicionar coluna ordem_compra_id em pedido_itens para vincular itens a OCs específicas
  await db.execute(`
    ALTER TABLE pedido_itens
    ADD COLUMN ordem_compra_id INT NULL
  `).catch(err => {
    if (err.code === 'ER_DUP_FIELDNAME') return;
    throw err;
  });

  await db.execute(`
    ALTER TABLE pedido_itens
    ADD CONSTRAINT fk_pi_oc FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE
  `).catch(err => {
    if (err.code === 'ER_DUP_NAME' || err.code === 'ER_FK_DUP_NAME') return;
    throw err;
  });

  await db.execute(`
    ALTER TABLE pedido_itens
    ADD INDEX idx_pi_oc (ordem_compra_id)
  `).catch(() => {});

  // Migrar dados existentes: vincular itens à OC existente do pedido
  await db.execute(`
    UPDATE pedido_itens pi
    INNER JOIN ordens_compra oc ON oc.pedido_id = pi.pedido_id
    SET pi.ordem_compra_id = oc.id
    WHERE pi.ordem_compra_id IS NULL
  `).catch(() => {});

  console.log('Migração 015 concluída.');
}

async function down() {
  console.log('Migração 015 (rollback)...');

  await db.execute(`
    ALTER TABLE pedido_itens
    DROP FOREIGN KEY fk_pi_oc
  `).catch(() => {});

  await db.execute(`
    ALTER TABLE pedido_itens
    DROP COLUMN ordem_compra_id
  `).catch(() => {});

  await db.execute(`
    ALTER TABLE ordens_compra
    DROP INDEX idx_oc_pedido_fornecedor
  `).catch(() => {});

  await db.execute(`
    ALTER TABLE ordens_compra
    ADD UNIQUE INDEX idx_oc_pedido (pedido_id)
  `).catch(() => {});

  console.log('Rollback da migração 015 concluído.');
}

module.exports = { up, down };
