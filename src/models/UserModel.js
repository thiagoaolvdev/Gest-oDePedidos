class UserModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nome = data.nome || '';
    this.nick = data.nick || '';
    this.senha = data.senha || '';
    this.perfil = data.perfil || 'oficina';
    this.ativo = data.ativo !== undefined ? data.ativo : 1;
    this.avatar = data.avatar || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      nick: this.nick,
      perfil: this.perfil,
      ativo: this.ativo,
      avatar: this.avatar,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = UserModel;
