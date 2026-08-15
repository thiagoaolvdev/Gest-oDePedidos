const NotificationService = require('../services/NotificationService');

const service = new NotificationService();

const index = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await service.findByUser(req.userId, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
  try {
    await service.markAsRead(req.params.id, req.userId);
    res.json({ message: 'Notificação marcada como lida' });
  } catch (err) { next(err); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await service.markAllAsRead(req.userId);
    res.json({ message: 'Todas notificações marcadas como lidas' });
  } catch (err) { next(err); }
};

module.exports = { index, markAsRead, markAllAsRead };
