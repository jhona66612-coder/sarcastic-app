const router = require('express').Router();
const c = require('../controllers/experience.controller');

router.get('/experience', c.get);
router.get('/experience/transactions', c.transactions);
router.get('/achievements', c.listAchievements);
router.get('/users/me/achievements', c.myAchievements);
router.get('/inventory-items', c.listItems);
router.get('/inventory', c.inventory);
router.patch('/inventory/:id/equip', c.equip);

module.exports = router;
