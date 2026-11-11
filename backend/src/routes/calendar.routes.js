const router = require('express').Router();
const events = require('../controllers/events.controller');
const focus = require('../controllers/focus.controller');

router.get('/events', events.list);
router.post('/events', events.create);
router.get('/events/:id', events.getOne);
router.put('/events/:id', events.update);
router.delete('/events/:id', events.remove);

router.get('/focus-sessions', focus.list);
router.post('/focus-sessions', focus.start);
router.patch('/focus-sessions/:id/finish', focus.finish);
router.patch('/focus-sessions/:id/interrupt', focus.interrupt);

module.exports = router;
