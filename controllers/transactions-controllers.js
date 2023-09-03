const HttpError = require('../models/http-error');
const mongoose = require('mongoose');

const Transaction = require('../models/transaction');
const logger = require('../services/logger');
const Project = require('../models/project');
const User = require('../models/user');
const transactionUtils = require('../services/transaction-utils');


const getProjectTransactions = async (req, res, next) => {
  const projectId = req.params.pid;

  let project;
  try {
    project = await Project.findById(projectId).populate('transactions');
  } catch (err) {
    logger.info(`error at the getProjectTransactions. Message: ${err.message}`);
    const error = new HttpError(
      'Something went wrong, could not fetch project transactions.',
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

  res.json({ transactions: project.transactions });
};

const getUserTransactions = async (req, res, next) => {
  const userId = req.userData.userId;

  try {
    const user = await User.findById(userId).populate('transactions');
    if (!user) {
      const error = new HttpError('Could not find the user for the provided id.', 404);
      return next(error);
    }

    // Fetch user transactions
    const userTransactions = user.transactions;

    // Fetch project transactions from shared projects
    const projectTransactions = await Transaction.find({
      projectId: {
        $in: await Project.find({ sharedWith: userId }).distinct('_id'),
      },
    });

    // Create a Set to store unique transaction IDs from userTransactions
    const userTransactionsIds = new Set(userTransactions.map((transaction) => transaction.taskId));

    // Filter projectTransactions to exclude transactions that already exist in userTransactions
    const filteredProjectTasks = projectTransactions.filter(
      (projectTransaction) => !userTransactionsIds.has(projectTransaction.taskId)
    );

    // Combine user transactions and filtered project transactions
    const transactions = [...userTransactions, ...filteredProjectTasks];

    res.json({ transactions });
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not fetch transactions.',
      500
    );
    return next(error);
  }
};

const getTransactionById = async (req, res, next) => {
  const transactionId = req.params.id;

  let transaction;
  try {
    transaction = await Transaction.findById(transactionId);
  } catch (err) {
    logger.info(`error at the getTransactionById. Message: ${err.message}`);
    const error = new HttpError(
      'Something went wrong, could not fetch transaction.',
      500
    );
    return next(error);
  }

  if (!transaction) {
    const error = new HttpError(
      'Could not find transaction for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ transaction });
};

const createTransaction = async (req, res, next) => {
  const { projectId, timestamp } = req.body;
  const userId = req.userData.userId;

  let project;
    
  try {
    project = await Project.findById(projectId);
  } catch (e) {
    const error = new HttpError('Something went wrong, could not update transaction.', 500);
    return next(error);
  }

  if (!project) {
    const error = new HttpError('Could not find project for the provided id.', 404);
    return next(error);
  }

  const classifiers = project.classifiers;

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
    logger.info(`error at createTransaction, message: ${err.message}`)
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
    classifiers, 
    timestamp
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

  if (timestamp) {
    transaction.timestamp = timestamp;
  }

  if (classifiers && transaction.type) {
    await transactionUtils.updateClassifiers(projectId, classifiers, transaction.type);
  }

  if (type) {
    transaction.type = type;
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    transaction.increment();

    await transaction.save({ session });

    const project = await Project.findById(projectId);

    if (!project) {
        const error = new HttpError('Could not find project for the provided id.', 404);
        return next(error);
      }

    const projectTransactionIndex = project.transactions.findIndex(
      (projTransaction) => projTransaction._id.toString() === transactionId
    );

    if (projectTransactionIndex !== -1) {
      project.transactions.set(projectTransactionIndex, transaction);
    }

    const user = await User.findById(userId);
    
    if (!user) {
      const error = new HttpError('Could not find user for the provided id.', 404);
      return next(error);
    }

    const userTransactionIndex = user.transactions.findIndex(
      (usrTransaction) => usrTransaction._id.toString() === transactionId
    );

    if (userTransactionIndex !== -1) {
      user.transactions.set(userTransactionIndex, transaction);
    }

    await project.save({ session });
    await user.save({ session });

    await session.commitTransaction();
  } catch (err) {
    logger.info(`error at updateTransaction, message: ${err.message}`);
    const error = new HttpError('Something went wrong, could not update transaction.', 500);
    return next(error);
  }

  res.status(200).json({ transaction });
};

const deleteTransaction = async (req, res, next) => {
  const transactionId = req.params.id;
  const userId = req.userData.userId;

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

    const project = await Project.findById(transaction.projectId).session(session);
    project.transactions.pull(transactionId);

    const user = await User.findById(userId).session(session);
    user.transactions.pull(transactionId);

    await project.save({ session });
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    logger.info(`error at deleteTransaction, message: ${err.message}`);
    const error = new HttpError('Something went wrong, could not delete transaction.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Transaction deleted successfully.' });
};

const updateTransactionsByProjectId = async (req, res, next) => {
  const projectId = req.params.pid;
  const { transactions } = req.body;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new HttpError('Something went wrong, could not find project', 404);
      return next(error);
    }

    project.transactions = transactions;

    await project.save();
  } catch (err) {
    logger.info(`updateTransactionsByProjectId: ${err}`);
    const error = new HttpError('Something went wrong, could not update transactions.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Transactions updated successfully.' });
};

const updateUserTransactionsById = async (req, res, next) => {
  const userId = req.params.uid;
  const { transactions } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new HttpError('Something went wrong, could not find user', 404);
      return next(error);
    }

    user.transactions = transactions;

    await user.save();
  } catch (err) {
    logger.info(`updateUserTransactionsById: ${err}`);
    const error = new HttpError('Something went wrong, could not update transactions.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Transactions updated successfully.' });
};

exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.getTransactionById = getTransactionById;
exports.getProjectTransactions = getProjectTransactions;
exports.updateTransactionsByProjectId = updateTransactionsByProjectId;
exports.getUserTransactions = getUserTransactions;
exports.updateUserTransactionsById = updateUserTransactionsById;