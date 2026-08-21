const db = require('../../src/config/database');

async function up() {
  console.log('Migração 016: tornando fornecedor_nome e fornecedor_endereco da OC opcionais...');
  await db.execute(`
    ALTER TABLE ordens_compra
    MODIFY COLUMN fornecedor_nome VARCHAR(150) NULL
  `);
  await db.execute(`
    ALTER TABLE ordens_compra
    MODIFY COLUMN fornecedor_endereco VARCHAR(255) NULL
  `);
  console.log('Migração 016 concluída.');
}

async function down() {
  console.log('Migração 016 (rollback): tornando fornecedor_nome e fornecedor_endereco obrigatórios...');
  await db.execute(`
    UPDATE ordens_compra SET fornecedor_nome = '' WHERE fornecedor_nome IS NULL
  `);
  await db.execute(`
    UPDATE ordens_compra SET fornecedor_endereco = '' WHERE fornecedor_endereco IS NULL
  `);
  await db.execute(`
    ALTER TABLE ordens_compra
    MODIFY COLUMN fornecedor_nome VARCHAR(150) NOT NULL
  `);
  await db.execute(`
    ALTER TABLE ordens_compra
    MODIFY COLUMN fornecedor_endereco VARCHAR(255) NOT NULL
  `);
  console.log('Rollback da migração 016 concluído.');
}

module.exports = { up, down };
