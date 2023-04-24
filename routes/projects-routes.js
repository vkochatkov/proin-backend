const express = require('express');

const projectControllers = require('../controllers/projects-controllers');
const checkAuth = require('../middleware/check-auth');
const checkPermission = require('../middleware/check-permission');

const router = express.Router();

router.get('/:pid', projectControllers.getProjectById);

router.get('/user/:uid', projectControllers.getProjectsByUserId);

router.put('/user/:uid', projectControllers.updateProjectsByUserId);

router.use(checkAuth);

router.post(
  '/',
  projectControllers.createProject
);

router.patch(
  '/:pid',
  checkPermission,
  projectControllers.updateProject
);

router.delete('/:pid', projectControllers.deleteProject);

router.post('/:pid/invite', projectControllers.sendInvitation);

router.post(
  '/:pid/invitations/:invitationId', 
  checkPermission, 
  projectControllers.joinToProject
);

router.patch('/:projectId/moving', projectControllers.moveProject);

module.exports = router;
