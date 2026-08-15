const BaseRepository = require('./BaseRepository');

class CategoriaPecaRepository extends BaseRepository {
  constructor() {
    super('categorias_pecas');
  }
}

module.exports = CategoriaPecaRepository;
