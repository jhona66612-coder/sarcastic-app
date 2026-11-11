const router = require('express').Router();
const c = require('../controllers/users.controller');

router.put('/users/me', c.updateMe);
router.get('/users/search', c.search);
router.get('/users/me/settings', c.getSettings);
router.put('/users/me/settings', c.updateSettings);

module.exports = router;
