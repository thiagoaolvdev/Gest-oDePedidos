const db = require('../../src/config/database');

const q = async (sql, params) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

const hasColumn = async (table, column) => {
  const rows = await q(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
};

const hasIndex = async (table, index) => {
  const rows = await q(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index]
  );
  return rows.length > 0;
};

const hasConstraint = async (table, constraint) => {
  const rows = await q(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, constraint]
  );
  return rows.length > 0;
};

const fkRules = async (table, name) => {
  const rows = await q(
    `SELECT rc.DELETE_RULE, rc.UPDATE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS rc
     WHERE rc.CONSTRAINT_SCHEMA = DATABASE() AND rc.TABLE_NAME = ? AND rc.CONSTRAINT_NAME = ?`,
    [table, name]
  );
  return rows[0] || null;
};

const addColumn = async (table, column, ddl) => {
  if (await hasColumn(table, column)) {
    console.log(`    coluna ${table}.${column} já existe`);
    return;
  }
  await db.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  console.log(`    coluna ${table}.${column} adicionada`);
};

const addIndex = async (table, index, ddl) => {
  if (await hasIndex(table, index)) {
    console.log(`    índice ${table}.${index} já existe`);
    return;
  }
  await db.query(`ALTER TABLE ${table} ADD ${ddl}`);
  console.log(`    índice ${table}.${index} criado`);
};

const dropIndex = async (table, index) => {
  if (!(await hasIndex(table, index))) return;
  await db.query(`ALTER TABLE ${table} DROP INDEX \`${index}\``);
  console.log(`    índice legado ${table}.${index} removido`);
};

const ensureUniqueIndex = async (table, indexName, columns) => {
  if (await hasIndex(table, indexName)) return;
  try {
    const existing = await q(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'
       GROUP BY INDEX_NAME`,
      [table]
    );
    const match = existing.find((x) => x.cols === columns.join(','));
    if (match && match.INDEX_NAME !== indexName) {
      await db.query(`ALTER TABLE ${table} DROP INDEX \`${match.INDEX_NAME}\``);
    }
    await db.query(
      `ALTER TABLE ${table} ADD UNIQUE KEY \`${indexName}\` (${columns.map((c) => `\`${c}\``).join(', ')})`
    );
    console.log(`    unique ${table}.${indexName} criado`);
  } catch (e) {
    console.warn(`    AVISO: unique ${table}.${indexName} não criado: ${e.message}`);
  }
};

const ensureFk = async (table, name, ddl, deleteRule, updateRule) => {
  if (!(await hasConstraint(table, name))) {
    await db.query(ddl);
    console.log(`    FK ${table}.${name} criada`);
    return;
  }
  const rules = await fkRules(table, name);
  if (rules && rules.DELETE_RULE === deleteRule && rules.UPDATE_RULE === updateRule) return;
  await db.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${name}`);
  await db.query(ddl);
  console.log(`    FK ${table}.${name} realinhada (${deleteRule}/${updateRule})`);
};

