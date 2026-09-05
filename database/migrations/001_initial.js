const fs = require('fs');
const path = require('path');

const up = async (db) => {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('CREATE DATABASE') && !s.startsWith('USE '));
  for (const stmt of statements) {
    await db.query(stmt);
  }
  console.log('Migração 001_initial concluída');
};

const down = async (db) => {
  const tables = [
    'ordem_compra_rateios',
    'ordens_compra',
    'pedido_itens',
    'notificacoes',
    'pedido_historico',
    'compras',
    'pedido_arquivos',
    'pedido_fotos',
    'pedidos',
    'refresh_tokens',
    'auditoria',
    'veiculos',
    'pecas',
    'modelos',
    'marcas',
    'categorias_pecas',
    'fornecedores',
    'usuarios'
  ];
  for (const table of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${table}`);
  }
  console.log('Rollback 001_initial concluído');
};

module.exports = { up, down };
