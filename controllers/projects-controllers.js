const mongoose = require('mongoose');
const HttpError = require('../models/http-error');

const Project = require('../models/project');
const User = require('../models/user');
const { uploadFile, deleteFile } = require('../services/s3');
const logger = require('../services/logger');

require('dotenv').config();

const findeUser = async (userId) => {
  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Creating project failed, please try again.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find author for provided id.', 404);
    return next(error);
  }

  return user;
}

const getProjectById = async (req, res, next) => {
  const projectId = req.params.pid;

  let project;
  try {
    project = await Project.findById(projectId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a project.',
      500
    );
    return next(error);
  }

  if (!project) {
    const error = new HttpError(
      'Could not find project for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ project: project.toObject({ getters: true }) });
};

const getProjectsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithProjects;
  try {
    userWithProjects = await User.findById(userId).populate('projects');
  } catch (err) {
    const error = new HttpError(
      'Fetching projects failed, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    projects: userWithProjects.projects.map(project =>
      project.toObject({ getters: true })
    )
  });
};

const updateProjectsByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  const updatedProjects = req.body.projects;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Retrieve the user object from the database and update the project order
    const user = await User.findById(userId).session(sess);
    user.projects = updatedProjects;

    // Save the updated user object and commit the transaction
    await user.save({ session: sess });
    await sess.commitTransaction();

    res.status(200).json({ message: 'Project order updated successfully.' });
  } catch (err) {
    const error = new HttpError(
      'Updating project order failed, please try again.',
      500
    );
    return next(error);
  }
}

const createProject = async (req, res, next) => {
  const createdProject = new Project({
    creator: req.userData.userId
  });

  let user;

  user = await findeUser(req.userData.userId);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdProject.save({ session: sess });
    user.projects.push(createdProject);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Creating project failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({ project: createdProject });
};

const updateProject = async (req, res, next) => {
  logger.info('"PATCH" request to "https://pro-in.herokuapp.com/projects/:uid"')
  const { projectName, description, logoUrl } = req.body;
  const projectId = req.params.pid;
  let project;

  try {
    project = await Project.findById(projectId);
  } catch (err) {
    logger.info(`project has not found, message: ${err}`)
    const error = new HttpError(
      'Something went wrong, could not update project.',
      500
    );
    return next(error);
  }

  if (project.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this project.', 401);
    return next(error);
  }

  if (logoUrl) {
    logger.info(`all is goung well - 154 line. Next - await uploadFile(logoUrl, projectId);`)
    const { isUploaded, url } = await uploadFile(logoUrl, projectId);
    logger.info(`uploadFile is successfull, 200`)

    if (isUploaded) {
      project.logoUrl = url;
    }
  }

  if (projectName) {
    project.projectName = projectName;
  }

  if (description) {
    project.description = description;
  }

  try {
    await project.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update project.',
      500
    );
    return next(error);
  }

  res.status(200).json({ project: project.toObject({ getters: true }) });
};

const deleteProject = async (req, res, next) => {
  const projectId = req.params.pid;

  let project;
  try {
    project = await Project.findById(projectId).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete project.',
      500
    );
    return next(error);
  }

  if (!project) {
    const error = new HttpError('Could not find project for this id.', 404);
    return next(error);
  }

  if (project.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this project.',
      401
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await project.remove({ session: sess });
    project.creator.projects.pull(project);
    await project.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete project.',
      500
    );
    return next(error);
  }

  const logoUrl = project.logoUrl;

  if (logoUrl) {
    try {
      await deleteFile(logoUrl);
    } catch (e) {
      logger.info(`"DELETE" request failed, message: ${e.message}. 232 line`)

      const error = new HttpError(
        e.message,
        500
      )
      return next(error);
    }
  }

  res.status(200).json({ message: 'Deleted project.' });
};

exports.getProjectById = getProjectById;
exports.getProjectsByUserId = getProjectsByUserId;
exports.updateProjectsByUserId = updateProjectsByUserId;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
