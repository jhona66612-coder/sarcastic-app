const router = require('express').Router();
const c = require('../controllers/tasks.controller');

router.get('/tasks', c.list);
router.post('/tasks', c.create);
router.get('/tasks/:id', c.getOne);
router.put('/tasks/:id', c.update);
router.patch('/tasks/:id/status', c.changeStatus);
router.delete('/tasks/:id', c.remove);
router.get('/tasks/:id/history', c.history);

router.get('/task-categories', c.listCategories);
router.post('/task-categories', c.createCategory);

module.exports = router;
