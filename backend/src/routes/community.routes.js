const router = require('express').Router();
const friends = require('../controllers/friends.controller');
const groups = require('../controllers/groups.controller');
const posts = require('../controllers/posts.controller');

router.get('/friends', friends.list);
router.get('/friends/requests', friends.listRequests);
router.post('/friends/requests', friends.sendRequest);
router.patch('/friends/requests/:id', friends.answerRequest);
router.delete('/friends/:id', friends.remove);

router.get('/groups', groups.list);
router.post('/groups', groups.create);
router.get('/groups/:id', groups.getOne);
router.post('/groups/:id/members', groups.addMember);
router.delete('/groups/:id/members/:userId', groups.removeMember);

router.get('/posts', posts.list);
router.post('/posts', posts.create);
router.delete('/posts/:id', posts.remove);
router.post('/posts/:id/likes', posts.like);
router.delete('/posts/:id/likes', posts.unlike);
router.get('/posts/:id/comments', posts.listComments);
router.post('/posts/:id/comments', posts.createComment);

module.exports = router;
