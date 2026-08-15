const { required, minLength, isIn } = require('../middlewares/validationMiddleware');

const SETORES = ['Oficina', 'Funilaria', 'Garantia', 'Logística', 'Diretor', 'Administrativo'];

const createUserSchema = {
  body: {
    nome: [required, minLength(3)],
    nick: [required, minLength(3)],
    setor: [required, isIn(SETORES)],
    senha: [
      (value, field) => {
        if (value && String(value).length < 10) {
          return `O campo ${field} deve ter no mínimo 10 caracteres`;
        }
        if (value && (!/[A-Za-zÀ-ÿ]/.test(String(value)) || !/\d/.test(String(value)))) {
          return `O campo ${field} deve conter ao menos uma letra e um número`;
        }
        return null;
      }
    ],
    perfil: [required, isIn(['oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor', 'mecanico'])]
  }
};

const updateUserSchema = {
  body: {
    nome: [minLength(3)],
    nick: [minLength(3)],
    setor: [isIn(SETORES)],
    senha: [
      (value, field) => {
        if (value && String(value).length < 10) {
          return `O campo ${field} deve ter no mínimo 10 caracteres`;
        }
        if (value && (!/[A-Za-zÀ-ÿ]/.test(String(value)) || !/\d/.test(String(value)))) {
          return `O campo ${field} deve conter ao menos uma letra e um número`;
        }
        return null;
      }
    ],
    perfil: [isIn(['oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor', 'mecanico'])]
  }
};

module.exports = { createUserSchema, updateUserSchema };
