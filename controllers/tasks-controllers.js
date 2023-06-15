const HttpError = require('../models/http-error');
const mongoose = require('mongoose');

const Task = require('../models/task');
const logger = require('../services/logger');
const Project = require('../models/project');
const User = require('../models/user');
const { uploadFiles } = require('../services/s3');

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

  res.status(200).json({ tasks: tasks ? tasks : [] });
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
    const user = await User.findById(userId);
    
    await createdTask.save({ session: sess });

    project.tasks.unshift(createdTask);
    user.tasks.push(createdTask);

    await project.save({ session: sess });
    await user.save({ session: sess });
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
  const { status, description, name, files, projectId } = req.body;
  const taskId = req.params.tid;
  const userId = req.userData.userId;

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

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not fetch user.', 500);
    return next(error);
  }

  const { name: userName, logoUrl: userLogo } = user;

  if (status) {
    const previousStatus = task.status || '';
    const actionDescription = `Статус змінено`;
    task.actions.push({ 
      description: actionDescription, 
      timestamp: new Date(), 
      userId, 
      name: userName, 
      userLogo, 
      field: 'status', 
      oldValue: previousStatus, 
      newValue: status 
    });
    task.status = status;
  }

  if (description) {
    const previousDescription = task.description || '';
    const actionDescription = `Опис змінено`;
    task.actions.push({ 
      description: actionDescription, 
      timestamp: new Date(), 
      userId, 
      name: userName, 
      userLogo, 
      field: 'description', 
      oldValue: previousDescription, 
      newValue: description 
    });
    task.description = description;
  }

  if (name) {
    const previousName = task.name || '';
    const actionDescription = `Ім'я змінено`;
    task.actions.push({ 
      description: actionDescription, 
      timestamp: new Date(), 
      userId, 
      name: userName, 
      userLogo, 
      field: 'name', 
      oldValue: previousName, 
      newValue: name 
    });
    task.name = name;
  }

  if (projectId && files && files.length > 0) {
    const uploadedFiles = await uploadFiles(files, projectId);
    task.files = task.files.concat(uploadedFiles.filter(file => file !== undefined));
    const actionDescription = `Завантажено файл/файли`;

    task.actions.push({ 
      description: actionDescription, 
      timestamp: new Date(), 
      userId, 
      name: userName, 
      userLogo, 
      field: 'files', 
      // oldValue: previousFiles, 
      // newValue: files 
    });
  }

  try {
    await task.save();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update task.', 500);
    return next(error);
  }

  res.status(200).json({ task });
};

const updateTasksByProjectId = async (req, res, next) => {
  const projectId = req.params.pid;
  const { tasks } = req.body

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new HttpError('Something went wrong, could not find project', 404);
      return next(error);
    }

    project.tasks = tasks;

    await project.save();
  } catch (e) {
    logger.info(`updateTaskByProjectId ${e}`)
    const error = new HttpError('Something went wrong, could not update tasks.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Tasks updated successfully.' });
}

const updateUserTasks = async (req, res, next) => {
  const userId = req.userData.userId;
  const { taskIds } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new HttpError('Something went wrong, could not find user', 404);
      return next(error);
    }

    user.tasks = taskIds;
    await user.save();

    res.status(200).json({ message: 'User tasks updated successfully.' });
  } catch (err) {
    logger.info(err);
    const error = new HttpError('Something went wrong, could not update tasks.', 500);
    return next(error);
  }
};

const updateFilesInTask = async (req, res, next) => {
  const taskId = req.params.tid;
  const { files } = req.body;

  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    
    task.files = files;

    await task.save();

    res.status(200).json({ task: task.toObject({ getters: true }) });
  } catch (err) {
    logger.info(err);
    res.status(500).json({ message: 'Something went wrong, could not update files in task.' });
  }
}

const getAllTasksByUserId = async (req, res, next) => {
  const userId = req.userData.userId;

  let tasks;
  try {
    const user = await User.findById(userId).populate('tasks');
    tasks = user.tasks;
  } catch (err) {
    logger.info(`getAllTasksByUserId error: ${err}`);
    const error = new HttpError('Fetching tasks failed, please try again.', 500);
    return next(error);
  }

  res.status(200).json({ tasks: tasks ? tasks : [] });
};

exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.createTask = createTask;
exports.getAllTasksByProjectId = getAllTasksByProjectId;
exports.updateTasksByProjectId = updateTasksByProjectId;
exports.updateFilesInTask = updateFilesInTask;
exports.getAllTasksByUserId = getAllTasksByUserId;
exports.updateUserTasks = updateUserTasks;
