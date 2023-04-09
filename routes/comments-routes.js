const express = require('express');

const commentsControllers = require('../controllers/comments-conrtollers');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.use(checkAuth);

router.post('/:pid/comment', commentsControllers.createProjectComment);
router.patch('/:pid/comment', commentsControllers.updateProjectComments);
router.delete('/:pid/comment', commentsControllers.deleteComment);

module.exports = router;