const up = async () => {
  console.log('Migração 023: integração do novo modelo de banco de dados...');

  // ------------------------------------------------------------
  // USUÁRIOS
  // ------------------------------------------------------------
  await ensureUniqueIndex('usuarios', 'uq_usuarios_nick', ['nick']);
  await addIndex('usuarios', 'idx_usuarios_perfil', 'INDEX idx_usuarios_perfil (perfil)');
  await addIndex('usuarios', 'idx_usuarios_setor', 'INDEX idx_usuarios_setor (setor)');
  await addIndex('usuarios', 'idx_usuarios_ativo', 'INDEX idx_usuarios_ativo (ativo)');

  // ------------------------------------------------------------
  // MARCAS
  // ------------------------------------------------------------
  await addColumn('marcas', 'ativo', 'ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER nome');
  await addColumn('marcas', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER ativo');
  await addColumn('marcas', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await ensureUniqueIndex('marcas', 'uq_marcas_nome', ['nome']);
  await addIndex('marcas', 'idx_marcas_ativo', 'INDEX idx_marcas_ativo (ativo)');

  // ------------------------------------------------------------
  // MODELOS
  // ------------------------------------------------------------
  await addColumn('modelos', 'ativo', 'ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER nome');
  await addColumn('modelos', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER ativo');
  await addColumn('modelos', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await ensureFk(
    'modelos', 'fk_modelos_marca',
    `ALTER TABLE modelos ADD CONSTRAINT fk_modelos_marca FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureUniqueIndex('modelos', 'uq_modelos_marca_nome', ['marca_id', 'nome']);
  await addIndex('modelos', 'idx_modelos_marca', 'INDEX idx_modelos_marca (marca_id)');
  await addIndex('modelos', 'idx_modelos_ativo', 'INDEX idx_modelos_ativo (ativo)');

  // ------------------------------------------------------------
  // VEÍCULOS
  // ------------------------------------------------------------
  await ensureFk(
    'veiculos', 'fk_veiculos_modelo',
    `ALTER TABLE veiculos ADD CONSTRAINT fk_veiculos_modelo FOREIGN KEY (modelo_id) REFERENCES modelos(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureUniqueIndex('veiculos', 'uq_veiculos_placa', ['placa']);
  await ensureUniqueIndex('veiculos', 'uq_veiculos_chassi', ['chassi']);
  await addIndex('veiculos', 'idx_veiculos_modelo', 'INDEX idx_veiculos_modelo (modelo_id)');
  await addIndex('veiculos', 'idx_veiculos_ativo', 'INDEX idx_veiculos_ativo (ativo)');
  await dropIndex('veiculos', 'idx_veiculos_placa');

  // ------------------------------------------------------------
  // CATEGORIAS DE PEÇAS
  // ------------------------------------------------------------
  await addColumn('categorias_pecas', 'ativo', 'ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER nome');
  await addColumn('categorias_pecas', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER ativo');
  await addColumn('categorias_pecas', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await ensureUniqueIndex('categorias_pecas', 'uq_categoria_pecas_nome', ['nome']);
  await addIndex('categorias_pecas', 'idx_categoria_pecas_ativo', 'INDEX idx_categoria_pecas_ativo (ativo)');

  // ------------------------------------------------------------
  // FORNECEDORES
  // ------------------------------------------------------------
  await addColumn('fornecedores', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER estado');
  await addColumn('fornecedores', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await ensureUniqueIndex('fornecedores', 'uq_fornecedores_cnpj', ['cnpj']);
  await addIndex('fornecedores', 'idx_fornecedores_ativo', 'INDEX idx_fornecedores_ativo (ativo)');
  await addIndex('fornecedores', 'idx_fornecedores_cidade', 'INDEX idx_fornecedores_cidade (cidade)');

  // ------------------------------------------------------------
  // PEÇAS
  // ------------------------------------------------------------
  await addColumn('pecas', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER ativo');
  await addColumn('pecas', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await ensureFk(
    'pecas', 'fk_pecas_categoria',
    `ALTER TABLE pecas ADD CONSTRAINT fk_pecas_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_pecas(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await ensureUniqueIndex('pecas', 'uq_pecas_codigo_interno', ['codigo_interno']);
  await addIndex('pecas', 'idx_pecas_categoria', 'INDEX idx_pecas_categoria (categoria_id)');
  await addIndex('pecas', 'idx_pecas_codigo_fabricante', 'INDEX idx_pecas_codigo_fabricante (codigo_fabricante)');
  await addIndex('pecas', 'idx_pecas_ativo', 'INDEX idx_pecas_ativo (ativo)');
  await dropIndex('pecas', 'idx_pecas_codigo_interno');

  // ------------------------------------------------------------
  // PEDIDOS
  // ------------------------------------------------------------
  await ensureFk(
    'pedidos', 'fk_pedido_veiculo',
    `ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureFk(
    'pedidos', 'fk_pedido_usuario',
    `ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureFk(
    'pedidos', 'fk_pedido_destinatario',
    `ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await ensureFk(
    'pedidos', 'fk_pedido_mecanico',
    `ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_mecanico FOREIGN KEY (mecanico_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await ensureFk(
    'pedidos', 'fk_pedido_aprovador',
    `ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_aprovador FOREIGN KEY (aprovado_por) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await ensureUniqueIndex('pedidos', 'uq_pedidos_numero', ['numero']);
  await addIndex('pedidos', 'idx_pedidos_veiculo', 'INDEX idx_pedidos_veiculo (veiculo_id)');
  await addIndex('pedidos', 'idx_pedidos_usuario', 'INDEX idx_pedidos_usuario (usuario_id)');
  await addIndex('pedidos', 'idx_pedidos_status', 'INDEX idx_pedidos_status (status)');
  await addIndex('pedidos', 'idx_pedidos_status_entrega', 'INDEX idx_pedidos_status_entrega (status_entrega)');
  await addIndex('pedidos', 'idx_pedidos_destinatario', 'INDEX idx_pedidos_destinatario (destinatario_id)');
  await addIndex('pedidos', 'idx_pedidos_mecanico', 'INDEX idx_pedidos_mecanico (mecanico_id)');
  await addIndex('pedidos', 'idx_pedidos_triagem', 'INDEX idx_pedidos_triagem (triagem)');
  await addIndex('pedidos', 'idx_pedidos_data', 'INDEX idx_pedidos_data (data_pedido)');
  await dropIndex('pedidos', 'idx_pedidos_numero');

  // ------------------------------------------------------------
  // ITENS DO PEDIDO
  // ------------------------------------------------------------
  await ensureFk(
    'pedido_itens', 'fk_pi_pedido',
    `ALTER TABLE pedido_itens ADD CONSTRAINT fk_pi_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  await ensureFk(
    'pedido_itens', 'fk_pi_peca',
    `ALTER TABLE pedido_itens ADD CONSTRAINT fk_pi_peca FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureFk(
    'pedido_itens', 'fk_pi_fornecedor',
    `ALTER TABLE pedido_itens ADD CONSTRAINT fk_pi_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('pedido_itens', 'idx_pi_pedido', 'INDEX idx_pi_pedido (pedido_id)');
  await addIndex('pedido_itens', 'idx_pi_peca', 'INDEX idx_pi_peca (peca_id)');
  await addIndex('pedido_itens', 'idx_pi_fornecedor', 'INDEX idx_pi_fornecedor (fornecedor_id)');
  await addColumn('pedido_itens', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER valor_total');
  await addColumn('pedido_itens', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');

  // Remover o antigo vínculo circular pedido_itens.ordem_compra_id
  if (await hasConstraint('pedido_itens', 'fk_pi_oc')) {
    await db.query('ALTER TABLE pedido_itens DROP FOREIGN KEY fk_pi_oc').catch(() => {});
  }
  if (await hasColumn('pedido_itens', 'ordem_compra_id')) {
    await db.query('ALTER TABLE pedido_itens DROP COLUMN ordem_compra_id');
    console.log('    coluna pedido_itens.ordem_compra_id removida');
  }

  // ------------------------------------------------------------
  // ORDENS DE COMPRA + RATEIOS
  // ------------------------------------------------------------
  // 1. Criar a tabela de rateios
  await db.query(`
    CREATE TABLE IF NOT EXISTS ordem_compra_rateios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ordem_compra_id INT NOT NULL,
      unidade VARCHAR(100) NOT NULL,
      valor DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_rateio_ordem_compra FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY uq_rateio_oc_unidade (ordem_compra_id, unidade),
      INDEX idx_rateio_oc (ordem_compra_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('    tabela ordem_compra_rateios garantida');

  // 2. Migrar rateios antigos (se existirem)
  const rateioDestino = [
    ['Guara', 'rateio_guara'],
    ['Lorena', 'rateio_lorena'],
    ['Outros', 'rateio_outros']
  ];
  for (const [destino, coluna] of rateioDestino) {
    if (!(await hasColumn('ordens_compra', coluna))) continue;
    await db.query(`
      INSERT INTO ordem_compra_rateios (ordem_compra_id, unidade, valor)
      SELECT id, ?, ${coluna} FROM ordens_compra
      WHERE ${coluna} IS NOT NULL AND ${coluna} <> 0
    `, [destino]);
  }

  // 3. Remover os campos antigos de rateio
  for (const coluna of ['rateio_guara', 'rateio_lorena', 'rateio_outros']) {
    if (await hasColumn('ordens_compra', coluna)) {
      await db.query(`ALTER TABLE ordens_compra DROP COLUMN ${coluna}`);
      console.log(`    coluna ordens_compra.${coluna} removida`);
    }
  }

  // 4. Realinhar FKs da OC
  await ensureFk(
    'ordens_compra', 'fk_oc_pedido',
    `ALTER TABLE ordens_compra ADD CONSTRAINT fk_oc_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  await ensureFk(
    'ordens_compra', 'fk_oc_pedido_item',
    `ALTER TABLE ordens_compra ADD CONSTRAINT fk_oc_pedido_item FOREIGN KEY (pedido_item_id) REFERENCES pedido_itens(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureFk(
    'ordens_compra', 'fk_oc_fornecedor',
    `ALTER TABLE ordens_compra ADD CONSTRAINT fk_oc_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await ensureFk(
    'ordens_compra', 'fk_oc_usuario',
    `ALTER TABLE ordens_compra ADD CONSTRAINT fk_oc_usuario FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureUniqueIndex('ordens_compra', 'uq_oc_pedido_item', ['pedido_item_id']);
  await ensureUniqueIndex('ordens_compra', 'uq_oc_numero', ['numero']);
  await addIndex('ordens_compra', 'idx_oc_pedido', 'INDEX idx_oc_pedido (pedido_id)');
  await addIndex('ordens_compra', 'idx_oc_fornecedor', 'INDEX idx_oc_fornecedor (fornecedor_id)');
  await addIndex('ordens_compra', 'idx_oc_criado_por', 'INDEX idx_oc_criado_por (criado_por)');
  await addIndex('ordens_compra', 'idx_oc_data_emissao', 'INDEX idx_oc_data_emissao (data_emissao)');
  await dropIndex('ordens_compra', 'idx_oc_numero');

  // Limpar índice composto legado (migração 015)
  await dropIndex('ordens_compra', 'idx_oc_pedido_fornecedor');

  // ------------------------------------------------------------
  // NOTIFICAÇÕES
  // ------------------------------------------------------------
  await ensureFk(
    'notificacoes', 'fk_not_usuario',
    `ALTER TABLE notificacoes ADD CONSTRAINT fk_not_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  await ensureFk(
    'notificacoes', 'fk_not_pedido',
    `ALTER TABLE notificacoes ADD CONSTRAINT fk_not_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('notificacoes', 'idx_not_usuario', 'INDEX idx_not_usuario (usuario_id)');
  await addIndex('notificacoes', 'idx_not_pedido', 'INDEX idx_not_pedido (pedido_id)');
  await addIndex('notificacoes', 'idx_not_lida', 'INDEX idx_not_lida (lida)');
  await addIndex('notificacoes', 'idx_not_created', 'INDEX idx_not_created (created_at)');

  // ------------------------------------------------------------
  // HISTÓRICO DOS PEDIDOS
  // ------------------------------------------------------------
  await ensureFk(
    'pedido_historico', 'fk_ph_pedido',
    `ALTER TABLE pedido_historico ADD CONSTRAINT fk_ph_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  await ensureFk(
    'pedido_historico', 'fk_ph_usuario',
    `ALTER TABLE pedido_historico ADD CONSTRAINT fk_ph_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('pedido_historico', 'idx_ph_pedido', 'INDEX idx_ph_pedido (pedido_id)');
  await addIndex('pedido_historico', 'idx_ph_usuario', 'INDEX idx_ph_usuario (usuario_id)');
  await addIndex('pedido_historico', 'idx_ph_created', 'INDEX idx_ph_created (created_at)');

  // ------------------------------------------------------------
  // COMPRAS
  // ------------------------------------------------------------
  await addColumn('compras', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER observacao');
  await addColumn('compras', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await ensureFk(
    'compras', 'fk_comp_pedido',
    `ALTER TABLE compras ADD CONSTRAINT fk_comp_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    'RESTRICT', 'CASCADE'
  );
  await ensureFk(
    'compras', 'fk_comp_usuario',
    `ALTER TABLE compras ADD CONSTRAINT fk_comp_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('compras', 'idx_comp_pedido', 'INDEX idx_comp_pedido (pedido_id)');
  await addIndex('compras', 'idx_comp_usuario', 'INDEX idx_comp_usuario (usuario_id)');
  await addIndex('compras', 'idx_comp_data', 'INDEX idx_comp_data (data_compra)');

  // ------------------------------------------------------------
  // ARQUIVOS DOS PEDIDOS
  // ------------------------------------------------------------
  await ensureFk(
    'pedido_arquivos', 'fk_pa_pedido',
    `ALTER TABLE pedido_arquivos ADD CONSTRAINT fk_pa_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  await ensureFk(
    'pedido_arquivos', 'fk_pa_usuario',
    `ALTER TABLE pedido_arquivos ADD CONSTRAINT fk_pa_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('pedido_arquivos', 'idx_pa_pedido', 'INDEX idx_pa_pedido (pedido_id)');
  await addIndex('pedido_arquivos', 'idx_pa_usuario', 'INDEX idx_pa_usuario (usuario_id)');

  // ------------------------------------------------------------
  // FOTOS DOS PEDIDOS
  // ------------------------------------------------------------
  await ensureFk(
    'pedido_fotos', 'fk_pf_pedido',
    `ALTER TABLE pedido_fotos ADD CONSTRAINT fk_pf_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  await ensureFk(
    'pedido_fotos', 'fk_pf_usuario',
    `ALTER TABLE pedido_fotos ADD CONSTRAINT fk_pf_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('pedido_fotos', 'idx_pf_pedido', 'INDEX idx_pf_pedido (pedido_id)');
  await addIndex('pedido_fotos', 'idx_pf_usuario', 'INDEX idx_pf_usuario (usuario_id)');

  // ------------------------------------------------------------
  // AUDITORIA
  // ------------------------------------------------------------
  await ensureFk(
    'auditoria', 'fk_aud_usuario',
    `ALTER TABLE auditoria ADD CONSTRAINT fk_aud_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE`,
    'SET NULL', 'CASCADE'
  );
  await addIndex('auditoria', 'idx_auditoria_usuario', 'INDEX idx_auditoria_usuario (usuario_id)');
  await addIndex('auditoria', 'idx_auditoria_entidade', 'INDEX idx_auditoria_entidade (entidade, entidade_id)');
  await addIndex('auditoria', 'idx_auditoria_data', 'INDEX idx_auditoria_data (data_criacao)');

  // ------------------------------------------------------------
  // REFRESH TOKENS
  // ------------------------------------------------------------
  await ensureFk(
    'refresh_tokens', 'fk_rt_usuario',
    `ALTER TABLE refresh_tokens ADD CONSTRAINT fk_rt_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE`,
    'CASCADE', 'CASCADE'
  );
  if (!(await hasIndex('refresh_tokens', 'uq_refresh_token'))) {
    try {
      await db.query('ALTER TABLE refresh_tokens ADD UNIQUE KEY uq_refresh_token (token(255))');
      console.log('    unique refresh_tokens.uq_refresh_token criado');
    } catch (e) {
      console.warn(`    AVISO: unique refresh_tokens.uq_refresh_token não criado: ${e.message}`);
    }
  }
  if ((await hasIndex('refresh_tokens', 'idx_refresh_token')) && (await hasIndex('refresh_tokens', 'uq_refresh_token'))) {
    await db.query('ALTER TABLE refresh_tokens DROP INDEX idx_refresh_token').catch(() => {});
    console.log('    índice legado idx_refresh_token removido');
  }
  await addIndex('refresh_tokens', 'idx_refresh_usuario', 'INDEX idx_refresh_usuario (usuario_id)');
  await addIndex('refresh_tokens', 'idx_refresh_expires', 'INDEX idx_refresh_expires (expires_at)');

  console.log('Migração 023 concluída.');
};

const down = async () => {
  console.log('Migração 023 (rollback): revertendo modelo...');

  await db.query('ALTER TABLE ordens_compra ADD COLUMN rateio_guara DECIMAL(12,2) DEFAULT NULL').catch(() => {});
  await db.query('ALTER TABLE ordens_compra ADD COLUMN rateio_lorena DECIMAL(12,2) DEFAULT NULL').catch(() => {});
  await db.query('ALTER TABLE ordens_compra ADD COLUMN rateio_outros DECIMAL(12,2) DEFAULT NULL').catch(() => {});
  await db.query('DROP TABLE IF EXISTS ordem_compra_rateios');

  if (!(await hasColumn('pedido_itens', 'ordem_compra_id'))) {
    await db.query('ALTER TABLE pedido_itens ADD COLUMN ordem_compra_id INT NULL');
  }
  if (!(await hasConstraint('pedido_itens', 'fk_pi_oc'))) {
    await db.query('ALTER TABLE pedido_itens ADD CONSTRAINT fk_pi_oc FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE').catch(() => {});
  }

  console.log('Rollback da migração 023 concluído.');
};

module.exports = { up, down };

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
  up().then(() => process.exit(0)).catch((e) => { console.error('Erro na migração 023:', e.message); process.exit(1); });
}