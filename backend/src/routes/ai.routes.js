const router = require('express').Router();
const c = require('../controllers/ai.controller');

router.post('/ai/chat', c.chat);
router.get('/ai/messages', c.messages);
router.get('/ai/analyses', c.listAnalyses);
router.post('/ai/analyses', c.createAnalysis);
router.get('/ai/analyses/:id', c.getAnalysis);

module.exports = router;
