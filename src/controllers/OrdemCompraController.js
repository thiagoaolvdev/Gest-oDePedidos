const OrdemCompraService = require('../services/OrdemCompraService');

const service = new OrdemCompraService();

const store = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const result = await service.create(req.params.id, req.body, req.userId, ip);
    res.status(201).json({ ids: result });
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const ocs = await service.findAllByPedido(req.params.id);
    res.json(ocs);
  } catch (err) {
    next(err);
  }
};

const pdf = async (req, res, next) => {
  try {
    const { ocId } = req.params;
    const ordens = await service.findPrintable(req.params.id, ocId ? Number(ocId) : null);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.render('ordem-compra', {
      ordens,
      empresa: {
        nome: 'Prime Tech',
        linhas: [
          'Matriz: Rua ...',
          'Filial: Rua ...',
          'Tel: ...',
          'contato@primetech.com.br'
        ]
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { store, findAll, pdf };
