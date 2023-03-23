const express = require('express');

const projectControllers = require('../controllers/projects-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get('/:pid', projectControllers.getProjectById);

router.get('/user/:uid', projectControllers.getProjectsByUserId);

router.use(checkAuth);

router.post(
  '/',
  projectControllers.createProject
);

router.patch(
  '/:pid',
  fileUpload.single('image'),
  projectControllers.updateProject
);

router.delete('/:pid', projectControllers.deleteProject);

module.exports = router;
