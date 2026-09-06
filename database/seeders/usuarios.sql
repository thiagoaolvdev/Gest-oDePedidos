-- ============================================================
-- SEED - USUÁRIOS PADRÃO DO SISTEMA PEDIX / CHEMARAUTO
-- ============================================================
-- Senha padrão dos usuários criados: Chema@2024
-- Todos são inseridos com deve_trocar_senha = 1,
-- obrigando a troca no primeiro login.
--
-- Em registros já existentes, mantém a senha atual e
-- apenas atualiza nome/setor/perfil/ativo.
-- ============================================================

INSERT INTO usuarios (nome, setor, nick, senha, perfil, ativo, deve_trocar_senha, avatar)
VALUES
  ('Administrador', 'Diretor',        'admin',          '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'diretor',        1, 1, NULL),
  ('Diretor',       'Diretor',        'diretor',        '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'diretor',        1, 1, NULL),
  ('Logística',     'Logística',      'logistica',      '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'logistica',      1, 1, NULL),
  ('Oficina',       'Oficina',        'oficina',        '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'oficina',        1, 1, NULL),
  ('Garantia',      'Garantia',       'garantia',       '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'garantia',       1, 1, NULL),
  ('Administrativo','Administrativo', 'administrativo', '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'administrativo', 1, 1, NULL),
  ('Funilaria',     'Funilaria',      'funilaria',      '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'funilaria',      1, 1, NULL),
  ('Mecânico',      'Oficina',        'mecanico',       '$2a$10$t6RScfc4RvBUL7CCVcagBO.AzypWuRjK.opSBwsm5KXDi9RU37waO', 'mecanico',       1, 1, NULL)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  setor = VALUES(setor),
  perfil = VALUES(perfil),
  ativo = VALUES(ativo),
  updated_at = CURRENT_TIMESTAMP;