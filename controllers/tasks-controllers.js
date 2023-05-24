const HttpError = require('../models/http-error');
const mongoose = require('mongoose');

const Task = require('../models/task');
const logger = require('../services/logger');
const Project = require('../models/project');

require('dotenv').config();

const getAllTasksByProjectId = async (req, res, next) => {
  const projectId = req.params.pid;

  let project;
  try {
    project = await Project.findById(projectId).populate('tasks');
  } catch (err) {
    logger.info(`getAllTasksByProjectId error: ${err}`);
    const error = new HttpError('Fetching tasks failed, please try again.', 500);
    return next(error);
  }

  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const tasks = project.tasks;

  if (!tasks || tasks.length === 0) {
    return res.status(404).json({ message: 'No tasks found for the provided project ID.' });
  }

  res.json({ tasks });
};

const createTask = async (req, res, next) => {
  const userId = req.userData.userId;
  const projectId = req.params.pid;
  const { timestamp, taskId, name } = req.body;

  const createdTask = new Task({
    timestamp,
    projectId,
    userId,
    status: 'new',
    taskId, 
    name
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    const project = await Project.findById(projectId);
    
    await createdTask.save({ session: sess });
    project.tasks.unshift(createdTask);
    await project.save({ session: sess });
    await sess.commitTransaction();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    await task.remove({ session });

    const project = await Project.findById(task.projectId).session(session);
    project.tasks.pull(task._id); // Remove the task from the project's tasks array
    await project.save({ session });

    await session.commitTransaction();
    session.endSession();
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
exports.getAllTasksByProjectId = getAllTasksByProjectId;
