const HttpError = require('../models/http-error');

const Comment = require('../models/comment');

const Project = require('../models/project');
const User = require('../models/user');
const logger = require('../services/logger');
const mailer = require('../nodemailer');
const { deleteFile, uploadFiles } = require('../services/s3');

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
  const { id,
    text,
    timestamp,
    name,
    userId,
    mentions,
    parentId,
    files
   } = req.body;
  
  const project = await findProject(projectId);

  let uploadedFiles;
  if (files && files.length > 0) {
    try {
      uploadedFiles = await uploadFiles(files, projectId);
    } catch (e) {
      logger.error(`PATCH. updateProjectComments/  Error finding project: ${e.message}`);
      const error = new HttpError('Something went wrong, could not update comment.', 500);
      return next(error);
    }
  }

  const comment = new Comment({
    id,
    text,
    timestamp,
    name,
    projectId,
    userId,
    parentId,
    files: uploadedFiles
  })

  try {
    await comment.save();
    project.comments.unshift(comment);
    await project.save();

    const users = await User.find({ name: { $in: mentions } });

    users.forEach(user => {
      const message = {
        to: user.email,
        subject: 'Вам відповіли у проекті',
        text: `${user.name}!, \n\n Вас згадали у коментарі.\n\n"${comment.text}"\n\nЗ найкращими побажаннями,\nКоманда ПРОІН`
      }
  
      mailer(message);
    });
  } catch (err) {
    logger.error(`Error creating comment: ${err.message}`);
    const error = new HttpError('Something went wrong, could not create comment.', 500);
    return next(error);
  }

  res.status(200).json({comments: project.comments});
}

const updateProjectComments = async(req, res, next) => {
  const projectId = req.params.pid;
  const { id, text, timestamp, name, files } = req.body;

  let project;
  try {
    project = await findProject(projectId);
  } catch (err) {
    logger.error(`PATCH. updateProjectComments/  Error finding project: ${err}`);
    const error = new HttpError('Something went wrong, could not update comment.', 500);
    return next(error);
  };

  const commentIndex = project.comments.findIndex(comment => comment.id === id);
  if (commentIndex === -1) {
    const error = new HttpError('Could not find comment with the provided id.', 404);
    logger.error(`PATCH. updateProjectComments/ Could not find comment with the provided id. Error: ${error}`);
    return next(error);
  }

  const comment = project.comments[commentIndex];
  comment.text = text;
  comment.timestamp = timestamp;
  comment.name = name;

  if (files && files.length > 0 && files.length !== comment.files.length) {
    try {
      const addedFiles = files.filter(file => !file._id);

      if (addedFiles.length > 0) {
        const uploadedFiles = await uploadFiles(addedFiles, projectId);
        comment.files = comment.files.concat(uploadedFiles.filter(file => file !== undefined));
      }
    } catch (e) {
      logger.error(`PATCH. updateProjectComments/  Error finding project: ${e.message}`);
      const error = new HttpError('Something went wrong, could not update comment.', 500);
      return next(error);
    }
  }

  try {
    await comment.save();
    await project.save();
  } catch (err) {
    logger.error(`Error updating comment: ${err.message}`);
    const error = new HttpError('Something went wrong, could not update comment.', 500);
    return next(error);
  }

  res.status(200).json({comments: project.comments});
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

    for (const file of comment.files) {
      await deleteFile(file.url);
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
