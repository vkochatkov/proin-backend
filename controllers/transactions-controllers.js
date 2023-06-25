const HttpError = require('../models/http-error');
const mongoose = require('mongoose');

const Transaction = require('../models/transaction');
const logger = require('../services/logger');
const Project = require('../models/project');
const User = require('../models/user');

const getProjectTransactions = (req, res, next) => {

};

const createTransaction = async (req, res, next) => {
  const { projectId, timestamp } = req.body;
  const userId = req.userData.userId;
  const classifiers = ['Обід', 'Проїзд', 'Житло'];

  const createdTransaction = new Transaction({
    description: '',
    projectId,
    userId,
    sum: '',
    classifier: '',
    id: '',
    timestamp: '',
    type: '',
    timestamp,
    classifiers
  });

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await createdTransaction.save({ session });

    createdTransaction.id = createdTransaction._id.toString(); 

    await createdTransaction.save({ session });

    const user = await User.findById(userId);
    user.transactions.push(createdTransaction);

    const project = await Project.findById(projectId);
    project.transactions.push(createdTransaction);

    await user.save({ session });
    await project.save({ session });

    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError('Creating transaction failed, please try again.', 500);
    return next(error);
  }

  res.status(201).json({ transaction: createdTransaction });
};


const updateTransaction = async (req, res, next) => {
  const transactionId = req.params.id;
  const userId = req.userData.userId;
  const { 
    description, 
    projectId, 
    sum, 
    classifier, 
    type,
    classifiers
  } = req.body;

  let transaction;
  try {
    transaction = await Transaction.findById(transactionId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update transaction.', 500);
    return next(error);
  }

  if (!transaction) {
    const error = new HttpError('Could not find transaction for the provided id.', 404);
    return next(error);
  }

  if (description) {
    transaction.description = description;
  }

  if (sum) {
    transaction.sum = sum;
  }

  if (classifier) {
    transaction.classifier = classifier;
  }

  if (classifiers) {
    transaction.classifiers = classifiers;
  }

  if (type) {
    transaction.type = type;
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await transaction.save({ session });

    const project = await Project.findById(projectId);
    project.transactions.push(transaction);

    const user = await User.findById(userId);
    user.transactions.push(transaction);

    await project.save({ session });
    await user.save({ session });

    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update transaction.', 500);
    return next(error);
  }

  res.status(200).json({ transaction });
};

const deleteTransaction = async (req, res, next) => {
  const transactionId = req.params.id;
  const { projectId, userId } = req.body;

  let transaction;
  try {
    transaction = await Transaction.findById(transactionId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete transaction.', 500);
    return next(error);
  }

  if (!transaction) {
    const error = new HttpError('Could not find transaction for the provided id.', 404);
    return next(error);
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await transaction.remove({ session });

    const project = await Project.findById(projectId).session(session);
    project.transactions.pull(transactionId);

    const user = await User.findById(userId).session(session);
    user.transactions.pull(transactionId);

    await project.save({ session });
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete transaction.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Transaction deleted successfully.' });
};

exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;