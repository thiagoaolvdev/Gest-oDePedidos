const FornecedorService = require('../services/FornecedorService');
const service = new FornecedorService();

const index = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    res.json(await service.findAll(parseInt(page), parseInt(limit), search));
  } catch (err) { next(err); }
};

const show = async (req, res, next) => {
  try { res.json(await service.findById(req.params.id)); } catch (err) { next(err); }
};

const store = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    res.status(201).json(await service.create(req.body, req.userId, ip));
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    res.json(await service.update(req.params.id, req.body, req.userId, ip));
  } catch (err) { next(err); }
};

const destroy = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await service.delete(req.params.id, req.userId, ip);
    res.json({ message: 'Fornecedor desativado' });
  } catch (err) { next(err); }
};

module.exports = { index, show, store, update, destroy };
