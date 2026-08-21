const OrderService = require('../services/OrderService');
const db = require('../config/database');
const fs = require('fs/promises');
const path = require('path');

const service = new OrderService();

const index = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await service.findAll(filters, parseInt(page), parseInt(limit), req.userId, req.userPerfil);
    res.json(result);
  } catch (err) { next(err); }
};

const show = async (req, res, next) => {
  try {
    const order = await service.findById(req.params.id, req.userId, req.userPerfil);
    res.json(order);
  } catch (err) { next(err); }
};

const store = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.create(req.body, req.userId, req.userPerfil, ip);
    res.status(201).json(order);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.update(req.params.id, req.body, req.userId, req.userPerfil, ip);
    res.json(order);
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.updateStatus(req.params.id, req.body, req.userId, ip);
    res.json(order);
  } catch (err) { next(err); }
};

const updateEntrega = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.updateEntrega(req.params.id, req.body, req.userId, ip);
    res.json(order);
  } catch (err) { next(err); }
};

const approve = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.approve(req.params.id, req.userId, req.userPerfil, ip);
    res.json(order);
  } catch (err) { next(err); }
};

const reject = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.reject(req.params.id, req.userId, req.userPerfil, req.body, ip);
    res.json(order);
  } catch (err) { next(err); }
};

const requestNewQuote = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const order = await service.requestNewQuote(req.params.id, req.userId, req.userPerfil, req.body, ip);
    res.json(order);
  } catch (err) { next(err); }
};

const destroy = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await service.delete(req.params.id, req.userId, req.userPerfil, ip);
    res.json({ message: 'Pedido removido com sucesso' });
  } catch (err) { next(err); }
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const order = await service.findById(req.params.id, req.userId, req.userPerfil);
    const isOwner = order.usuario_id === req.userId;
    const isAssignedMechanic = order.mecanico_id && Number(order.mecanico_id) === Number(req.userId);
    const isAdmin = ['garantia', 'funilaria', 'diretor'].includes(req.userPerfil);
    if (!isOwner && !isAssignedMechanic && !isAdmin) {
      return res.status(403).json({ error: 'Você não tem permissão para anexar arquivos a este pedido' });
    }

    const filePath = path.join(__dirname, '..', '..', 'public', 'uploads', req.file.filename);
    const fileBuffer = await fs.readFile(filePath);
    const signature = fileBuffer.subarray(0, 12).toString('hex');
    const isJpeg = signature.startsWith('ffd8ff');
    const isPng = signature.startsWith('89504e470d0a1a0a');
    const isGif = signature.startsWith('474946383761') || signature.startsWith('474946383961');
    const isWebp = fileBuffer.subarray(0, 4).toString() === 'RIFF' && fileBuffer.subarray(8, 12).toString() === 'WEBP';
    if (!isJpeg && !isPng && !isGif && !isWebp) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ error: 'Arquivo inválido. Envie uma imagem real.' });
    }

    const url = `/uploads/${req.file.filename}`;
    const [result] = await db.query(
      'INSERT INTO pedido_fotos (pedido_id, usuario_id, url) VALUES (?, ?, ?)',
      [req.params.id, req.userId, url]
    );
    res.json({ id: result.insertId, url });
  } catch (err) { next(err); }
};

module.exports = { index, show, store, update, updateStatus, updateEntrega, approve, reject, requestNewQuote, destroy, upload };
