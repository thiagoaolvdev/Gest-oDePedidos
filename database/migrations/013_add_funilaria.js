const bcrypt = require('bcryptjs');
const db = require('../../src/config/database');

async function up() {
  console.log('Migração 013: Adicionando perfil funilaria...');

  await db.execute(`
    ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','garantia','funilaria','administrativo','diretor','mecanico') NOT NULL DEFAULT 'oficina'
  `);

  const [nickCols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'nick'`);
  const campo = nickCols.length > 0 ? 'nick' : 'email';
  const [existing] = await db.query(`SELECT id FROM usuarios WHERE ${campo} = ?`, ['funilaria']);
  if (existing.length === 0) {
    const senha = await bcrypt.hash('123456', 10);
    await db.execute(
      `INSERT INTO usuarios (nome, setor, ${campo}, senha, perfil, ativo, deve_trocar_senha) VALUES (?, ?, ?, ?, 'funilaria', 1, 1)`,
      ['Funilaria', 'Funilaria', 'funilaria', senha]
    );
    console.log(`Usuário Funilaria criado (${campo}: funilaria)`);
  }

  console.log('Migração 013 concluída.');
}

async function down() {
  console.log('Migração 013 (rollback): Removendo perfil funilaria...');

  await db.execute(`UPDATE usuarios SET perfil = 'garantia' WHERE perfil = 'funilaria'`);

  await db.execute(`
    ALTER TABLE usuarios MODIFY COLUMN perfil ENUM('oficina','logistica','garantia','administrativo','diretor','mecanico') NOT NULL DEFAULT 'oficina'
  `);

  console.log('Rollback da migração 013 concluído.');
}

module.exports = { up, down };
