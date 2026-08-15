const db = require('../../src/config/database');

async function up() {
  console.log('Migração 011: adicionando fornecedor_origem...');
  await db.execute(`
    ALTER TABLE pedido_itens
    ADD COLUMN fornecedor_origem VARCHAR(255) DEFAULT NULL AFTER fornecedor_id
  `).catch(err => {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  });
  console.log('Migração 011 concluída.');
}

async function down() {
  console.log('Migração 011 (rollback): removendo fornecedor_origem...');
  await db.execute('ALTER TABLE pedido_itens DROP COLUMN IF EXISTS fornecedor_origem');
  console.log('Rollback da migração 011 concluído.');
}

module.exports = { up, down };
