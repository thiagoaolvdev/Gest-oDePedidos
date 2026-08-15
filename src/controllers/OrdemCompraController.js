const OrdemCompraService = require('../services/OrdemCompraService');

const service = new OrdemCompraService();

const store = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const ordem = await service.create(req.params.id, req.body, req.userId, ip);
    res.status(201).json(ordem);
  } catch (err) {
    next(err);
  }
};

const pdf = async (req, res, next) => {
  try {
    const ordem = await service.findPrintable(req.params.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.render('ordem-compra', {
      ordem,
      empresa: {
        nome: 'Chemarauto',
        linhas: [
          'Matriz: Rua ...',
          'Filial: Rua ...',
          'Tel: ...',
          'contato@chemarauto.com.br'
        ]
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { store, pdf };
