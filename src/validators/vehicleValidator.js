const { required, minLength } = require('../middlewares/validationMiddleware');

const createVehicleSchema = {
  body: {
    placa: [required, minLength(7)],
    modelo_id: [required],
    ano: [required]
  }
};

module.exports = { createVehicleSchema };
