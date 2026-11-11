const router = require('express').Router();
const auth = require('../middlewares/auth');
const c = require('../controllers/auth.controller');

router.post('/auth/register', c.register);
router.post('/auth/login', c.login);
router.get('/auth/me', auth, c.me);

module.exports = router;
