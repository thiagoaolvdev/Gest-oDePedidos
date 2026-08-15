const { required, isIn } = require('../middlewares/validationMiddleware');

const createOrderSchema = {
  body: {
    veiculo_id: [required]
  }
};

const statusSchema = {
  body: {
    status: [required, isIn(['pendente', 'em_compra', 'aguardando_aprovacao', 'novo_orcamento', 'aprovado', 'rejeitado', 'comprado', 'concluido'])]
  }
};

module.exports = { createOrderSchema, statusSchema };
