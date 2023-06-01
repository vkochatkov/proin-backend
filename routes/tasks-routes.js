const express = require('express');

const tasksControllers = require('../controllers/tasks-controllers');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.use(checkAuth);

router.get('/:pid/tasks', tasksControllers.getAllTasksByProjectId);
router.delete('/:tid', tasksControllers.deleteTask);
router.post('/:pid/create', tasksControllers.createTask);
router.post('/:pid', tasksControllers.updateTasksByProjectId);
router.post('/:pid/tasks/:tid', tasksControllers.updateTask);
router.post('/task/:tid', tasksControllers.updateFilesInTask);

module.exports = router;
