const express = require('express');

const tasksControllers = require('../controllers/tasks-controllers');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.use(checkAuth);

router.delete('/:pid/tasks/:tid', tasksControllers.deleteTask);
router.post('/:pid/create', tasksControllers.createTask);
router.post('/:pid/tasks/:tid', tasksControllers.updateTask);

module.exports = router;
