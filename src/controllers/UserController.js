const UserService = require('../services/UserService');

const service = new UserService();

const index = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await service.findAll(parseInt(page), parseInt(limit));
    res.json(result);
  } catch (err) { next(err); }
};

const show = async (req, res, next) => {
  try {
    const user = await service.findById(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
};

const store = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const user = await service.create(req.body, req.userId, ip);
    res.status(201).json(user);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const user = await service.update(req.params.id, req.body, req.userId, ip);
    res.json(user);
  } catch (err) { next(err); }
};

const destroy = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await service.delete(req.params.id, req.userId, ip);
    res.json({ message: 'Usuário desativado' });
  } catch (err) { next(err); }
};

const listByPerfil = async (req, res, next) => {
  try {
    const users = await service.findByPerfil(req.params.perfil);
    res.json(users);
  } catch (err) { next(err); }
};

const listDropdown = async (req, res, next) => {
  try {
    const users = await service.listDropdown();
    res.json(users);
  } catch (err) { next(err); }
};

module.exports = { index, show, store, update, destroy, listByPerfil, listDropdown };
