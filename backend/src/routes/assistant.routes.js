const router = require('express').Router();
const controller = require('../controllers/assistant.controller');
router.get('/assistant/capabilities', controller.capabilities);
router.post('/assistant/command', controller.command);
module.exports = router;
