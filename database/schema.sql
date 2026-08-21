
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  setor ENUM('Oficina','Funilaria','Garantia','Logística','Diretor','Administrativo') NOT NULL DEFAULT 'Oficina',
  nick VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil ENUM('oficina','logistica','garantia','funilaria','administrativo','diretor','mecanico') NOT NULL DEFAULT 'oficina',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  deve_trocar_senha TINYINT(1) NOT NULL DEFAULT 0,
  avatar VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_nick(nick),
  INDEX idx_usuarios_perfil(perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marcas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS modelos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  marca_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  CONSTRAINT fk_modelos_marca FOREIGN KEY (marca_id) REFERENCES marcas(id),
  INDEX idx_modelos_marca(marca_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS veiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modelo_id INT NOT NULL,
  placa VARCHAR(10) NOT NULL UNIQUE,
  ano INT NOT NULL,
  motor VARCHAR(50),
  cor VARCHAR(50),
  chassi VARCHAR(50) UNIQUE,
  quilometragem INT DEFAULT 0,
  observacoes TEXT,
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_veiculos_modelo FOREIGN KEY(modelo_id) REFERENCES modelos(id),
  INDEX idx_veiculos_modelo(modelo_id),
  INDEX idx_veiculos_placa(placa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categorias_pecas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fornecedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  razao_social VARCHAR(150) NOT NULL,
  nome_fantasia VARCHAR(150),
  cnpj VARCHAR(18) UNIQUE,
  telefone VARCHAR(20),
  email VARCHAR(150),
  endereco VARCHAR(255),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  ativo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pecas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT,
  nome VARCHAR(150) NOT NULL,
  codigo_interno VARCHAR(50) NOT NULL UNIQUE,
  codigo_fabricante VARCHAR(50),
  unidade VARCHAR(10) DEFAULT 'un',
  estoque INT DEFAULT 0,
  valor_medio DECIMAL(10,2) DEFAULT 0,
  ativo TINYINT(1) DEFAULT 1,
  CONSTRAINT fk_pecas_categoria FOREIGN KEY(categoria_id) REFERENCES categorias_pecas(id),
  INDEX idx_pecas_codigo_interno(codigo_interno),
  INDEX idx_pecas_categoria(categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  veiculo_id INT NOT NULL,
  usuario_id INT NOT NULL,
  destinatario_id INT,
  mecanico_id INT,
  mecanico_nome VARCHAR(150),
  aprovado_por INT,
  data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pendente','em_compra','aguardando_aprovacao','novo_orcamento','aprovado','rejeitado','comprado','concluido') DEFAULT 'pendente',
  status_entrega ENUM('pendente','em_transito','chegou') DEFAULT 'pendente',
  previsao_entrega DATE DEFAULT NULL,
  valor_total DECIMAL(12,2) DEFAULT 0,
  observacoes TEXT,
  data_aprovacao DATETIME,
  motivo_rejeicao TEXT,
  ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedido_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id),
  CONSTRAINT fk_pedido_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_pedido_destinatario FOREIGN KEY(destinatario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedido_mecanico FOREIGN KEY(mecanico_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedido_aprovador FOREIGN KEY(aprovado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_pedidos_numero(numero),
  INDEX idx_pedidos_status(status),
  INDEX idx_pedidos_destinatario(destinatario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  peca_id INT NOT NULL,
  fornecedor_id INT,
  fornecedor_origem VARCHAR(255) DEFAULT NULL,
  quantidade INT DEFAULT 1,
  valor_unitario DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(12,2) DEFAULT 0,
  ordem_compra_id INT,
  CONSTRAINT fk_pi_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_peca FOREIGN KEY(peca_id) REFERENCES pecas(id),
  CONSTRAINT fk_pi_fornecedor FOREIGN KEY(fornecedor_id) REFERENCES fornecedores(id),
  CONSTRAINT fk_pi_oc FOREIGN KEY(ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE,
  INDEX idx_pi_pedido(pedido_id),
  INDEX idx_pi_oc(ordem_compra_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ordens_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  pedido_item_id INT NOT NULL,
  fornecedor_id INT,
  fornecedor_nome VARCHAR(150),
  fornecedor_endereco VARCHAR(255),
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
  centro_custo ENUM('novos','usados','mecanica','funilaria','pecas','diretoria') DEFAULT NULL,
  observacoes TEXT,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  criado_por INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_oc_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_oc_pedido_item FOREIGN KEY(pedido_item_id) REFERENCES pedido_itens(id),
  CONSTRAINT fk_oc_fornecedor FOREIGN KEY(fornecedor_id) REFERENCES fornecedores(id),
  CONSTRAINT fk_oc_usuario FOREIGN KEY(criado_por) REFERENCES usuarios(id),
  UNIQUE KEY uq_oc_pedido_item (pedido_item_id),
  INDEX idx_oc_pedido(pedido_id),
  INDEX idx_oc_fornecedor(fornecedor_id),
  INDEX idx_oc_numero(numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notificacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  pedido_id INT,
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo ENUM('info','alerta','aprovacao','rejeicao','atraso') DEFAULT 'info',
  lida TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_not_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_not_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  usuario_id INT,
  status VARCHAR(50) NOT NULL,
  descricao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ph_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_ph_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  usuario_id INT,
  valor_total DECIMAL(12,2),
  data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  observacao TEXT,
  CONSTRAINT fk_comp_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
  CONSTRAINT fk_comp_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_arquivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  usuario_id INT,
  arquivo VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  acao VARCHAR(50) NOT NULL,
  entidade VARCHAR(50) NOT NULL,
  entidade_id INT,
  valores_anteriores JSON,
  valores_novos JSON,
  ip VARCHAR(45),
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aud_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_auditoria_data(data_criacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_fotos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  usuario_id INT,
  url VARCHAR(500) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pf_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pf_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_pf_pedido(pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_refresh_token(token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
