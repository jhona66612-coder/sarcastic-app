const router = require('express').Router();
const c = require('../controllers/streaks.controller');

router.get('/streaks', c.get);
router.get('/streaks/history', c.history);
router.post('/streaks/check-in', c.checkIn);

router.get('/streak-tokens', c.getTokens);
router.post('/streak-tokens/use', c.useToken);

router.get('/free-days', c.listFreeDays);
router.post('/free-days', c.addFreeDay);
router.delete('/free-days/:id', c.removeFreeDay);

module.exports = router;
