const db = require('../../src/config/database');

async function up() {
  console.log('Migração 024: status aguardando_autorizacao (autorização do diretor)...');
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','aguardando_autorizacao','novo_orcamento','aprovado','rejeitado','comprado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  console.log('Migração 024 concluída.');
}

async function down() {
  console.log('Migração 024 (rollback): removendo status aguardando_autorizacao...');
  await db.execute("UPDATE pedidos SET status = 'aguardando_aprovacao' WHERE status = 'aguardando_autorizacao'");
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','comprado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  console.log('Rollback da migração 024 concluído.');
}

module.exports = { up, down };