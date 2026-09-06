-- ============================================================
-- BANCO DE DADOS - SISTEMA PEDIX / CHEMARAUTO
-- SCHEMA COMPLETO ATUALIZADO
-- MYSQL 8+
-- ENGINE: INNODB
-- CHARSET: UTF8MB4
-- ============================================================


-- ============================================================
-- 1. USUÁRIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nome VARCHAR(100) NOT NULL,

    setor ENUM(
        'Oficina',
        'Funilaria',
        'Garantia',
        'Logística',
        'Diretor',
        'Administrativo'
    ) NOT NULL DEFAULT 'Oficina',

    nick VARCHAR(100) NOT NULL,

    senha VARCHAR(255) NOT NULL,

    perfil ENUM(
        'oficina',
        'logistica',
        'garantia',
        'funilaria',
        'administrativo',
        'diretor',
        'mecanico'
    ) NOT NULL DEFAULT 'oficina',

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    deve_trocar_senha TINYINT(1) NOT NULL DEFAULT 0,

    avatar VARCHAR(255) DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_usuarios_nick (nick),

    INDEX idx_usuarios_perfil (perfil),

    INDEX idx_usuarios_setor (setor),

    INDEX idx_usuarios_ativo (ativo)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 2. MARCAS
-- ============================================================

