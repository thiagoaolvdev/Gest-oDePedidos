const db = require('../../src/config/database');

async function up() {
  console.log('Migração 012: tornando fornecedor_id da OC opcional...');
  await db.execute(`
    ALTER TABLE ordens_compra
    MODIFY COLUMN fornecedor_id INT NULL
  `).catch(err => {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  });
  console.log('Migração 012 concluída.');
}

async function down() {
  console.log('Migração 012 (rollback): tornando fornecedor_id obrigatório...');
  await db.execute(`
    ALTER TABLE ordens_compra
    MODIFY COLUMN fornecedor_id INT NOT NULL
  `);
  console.log('Rollback da migração 012 concluído.');
}

module.exports = { up, down };
