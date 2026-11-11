const router = require('express').Router();
const c = require('../controllers/challenges.controller');

router.get('/challenges', c.list);
router.post('/challenges', c.create);
router.get('/challenges/:id', c.getOne);
router.patch('/challenges/:id', c.update);
router.post('/challenges/:id/participants', c.join);
router.get('/challenges/:id/participants', c.participants);
router.patch('/challenges/:id/progress', c.updateProgress);

module.exports = router;
