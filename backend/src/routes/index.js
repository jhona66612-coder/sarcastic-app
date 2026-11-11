const router = require('express').Router();
const auth = require('../middlewares/auth');

// Rutas públicas (registro e inicio de sesión) y /auth/me protegida
router.use(require('./auth.routes'));

// A partir de aquí TODAS las rutas exigen un JWT válido
router.use(auth);
router.use(require('./users.routes'));
router.use(require('./tasks.routes'));
router.use(require('./calendar.routes'));
router.use(require('./streaks.routes'));
router.use(require('./ai.routes'));
router.use(require('./experience.routes'));
router.use(require('./community.routes'));
router.use(require('./challenges.routes'));
router.use(require('./alarms.routes'));
router.use(require('./notifications.routes'));

module.exports = router;
