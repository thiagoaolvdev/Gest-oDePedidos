const db = require('../../src/config/database');

async function up() {
  console.log('Migração 007: adicionando status novo_orcamento...');
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','realizado','concluido') NOT NULL DEFAULT 'pendente'
  `).catch(err => {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  });
  console.log('Migração 007 concluída.');
}

async function down() {
  console.log('Migração 007 (rollback): removendo status novo_orcamento...');
  await db.execute(`
    ALTER TABLE pedidos
    MODIFY COLUMN status ENUM('pendente','em_compra','aguardando_aprovacao','aprovado','rejeitado','realizado','concluido') NOT NULL DEFAULT 'pendente'
  `);
  console.log('Rollback da migração 007 concluído.');
}

module.exports = { up, down };
