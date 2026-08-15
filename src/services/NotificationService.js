const NotificationRepository = require('../repositories/NotificationRepository');

class NotificationService {
  constructor() {
    this.repo = new NotificationRepository();
  }

  async findByUser(userId, page, limit) {
    return this.repo.findByUser(userId, page, limit);
  }

  async markAsRead(id, userId) {
    const notif = await this.repo.findById(id);
    if (!notif || notif.usuario_id !== userId) {
      throw { statusCode: 404, message: 'Notificação não encontrada' };
    }
    await this.repo.markAsRead(id);
    return true;
  }

  async markAllAsRead(userId) {
    await this.repo.markAllAsRead(userId);
    return true;
  }
}

module.exports = NotificationService;
