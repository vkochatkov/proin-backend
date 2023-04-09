const HttpError = require('../models/http-error');

const Comment = require('../models/comment');

const Project = require('../models/project');
const User = require('../models/user');
const logger = require('../services/logger');

require('dotenv').config();

const findProject = async (projectId) => {
  let project;

  try {
    project = await Project.findById(projectId).populate('comments');
  } catch (err) {
    logger.info(`project has not found, message: ${err}`)
    const error = new HttpError(
      'Something went wrong, could not update project.',
      500
    );
    return next(error);
  }

  return project;
}

const createProjectComment = async (req, res, next) => {
  const projectId = req.params.pid;
  const { id, text, timestamp, name } = req.body;
  
  const project = await findProject(projectId);

  if (project.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this project.', 401);
    return next(error);
  }

  const comment = new Comment({
    id,
    text,
    timestamp,
    name,
    projectId
  })

  let updatedProject;

  try {
    await comment.save();
    project.comments.push(comment);
    await project.save();
    updatedProject = await findProject(projectId);
  } catch (err) {
    logger.error(`Error creating comment: ${err.message}`);
    const error = new HttpError('Something went wrong, could not create comment.', 500);
    return next(error);
  }

  res.status(200).json({comments: updatedProject.comments});
}

const updateProjectComments = async(req, res, next) => {

}

const deleteComment = async(req, res, next) => {
  const projectId = req.params.pid;
  const { id } = req.body;

  try {
    const project = await findProject(projectId);

    const comment = project.comments.find(c => c.id === id);

    if (!comment) {
      const error = new HttpError('Comment not found.', 404);
      logger.info(error.message);

      return next(error);
    }
  
    if (project.creator.toString() !== req.userData.userId) {
      const error = new HttpError('You are not allowed to edit this project.', 401);
      logger.info(error.message);

      return next(error);
    }

    const deletedComment = await Comment.findOneAndDelete({ id });

    if (!deletedComment) {
      const error = new HttpError('Comment not found.', 404);
      logger.info(`deletedComment undefined : ${error.message}`);

      return next(error);
    }

    project.comments = project.comments.filter(c => c.id !== id);

    await project.save();

    res.status(200).json({ message: 'Comment deleted.' });
  } catch (e) {
    logger.info(`DELETE request of deleteComment func has an error - ${e}`);
    const error = new HttpError('Something went wrong, please try again later.', 500);
    return next(error);
  }
};

exports.deleteComment = deleteComment;
exports.createProjectComment = createProjectComment;
exports.updateProjectComments = updateProjectComments;