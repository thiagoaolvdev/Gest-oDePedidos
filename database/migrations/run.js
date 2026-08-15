require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

const resolveDbHost = () => {
  const configuredHost = process.env.DB_HOST || '127.0.0.1';
  return configuredHost === 'localhost' ? '127.0.0.1' : configuredHost;
};

const run = async () => {
  const db = await mysql.createConnection({
    host: resolveDbHost(),
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chemarauto'
  });

  const migrations = ['./001_initial', './002_add_mecanico', './004_add_deve_trocar_senha', './005_add_ordens_compra', './006_add_previsao_entrega', './007_add_novo_orcamento', './008_rename_status_realizado', './009_add_administrativo', './010_setor_obrigatorio', './011_add_fornecedor_origem', './012_make_oc_fornecedor_nullable', './013_add_funilaria', './014_email_para_nick'];
  for (const m of migrations) {
    const migration = require(m);
    await migration.up(db);
  }
  await db.end();
  console.log('Migrations executadas com sucesso.');
};

run().catch(err => {
  console.error('Erro nas migrations:', err.message);
  process.exit(1);
});
