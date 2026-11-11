const router = require('express').Router();
const c = require('../controllers/alarms.controller');

// Esta ruta va primero para que "qr" no se confunda con un :id
router.post('/alarms/qr/scan', c.scanQr);

router.get('/alarms', c.list);
router.post('/alarms', c.create);
router.put('/alarms/:id', c.update);
router.delete('/alarms/:id', c.remove);
router.post('/alarms/:id/qr-token', c.createQrToken);
router.post('/alarms/:id/activations', c.activate);
router.get('/alarms/:id/history', c.history);

module.exports = router;
