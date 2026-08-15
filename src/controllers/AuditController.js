const AuditService = require('../services/AuditService');

const service = new AuditService();

const index = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, ...filters } = req.query;
    const result = await service.findAll(parseInt(page), parseInt(limit), filters);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { index };
