const db = require('../../src/config/database');

async function up() {
  console.log('Migração 006: adicionando previsao_entrega...');
  await db.execute(`
    ALTER TABLE pedidos
    ADD COLUMN previsao_entrega DATE DEFAULT NULL AFTER status_entrega
  `).catch(err => {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  });
  console.log('Migração 006 concluída.');
}

async function down() {
  console.log('Migração 006 (rollback): removendo previsao_entrega...');
  await db.execute('ALTER TABLE pedidos DROP COLUMN IF EXISTS previsao_entrega');
  console.log('Rollback da migração 006 concluído.');
}

module.exports = { up, down };
