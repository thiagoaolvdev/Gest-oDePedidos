const ModeloService = require('../services/ModeloService');
const service = new ModeloService();

const index = async (req, res, next) => {
  try { res.json(await service.findAll()); } catch (err) { next(err); }
};

const findByMarca = async (req, res, next) => {
  try { res.json(await service.findByMarca(req.params.marcaId)); } catch (err) { next(err); }
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
    res.json({ message: 'Modelo removido' });
  } catch (err) { next(err); }
};

module.exports = { index, show, findByMarca, store, update, destroy };
