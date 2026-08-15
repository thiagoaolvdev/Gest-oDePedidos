const db = require('../../src/config/database');

async function up() {
  console.log('Migração 010: Setor obrigatório...');

  await db.execute(`
    UPDATE usuarios SET setor = CASE perfil
      WHEN 'diretor' THEN 'Diretor'
      WHEN 'administrativo' THEN 'Administrativo'
      WHEN 'garantia' THEN 'Garantia'
      WHEN 'logistica' THEN 'Logística'
      WHEN 'mecanico' THEN 'Oficina'
      ELSE 'Oficina'
    END
    WHERE setor IS NULL OR setor = ''
  `);
  console.log('Setores preenchidos para usuários existentes');

  await db.execute(`
    ALTER TABLE usuarios
    MODIFY COLUMN setor ENUM('Oficina','Funilaria','Garantia','Logística','Diretor','Administrativo') NOT NULL DEFAULT 'Oficina' AFTER nome
  `);
  console.log('Coluna setor alterada para ENUM obrigatório');

  console.log('Migração 010 concluída.');
}

async function down() {
  console.log('Migração 010 (rollback): Voltando setor para VARCHAR...');
  await db.execute(`ALTER TABLE usuarios MODIFY COLUMN setor VARCHAR(100) NULL AFTER nome`);
  console.log('Rollback da migração 010 concluído.');
}

module.exports = { up, down };

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
  up().then(() => process.exit(0)).catch(e => { console.error('Erro na migração 010:', e.message); process.exit(1); });
}