CREATE TABLE IF NOT EXISTS marcas (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nome VARCHAR(100) NOT NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_marcas_nome (nome),

    INDEX idx_marcas_ativo (ativo)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 3. MODELOS
-- ============================================================

CREATE TABLE IF NOT EXISTS modelos (

    id INT AUTO_INCREMENT PRIMARY KEY,

    marca_id INT NOT NULL,

    nome VARCHAR(100) NOT NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_modelos_marca
        FOREIGN KEY (marca_id)
        REFERENCES marcas(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_modelos_marca_nome (
        marca_id,
        nome
    ),

    INDEX idx_modelos_marca (marca_id),

    INDEX idx_modelos_ativo (ativo)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 4. VEÍCULOS
-- ============================================================

CREATE TABLE IF NOT EXISTS veiculos (

    id INT AUTO_INCREMENT PRIMARY KEY,

    modelo_id INT NOT NULL,

    placa VARCHAR(10) NOT NULL,

    ano INT NOT NULL,

    motor VARCHAR(50) DEFAULT NULL,

    cor VARCHAR(50) DEFAULT NULL,

    chassi VARCHAR(50) DEFAULT NULL,

    quilometragem INT NOT NULL DEFAULT 0,

    observacoes TEXT DEFAULT NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_veiculos_modelo
        FOREIGN KEY (modelo_id)
        REFERENCES modelos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_veiculos_placa (placa),

    UNIQUE KEY uq_veiculos_chassi (chassi),

    INDEX idx_veiculos_modelo (modelo_id),

    INDEX idx_veiculos_ativo (ativo)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 5. CATEGORIAS DE PEÇAS
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_pecas (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nome VARCHAR(100) NOT NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_categoria_pecas_nome (nome),

    INDEX idx_categoria_pecas_ativo (ativo)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 6. FORNECEDORES
-- ============================================================

CREATE TABLE IF NOT EXISTS fornecedores (

    id INT AUTO_INCREMENT PRIMARY KEY,

    razao_social VARCHAR(150) NOT NULL,

    nome_fantasia VARCHAR(150) DEFAULT NULL,

    cnpj VARCHAR(18) DEFAULT NULL,

    telefone VARCHAR(20) DEFAULT NULL,

    email VARCHAR(150) DEFAULT NULL,

    endereco VARCHAR(255) DEFAULT NULL,

    cidade VARCHAR(100) DEFAULT NULL,

    estado VARCHAR(2) DEFAULT NULL,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_fornecedores_cnpj (cnpj),

    INDEX idx_fornecedores_ativo (ativo),

    INDEX idx_fornecedores_cidade (cidade)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 7. PEÇAS
-- ============================================================

CREATE TABLE IF NOT EXISTS pecas (

    id INT AUTO_INCREMENT PRIMARY KEY,

    categoria_id INT DEFAULT NULL,

    nome VARCHAR(150) NOT NULL,

    codigo_interno VARCHAR(50) NOT NULL,

    codigo_fabricante VARCHAR(50) DEFAULT NULL,

    unidade VARCHAR(10) NOT NULL DEFAULT 'un',

    estoque INT NOT NULL DEFAULT 0,

    valor_medio DECIMAL(10,2) NOT NULL DEFAULT 0,

    ativo TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pecas_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categorias_pecas(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    UNIQUE KEY uq_pecas_codigo_interno (
        codigo_interno
    ),

    INDEX idx_pecas_categoria (categoria_id),

    INDEX idx_pecas_codigo_fabricante (
        codigo_fabricante
    ),

    INDEX idx_pecas_ativo (ativo)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 8. PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS pedidos (

    id INT AUTO_INCREMENT PRIMARY KEY,

    numero VARCHAR(20) NOT NULL,

    veiculo_id INT NOT NULL,

    usuario_id INT NOT NULL,

    destinatario_id INT DEFAULT NULL,

    mecanico_id INT DEFAULT NULL,

    mecanico_nome VARCHAR(150) DEFAULT NULL,

    aprovado_por INT DEFAULT NULL,

    data_pedido DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    status ENUM(
        'pendente',
        'em_compra',
        'aguardando_aprovacao',
        'aguardando_autorizacao',
        'novo_orcamento',
        'aprovado',
        'rejeitado',
        'comprado',
        'concluido'
    ) NOT NULL DEFAULT 'pendente',

    status_entrega ENUM(
        'pendente',
        'em_transito',
        'chegou'
    ) NOT NULL DEFAULT 'pendente',

    previsao_entrega DATE DEFAULT NULL,

    data_entrega_real DATETIME DEFAULT NULL,

    valor_total DECIMAL(12,2)
        NOT NULL DEFAULT 0,

    observacoes TEXT DEFAULT NULL,

    data_aprovacao DATETIME DEFAULT NULL,

    motivo_rejeicao TEXT DEFAULT NULL,

    duplicidade_ignorada BOOLEAN
        NOT NULL DEFAULT FALSE,

    triagem ENUM(
        'urgente',
        'carro_vendido',
        'carro_estoque'
    ) DEFAULT NULL,

    ultima_atualizacao DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT fk_pedido_veiculo
        FOREIGN KEY (veiculo_id)
        REFERENCES veiculos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    CONSTRAINT fk_pedido_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    CONSTRAINT fk_pedido_destinatario
        FOREIGN KEY (destinatario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    CONSTRAINT fk_pedido_mecanico
        FOREIGN KEY (mecanico_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    CONSTRAINT fk_pedido_aprovador
        FOREIGN KEY (aprovado_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    UNIQUE KEY uq_pedidos_numero (numero),

    INDEX idx_pedidos_veiculo (
        veiculo_id
    ),

    INDEX idx_pedidos_usuario (
        usuario_id
    ),

    INDEX idx_pedidos_status (
        status
    ),

    INDEX idx_pedidos_status_entrega (
        status_entrega
    ),

    INDEX idx_pedidos_destinatario (
        destinatario_id
    ),

    INDEX idx_pedidos_mecanico (
        mecanico_id
    ),

    INDEX idx_pedidos_triagem (
        triagem
    ),

    INDEX idx_pedidos_data (
        data_pedido
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 9. ITENS DO PEDIDO
-- ============================================================
-- IMPORTANTE:
-- NÃO EXISTE ordem_compra_id AQUI.
--
-- A RELAÇÃO É:
--
-- pedido_itens
--      ↓
-- ordens_compra.pedido_item_id
--
-- ISSO EVITA DEPENDÊNCIA CIRCULAR.
-- ============================================================

CREATE TABLE IF NOT EXISTS pedido_itens (

    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    peca_id INT NOT NULL,

    descricao VARCHAR(255) DEFAULT NULL,

    fornecedor_id INT DEFAULT NULL,

    fornecedor_origem VARCHAR(255) DEFAULT NULL,

    quantidade INT NOT NULL DEFAULT 1,

    valor_unitario DECIMAL(10,2)
        NOT NULL DEFAULT 0,

    valor_total DECIMAL(12,2)
        NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT fk_pi_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    CONSTRAINT fk_pi_peca
        FOREIGN KEY (peca_id)
        REFERENCES pecas(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    CONSTRAINT fk_pi_fornecedor
        FOREIGN KEY (fornecedor_id)
        REFERENCES fornecedores(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_pi_pedido (
        pedido_id
    ),

    INDEX idx_pi_peca (
        peca_id
    ),

    INDEX idx_pi_fornecedor (
        fornecedor_id
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 10. ORDENS DE COMPRA
-- ============================================================
--
-- RELAÇÃO 1:1 COM PEDIDO_ITEM
--
-- UNIQUE pedido_item_id
--
-- UM ITEM POSSUI NO MÁXIMO UMA ORDEM DE COMPRA.
-- ============================================================

CREATE TABLE IF NOT EXISTS ordens_compra (

    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    pedido_item_id INT NOT NULL,

    fornecedor_id INT DEFAULT NULL,


    -- ========================================================
    -- SNAPSHOT DO FORNECEDOR
    -- OS DADOS SÃO CONGELADOS NO MOMENTO DA EMISSÃO DA OC
    -- ========================================================

    fornecedor_nome VARCHAR(150)
        DEFAULT NULL,

    fornecedor_endereco VARCHAR(255)
        DEFAULT NULL,

    fornecedor_telefone VARCHAR(20)
        DEFAULT NULL,


    numero VARCHAR(20) DEFAULT NULL,


    tipo ENUM(
        'contrato',
        'concorrencia',
        'simples'
    ) NOT NULL,


    prazo_entrega DATE NOT NULL,


    condicoes_pagamento VARCHAR(255)
        NOT NULL,


    data_emissao DATE NOT NULL,


    uso_veiculo ENUM(
        'brinde',
        'reembolso',
        'financiamento_ted'
    ) DEFAULT NULL,


    veiculo_uso VARCHAR(150)
        DEFAULT NULL,


    placa_uso VARCHAR(20)
        DEFAULT NULL,


    centro_custo ENUM(
        'novos',
        'usados',
        'mecanica',
        'funilaria',
        'pecas',
        'diretoria'
    ) DEFAULT NULL,


    observacoes TEXT DEFAULT NULL,


    subtotal DECIMAL(12,2)
        NOT NULL DEFAULT 0,


    desconto DECIMAL(12,2)
        NOT NULL DEFAULT 0,


    total DECIMAL(12,2)
        NOT NULL DEFAULT 0,


    criado_por INT NOT NULL,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT fk_oc_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    CONSTRAINT fk_oc_pedido_item
        FOREIGN KEY (pedido_item_id)
        REFERENCES pedido_itens(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    CONSTRAINT fk_oc_fornecedor
        FOREIGN KEY (fornecedor_id)
        REFERENCES fornecedores(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    CONSTRAINT fk_oc_usuario
        FOREIGN KEY (criado_por)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    UNIQUE KEY uq_oc_pedido_item (
        pedido_item_id
    ),


    UNIQUE KEY uq_oc_numero (
        numero
    ),


    INDEX idx_oc_pedido (
        pedido_id
    ),


    INDEX idx_oc_fornecedor (
        fornecedor_id
    ),


    INDEX idx_oc_criado_por (
        criado_por
    ),


    INDEX idx_oc_data_emissao (
        data_emissao
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 11. RATEIOS DA ORDEM DE COMPRA
-- ============================================================
--
-- NORMALIZAÇÃO DOS ANTIGOS CAMPOS:
--
-- rateio_guara
-- rateio_lorena
-- rateio_outros
--
-- AGORA É POSSÍVEL ADICIONAR NOVAS UNIDADES SEM ALTERAR O BANCO.
-- ============================================================

CREATE TABLE IF NOT EXISTS ordem_compra_rateios (

    id INT AUTO_INCREMENT PRIMARY KEY,

    ordem_compra_id INT NOT NULL,

    unidade VARCHAR(100) NOT NULL,

    valor DECIMAL(12,2)
        NOT NULL DEFAULT 0,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT fk_rateio_ordem_compra
        FOREIGN KEY (ordem_compra_id)
        REFERENCES ordens_compra(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    UNIQUE KEY uq_rateio_oc_unidade (
        ordem_compra_id,
        unidade
    ),


    INDEX idx_rateio_oc (
        ordem_compra_id
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 12. NOTIFICAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes (

    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    pedido_id INT DEFAULT NULL,

    titulo VARCHAR(200) NOT NULL,

    mensagem TEXT NOT NULL,


    tipo ENUM(
        'info',
        'alerta',
        'aprovacao',
        'rejeicao',
        'atraso'
    ) NOT NULL DEFAULT 'info',


    lida TINYINT(1)
        NOT NULL DEFAULT 0,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_not_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    CONSTRAINT fk_not_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_not_usuario (
        usuario_id
    ),


    INDEX idx_not_pedido (
        pedido_id
    ),


    INDEX idx_not_lida (
        lida
    ),


    INDEX idx_not_created (
        created_at
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 13. HISTÓRICO DOS PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS pedido_historico (

    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    usuario_id INT DEFAULT NULL,

    status VARCHAR(50) NOT NULL,

    descricao TEXT DEFAULT NULL,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_ph_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    CONSTRAINT fk_ph_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_ph_pedido (
        pedido_id
    ),


    INDEX idx_ph_usuario (
        usuario_id
    ),


    INDEX idx_ph_created (
        created_at
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 14. COMPRAS
-- ============================================================

CREATE TABLE IF NOT EXISTS compras (

    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    usuario_id INT DEFAULT NULL,

    valor_total DECIMAL(12,2)
        NOT NULL DEFAULT 0,

    data_compra DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(50) DEFAULT NULL,

    observacao TEXT DEFAULT NULL,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT fk_comp_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    CONSTRAINT fk_comp_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_comp_pedido (
        pedido_id
    ),


    INDEX idx_comp_usuario (
        usuario_id
    ),


    INDEX idx_comp_data (
        data_compra
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 15. ARQUIVOS DOS PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS pedido_arquivos (

    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    usuario_id INT DEFAULT NULL,

    arquivo VARCHAR(255) NOT NULL,

    tipo VARCHAR(50) DEFAULT NULL,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_pa_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    CONSTRAINT fk_pa_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_pa_pedido (
        pedido_id
    ),


    INDEX idx_pa_usuario (
        usuario_id
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 16. FOTOS DOS PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS pedido_fotos (

    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    usuario_id INT DEFAULT NULL,

    url VARCHAR(500) NOT NULL,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_pf_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    CONSTRAINT fk_pf_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_pf_pedido (
        pedido_id
    ),


    INDEX idx_pf_usuario (
        usuario_id
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 17. AUDITORIA
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (

    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT DEFAULT NULL,

    acao VARCHAR(50) NOT NULL,

    entidade VARCHAR(50) NOT NULL,

    entidade_id INT DEFAULT NULL,


    valores_anteriores JSON DEFAULT NULL,

    valores_novos JSON DEFAULT NULL,


    ip VARCHAR(45) DEFAULT NULL,


    data_criacao DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_aud_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_auditoria_usuario (
        usuario_id
    ),


    INDEX idx_auditoria_entidade (
        entidade,
        entidade_id
    ),


    INDEX idx_auditoria_data (
        data_criacao
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 18. REFRESH TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (

    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    token VARCHAR(500) NOT NULL,

    ultima_atividade DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    expires_at DATETIME NOT NULL,


    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_rt_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,


    UNIQUE KEY uq_refresh_token (
        token(255)
    ),


    INDEX idx_refresh_usuario (
        usuario_id
    ),


    INDEX idx_refresh_expires (
        expires_at
    )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================