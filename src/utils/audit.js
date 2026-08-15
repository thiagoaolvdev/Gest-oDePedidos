const db = require('../config/database');

const registerAudit = async ({ userId, action, entity, entityId, oldValues, newValues, ip }) => {
  try {
    const query = `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, valores_anteriores, valores_novos, ip, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    await db.execute(query, [
      userId || null,
      action,
      entity,
      entityId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ip || null
    ]);
  } catch (error) {
    console.error('[AUDIT] Erro ao registrar auditoria:', error.message);
  }
};

module.exports = { registerAudit };
