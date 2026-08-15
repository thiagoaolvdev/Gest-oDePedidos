const bcrypt = require('bcryptjs');
const db = require('../../src/config/database');

async function up() {
  console.log('Migração 009: Adicionando perfil administrativo...');

  await db.execute(`
    ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','garantia','administrativo','diretor','mecanico') NOT NULL DEFAULT 'oficina'
  `);

  const [cols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'setor'`);
  if (cols.length === 0) {
    await db.execute(`ALTER TABLE usuarios ADD COLUMN setor VARCHAR(100) NULL AFTER nome`);
    console.log('Coluna setor adicionada');
  }

  const [nickCols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'nick'`);
  const campo = nickCols.length > 0 ? 'nick' : 'email';
  const [existing] = await db.query(`SELECT id FROM usuarios WHERE ${campo} = ?`, ['administrativo']);
  if (existing.length === 0) {
    const senha = await bcrypt.hash('Admin@2024x', 10);
    await db.execute(
      `INSERT INTO usuarios (nome, setor, ${campo}, senha, perfil, ativo, deve_trocar_senha) VALUES (?, ?, ?, ?, 'administrativo', 1, 1)`,
      ['Administrativo', 'Administrativo', 'administrativo', senha]
    );
    console.log(`Usuário Administrativo criado (${campo}: administrativo)`);
  }

  console.log('Migração 009 concluída.');
}

async function down() {
  console.log('Migração 009 (rollback): Removendo perfil administrativo...');

  await db.execute(`UPDATE usuarios SET perfil = 'diretor' WHERE perfil = 'administrativo'`);

  await db.execute(`
    ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','garantia','diretor','mecanico') NOT NULL DEFAULT 'oficina'
  `);

  await db.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS setor`);

  console.log('Rollback da migração 009 concluído.');
}

module.exports = { up, down };
