const PartService = require('../services/PartService');

const service = new PartService();

const index = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const result = await service.findAll(parseInt(page), parseInt(limit), search);
    res.json(result);
  } catch (err) { next(err); }
};

const show = async (req, res, next) => {
  try {
    const part = await service.findById(req.params.id);
    res.json(part);
  } catch (err) { next(err); }
};

const store = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const part = await service.create(req.body, req.userId, ip);
    res.status(201).json(part);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const part = await service.update(req.params.id, req.body, req.userId, ip);
    res.json(part);
  } catch (err) { next(err); }
};

const destroy = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await service.delete(req.params.id, req.userId, ip);
    res.json({ message: 'Peça desativada com sucesso' });
  } catch (err) { next(err); }
};

const search = async (req, res, next) => {
  try {
    const results = await service.search(req.query.q || '');
    res.json(results);
  } catch (err) { next(err); }
};

module.exports = { index, show, store, update, destroy, search };
