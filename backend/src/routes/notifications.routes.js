const router = require('express').Router();
const c = require('../controllers/notifications.controller');

router.get('/notifications', c.list);
router.patch('/notifications/read-all', c.markAllRead);
router.patch('/notifications/:id/read', c.markRead);

router.post('/push-tokens', c.registerPushToken);
router.delete('/push-tokens', c.removePushToken);

module.exports = router;
