const up = async (db) => {
  const [cols] = await db.query(`SHOW COLUMNS FROM pedidos LIKE 'mecanico_nome'`);
  if (cols.length === 0) {
    await db.query(`ALTER TABLE pedidos ADD COLUMN mecanico_nome VARCHAR(150) AFTER mecanico_id`);
    console.log('Coluna mecanico_nome adicionada');
  } else {
    console.log('Coluna mecanico_nome já existe');
  }
};

const down = async (db) => {
  await db.query(`ALTER TABLE pedidos DROP COLUMN IF EXISTS mecanico_nome`);
  console.log('Coluna mecanico_nome removida');
};

module.exports = { up, down };
