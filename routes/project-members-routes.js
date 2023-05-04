const express = require('express');
const router = express.Router();

const projectMembersControllers = require('../controllers/project-members-conrtollers');
const checkAuth = require('../middleware/check-auth');

router.get(checkAuth);

router.get('/:pid', projectMembersControllers.getProjectMembers);

module.exports = router;
