const express = require('express');
const router = express.Router();

const projectMembersControllers = require('../controllers/project-members-conrtollers');
const checkAuth = require('../middleware/check-auth');

router.use(checkAuth);

router.get('/:pid', projectMembersControllers.getProjectMembers);
router.delete('/:pid', projectMembersControllers.removeProjectMember);

module.exports = router;
