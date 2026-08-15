const db = require('../../src/config/database');

async function up() {
  console.log('Migração 003: Substituindo perfil administrativo por diretor...');

  await db.execute(`
    UPDATE usuarios SET perfil = 'diretor' WHERE perfil = 'administrativo'
  `);

  await db.execute(`
    ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','garantia','diretor','mecanico') NOT NULL DEFAULT 'oficina'
  `);

  console.log('Migração 003 concluída.');
}

async function down() {
  console.log('Migração 003 (rollback): Restaurando perfil administrativo...');

  await db.execute(`
    ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','administrativo','garantia','diretor','mecanico') NOT NULL DEFAULT 'oficina'
  `);

  console.log('Rollback da migração 003 concluído.');
}

module.exports = { up, down };
