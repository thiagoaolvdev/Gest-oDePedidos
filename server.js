require('dotenv').config();
const app = require('./app');
const db = require('./src/config/database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    const connection = await db.getConnection();
    console.log('MySQL conectado com sucesso');
    connection.release();

    if (process.env.LIVE_RELOAD !== 'false') {
      require('./src/utils/passengerRestart').start();
    }

    app.listen(PORT, () => {
      console.log(`🌐 ${process.env.APP_NAME} rodando em:`);
      console.log(`   ➜ Local:   http://localhost:${PORT}`);
      console.log(`   ➜ API:     http://localhost:${PORT}/api`);
      console.log(`   ➜ Docs:    http://localhost:${PORT}/api-docs`);
      console.log(`   Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Erro ao conectar no MySQL:', error.message);
    process.exit(1);
  }
})();
