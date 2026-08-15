const MarcaService = require('../services/MarcaService');
const service = new MarcaService();

const index = async (req, res, next) => {
  try { res.json(await service.findAll()); } catch (err) { next(err); }
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
    res.json({ message: 'Marca removida' });
  } catch (err) { next(err); }
};

module.exports = { index, store, update, destroy };
