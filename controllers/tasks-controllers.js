const HttpError = require('../models/http-error');

const Task = require('../models/task');
const logger = require('../services/logger');

require('dotenv').config();

const createTask = async (req, res, next) => {
  const userId = req.userData.userId;
  const projectId = req.params.pid;
  const { timestamp } = req.body;

  const createdTask = new Task({
    timestamp,
    projectId,
    userId,
    status: 'new',
  });

  try {
    await createdTask.save();
  } catch (err) {
    logger.info(`createTask POST error: ${err}`)
    const error = new HttpError('Creating task failed, please try again.', 500);
    return next(error);
  }

  res.status(201).json({ task: createdTask });
};

const deleteTask = async (req, res, next) => {
  const taskId = req.params.tid;

  let task;
  try {
    task = await Task.findById(taskId);
  } catch (err) {
    logger.info(`deleteTask POST error: ${err}`);
    const error = new HttpError('Something went wrong, could not delete task.', 500);
    return next(error);
  }

  if (!task) {
    const error = new HttpError('Could not find task for the provided id.', 404);
    logger.info(`deleteTask POST error: ${error}`);
    return next(error);
  }

  try {
    await task.remove();
  } catch (err) {
    logger.info(`deleteTask POST error: ${err}`);
    const error = new HttpError('Something went wrong, could not delete task.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Task deleted successfully.' });
};

const updateTask = async (req, res, next) => {
  const { status, description, name, files } = req.body;
  const taskId = req.params.tid;

  let task;
  try {
    task = await Task.findById(taskId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update task.', 500);
    return next(error);
  }

  if (!task) {
    const error = new HttpError('Could not find task for the provided id.', 404);
    return next(error);
  }

  if (status) {
    task.status = status;
  }

  if (description) {
    task.description = description;
  }

  if (name) {
    task.name = name;
  }

  if (files && files.length > 0) {
    task.files = files;
  }

  try {
    await task.save();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update task.', 500);
    return next(error);
  }

  res.status(200).json({ task });
};

exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.createTask = createTask;
