const cron = require('node-cron');
const OrderRepository = require('../repositories/OrderRepository');
const NotificationRepository = require('../repositories/NotificationRepository');
const logger = require('../utils/logger');

const jobName = 'Notificar Pedidos com Mais de 48h sem Atualização';

const run = async () => {
  try {
    const orderRepo = new OrderRepository();
    const notifRepo = new NotificationRepository();

    const orders = await orderRepo.findStaleOrders(48);

    for (const order of orders) {
      const dias = Math.floor(
        (new Date() - new Date(order.ultima_atualizacao)) / (1000 * 60 * 60 * 24)
      );

      if (order.usuario_id) {
        await notifRepo.create({
          usuario_id: order.usuario_id,
          titulo: `Pedido ${order.numero} sem atualização`,
          mensagem: `O pedido ${order.numero} está sem atualização há ${dias} dia(s). Status atual: ${order.status}.`,
          tipo: 'atraso',
          pedido_id: order.id
        });
      }

      logger.info(`${jobName}: Pedido ${order.numero} notificado (${dias} dias sem atualização)`);
    }

    if (orders.length > 0) {
      logger.info(`${jobName}: ${orders.length} pedidos notificados`);
    }
  } catch (error) {
    logger.error(`${jobName}: Erro - ${error.message}`);
  }
};

const start = () => {
  const interval = process.env.CRON_48H_INTERVAL || '0 * * * *';
  cron.schedule(interval, run);
  logger.info(`${jobName} agendado (${interval})`);
};

module.exports = { start, run };
