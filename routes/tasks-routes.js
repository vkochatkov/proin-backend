const express = require('express');

const tasksControllers = require('../controllers/tasks-controllers');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.use(checkAuth);

router.get('/:pid/tasks', tasksControllers.getAllTasksByProjectId);
router.post('/task/:tid', tasksControllers.updateTask);
router.delete('/:tid', tasksControllers.deleteTask);
router.post('/:pid/create', tasksControllers.createTask);
router.post('/user', tasksControllers.updateUserTasks);
router.get('/all', tasksControllers.getAllTasksByUserId);
router.post('/:pid', tasksControllers.updateTasksByProjectId);
router.post('/files/:tid', tasksControllers.updateFilesInTask);
router.post('/:tid/comment', tasksControllers.createComment);
router.delete('/:tid/comment/:cid', tasksControllers.deleteComment);
router.delete('/files/:tid/:fid', tasksControllers.removeFileFromTask)

module.exports = router;
