const Transaction = require('../models/transaction');
const Project = require('../models/project');
const HttpError = require('../models/http-error');

const logger = require('../services/logger');

const updateClassifiers = async (projectId, classifiers, type) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new HttpError('Project not found', 404);
    }

    const updatedClassifiers = classifiers[type];

    project.classifiers[type] = updatedClassifiers;

    await project.save();

    await Transaction.updateMany(
      { projectId, type },
      { $set: { ['classifiers.' + type]: updatedClassifiers } }
    );
  } catch (err) {
    logger.info(`updateClassifiers: ${err.message}`);
    throw new HttpError('Could not update classifiers', 500);
  }
};

module.exports = {
  updateClassifiers,
};