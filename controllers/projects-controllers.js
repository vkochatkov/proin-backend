const fs = require('fs');

const mongoose = require('mongoose');
const HttpError = require('../models/http-error');

const Project = require('../models/project');
const User = require('../models/user');
const AWS = require('aws-sdk');

require('dotenv').config();

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new AWS.S3({
  region, 
  accessKeyId,
  secretAccessKey,
  acl: 'public-read'
});

const uploadFile = (file) => {
  const fileStream = fs.createReadStream(file.path);
  const uploadParams = {
    Bucket: bucketName, 
    Body: fileStream,
    Key: file.originalname,
  }

  return s3.upload(uploadParams).promise();
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

const createProject = async (req, res, next) => {
  const createdProject = new Project({
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
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
  const { projectName, description } = req.body;
  const projectId = req.params.pid;

  let project;

  try {
    project = await Project.findById(projectId);
  } catch (err) {
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

  if (req.file && req.file.path) {
    const { Location } = await uploadFile(req.file);

    if (Location) {
      const params = {
        Bucket: bucketName,
        Key: `${req.file.originalname}`,
        Expires: 5900
      };
      
      const presignuedUrl = s3.getSignedUrl('getObject', params);
      project.logoUrl = presignuedUrl;
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

  const logoPath = project.logoUrl;

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

  fs.unlink(logoPath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted project.' });
};

exports.getProjectById = getProjectById;
exports.getProjectsByUserId = getProjectsByUserId;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
