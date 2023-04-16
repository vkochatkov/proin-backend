const express = require('express');

const commentsControllers = require('../controllers/comments-conrtollers');
const checkAuth = require('../middleware/check-auth');
const checkPermission = require('../middleware/check-permission');

const router = express.Router();

router.use(checkAuth);

router.post(
  '/:pid/comment', 
  checkPermission, 
  commentsControllers.createProjectComment
);
router.patch(
  '/:pid/comment', 
  checkPermission, 
  commentsControllers.updateProjectComments
);
router.delete(
  '/:pid/comment', 
  checkPermission, 
  commentsControllers.deleteComment
);

module.exports = router;
