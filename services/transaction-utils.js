const Transaction = require('../models/transaction');
const Project = require('../models/project');
const HttpError = require('../models/http-error');

const logger = require('../services/logger');

const updateClassifiers = async (projectId, classifiers) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new HttpError('Project not found', 404);
    }

    project.classifiers = classifiers;

    await project.save();

    await Transaction.updateMany(
      { projectId },
      { $set: { classifiers } }
    );
  } catch (err) {
    logger.info(err.message);
    throw new HttpError('Could not update classifiers', 500);
  }
};

module.exports = {
  updateClassifiers,
};