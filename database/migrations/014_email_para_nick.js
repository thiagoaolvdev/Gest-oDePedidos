const up = async (db) => {
  const [nickCols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'nick'`);
  if (nickCols.length > 0) {
    console.log('Coluna nick já existe');
    return;
  }

  console.log('Migração 014: Substituindo e-mail por nick...');
  await db.query(`ALTER TABLE usuarios ADD COLUMN nick VARCHAR(100) NULL AFTER nome`);

  const [rows] = await db.query('SELECT id, email, nome FROM usuarios ORDER BY id');
  const seen = new Map();
  for (const row of rows) {
    let nick = String(row.email || '')
      .split('@')[0]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!nick) {
      nick = String(row.nome || 'usuario')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'usuario';
    }
    const base = nick;
    let i = 1;
    while (seen.has(nick)) {
      nick = `${base}${i}`;
      i++;
    }
    seen.set(nick, true);
    await db.execute('UPDATE usuarios SET nick = ? WHERE id = ?', [nick, row.id]);
  }

  await db.query(`ALTER TABLE usuarios MODIFY COLUMN nick VARCHAR(100) NOT NULL`);
  await db.query(`ALTER TABLE usuarios ADD UNIQUE KEY idx_usuarios_nick (nick)`);
  const [emailIdx] = await db.query(
    `SELECT COUNT(*) as total FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND index_name = 'idx_usuarios_email'`
  );
  if (emailIdx[0].total > 0) {
    await db.query(`ALTER TABLE usuarios DROP INDEX idx_usuarios_email`);
  }
  await db.query(`ALTER TABLE usuarios DROP COLUMN email`);
  console.log('Migração 014_email_para_nick concluída');
};

const down = async (db) => {
  const [nickCols] = await db.query(`SHOW COLUMNS FROM usuarios LIKE 'nick'`);
  if (nickCols.length === 0) return;
  await db.query(`ALTER TABLE usuarios DROP INDEX idx_usuarios_nick`);
  await db.query(`ALTER TABLE usuarios CHANGE COLUMN nick email VARCHAR(150) NULL`);
  console.log('Rollback 014_email_para_nick concluído');
};

module.exports = { up, down };
