const db = require('../../src/config/database');

async function up() {
  console.log('Migração 005: adicionando ordens de compra...');

  await db.execute(`
    ALTER TABLE fornecedores
    ADD COLUMN endereco VARCHAR(255) NULL AFTER email
  `).catch((err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') throw err;
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ordens_compra (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pedido_id INT NOT NULL UNIQUE,
      fornecedor_id INT NOT NULL,
      fornecedor_nome VARCHAR(150) NOT NULL,
      fornecedor_endereco VARCHAR(255) NOT NULL,
      fornecedor_telefone VARCHAR(20),
      numero VARCHAR(20) UNIQUE,
      tipo ENUM('contrato','concorrencia','simples') NOT NULL,
      prazo_entrega DATE NOT NULL,
      condicoes_pagamento VARCHAR(255) NOT NULL,
      data_emissao DATE NOT NULL,
      uso_veiculo ENUM('brinde','reembolso','financiamento_ted') DEFAULT NULL,
      veiculo_uso VARCHAR(150),
      placa_uso VARCHAR(20),
      rateio_guara DECIMAL(12,2) DEFAULT NULL,
      rateio_lorena DECIMAL(12,2) DEFAULT NULL,
      rateio_outros DECIMAL(12,2) DEFAULT NULL,
      centro_custo ENUM('novos','usados','mecanica','funilaria','pecas','diretoria') NOT NULL,
      observacoes TEXT,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      desconto DECIMAL(12,2) NOT NULL DEFAULT 0,
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      criado_por INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_oc_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
      CONSTRAINT fk_oc_fornecedor FOREIGN KEY(fornecedor_id) REFERENCES fornecedores(id),
      CONSTRAINT fk_oc_usuario FOREIGN KEY(criado_por) REFERENCES usuarios(id),
      INDEX idx_oc_pedido(pedido_id),
      INDEX idx_oc_fornecedor(fornecedor_id),
      INDEX idx_oc_numero(numero)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('Migração 005 concluída.');
}

async function down() {
  console.log('Migração 005 (rollback): removendo ordens de compra...');
  await db.execute('DROP TABLE IF EXISTS ordens_compra');
  await db.execute('ALTER TABLE fornecedores DROP COLUMN IF EXISTS endereco');
  console.log('Rollback da migração 005 concluído.');
}

module.exports = { up, down };
