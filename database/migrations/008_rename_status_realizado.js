const db = require('../../src/config/database');

async function up() {
  console.log('Migração 008: renomeando status realizado para comprado...');
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','realizado','comprado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  await db.execute(`UPDATE pedidos SET status = 'comprado' WHERE status = 'realizado'`);
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','comprado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  console.log('Migração 008 concluída.');
}

async function down() {
  console.log('Migração 008 (rollback): revertendo status comprado para realizado...');
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','realizado','comprado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  await db.execute(`UPDATE pedidos SET status = 'realizado' WHERE status = 'comprado'`);
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','realizado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  console.log('Rollback da migração 008 concluído.');
}

module.exports = { up, down };
