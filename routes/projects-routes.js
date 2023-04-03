const express = require('express');

const projectControllers = require('../controllers/projects-controllers');
const checkAuth = require('../middleware/check-auth');

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
  projectControllers.updateProject
);

router.delete('/:pid', projectControllers.deleteProject);

module.exports = router;
