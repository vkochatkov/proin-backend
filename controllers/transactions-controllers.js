const HttpError = require('../models/http-error');
const mongoose = require('mongoose');

const Transaction = require('../models/transaction');
const logger = require('../services/logger');
const Project = require('../models/project');
const User = require('../models/user');
const transactionUtils = require('../services/transaction-utils');

const { uploadFiles, deleteFile } = require('../services/s3');

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
    const userTransactionsIds = new Set(userTransactions.map((transaction) => transaction.transactionId));

    // Filter projectTransactions to exclude transactions that already exist in userTransactions
    const filteredProjectTransactions = projectTransactions.filter(
      (projectTransaction) => !userTransactionsIds.has(projectTransaction.transactionId)
    );

    // Combine user transactions and filtered project transactions
    const transactions = [...userTransactions, ...filteredProjectTransactions];

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
  const { projectId, timestamp, type } = req.body;
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
    type,
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
    user.transactions.unshift(createdTransaction);

    const project = await Project.findById(projectId);
    project.transactions.unshift(createdTransaction);

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
    timestamp,
    files
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

  if (projectId && files && files.length > 0) {
    const uploadedFiles = await uploadFiles(files, projectId);
    transaction.files = transaction.files.concat(uploadedFiles.filter(file => file !== undefined));
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

const removeFileFromTransaction = async (req, res, next) => {
  const transactionId = req.params.id;
  const fileId = req.params.fid;

  try {
    // Find the transaction by ID
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'transaction not found' });
    }

    // Find the file by ID in the transaction's files array
    const file = transaction.files.find(file => file._id.toString() === fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found in the transaction' });
    }

    // Delete the file from AWS S3
    await deleteFile(file.url);

    // Remove the file from the transaction's files array
    transaction.files = transaction.files.filter(file => file._id.toString() !== fileId);

    // Save the updated transaction
    await transaction.save();

    res.status(200).json({ transaction: transaction.toObject({ getters: true }) });
  } catch (error) {
    next(error);
  }
};

const updateFilesInTransaction = async (req, res, next) => {
  const transactionId = req.params.id;
  const { files } = req.body;

  try {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'transaction not found.' });
    }
    
    transaction.files = files;

    await transaction.save();

    res.status(200).json({ transaction: transaction.toObject({ getters: true }) });
  } catch (err) {
    logger.info(`updateFilesInTransaction ${err}`);
    const error = new HttpError('Something went wrong, could not update files in transaction.', 500);
    return next(error);
  }
}

const createComment = async (req, res, next) => {
  // Parse and validate request data
  const { comment: { 
    transactionId, 
    text, 
    userId, 
    mentions, 
    timestamp, 
    name, 
    parentId 
  } } = req.body;

  try {
    // Find the transaction based on the transactionId
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      const error = new HttpError('Transaction not found.', 404);
      return next(error);
    }

    // Create a new comment
    const comment = {
      text,
      timestamp,
      transactionId,
      userId,
      mentions,
      name,
      parentId
    };

    // Add the comment to the transaction
    transaction.comments.unshift(comment);

    transaction.comments.forEach((c) => {
      c.id = c._id.toString(); 
    });

    // Save the transaction
    await transaction.save();

    // Return a success response
    res.status(201).json({ transaction });
  } catch (err) {
    // Handle errors
    logger.info(err.message);
    const error = new HttpError('Failed to create the comment.', 500);
    return next(error);
  }
};

const deleteComment = async (req, res, next) => {
  // Extract parameters from the request
  const { tid, cid } = req.params;

  try {
    // Find the transaction based on the tid
    const transaction = await Transaction.findById(tid);
    
    if (!transaction) {
      const error = new HttpError('Transaction not found.', 404);
      return next(error);
    }

    // Find the comment by its ID
    const commentIndex = transaction.comments.findIndex(comment => comment._id.toString() === cid);

    if (commentIndex === -1) {
      const error = new HttpError('Comment not found.', 404);
      return next(error);
    }

    // Remove the comment from the transaction
    transaction.comments.splice(commentIndex, 1);

    // Save the transaction
    await transaction.save();

    // Return a success response
    res.status(200).json({ transaction });
  } catch (err) {
    // Handle errors
    logger.info(`Error in deleteComment. Message: ${err.message}`);
    const error = new HttpError('Failed to delete the comment.', 500);
    return next(error);
  }
};

exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.getTransactionById = getTransactionById;
exports.getProjectTransactions = getProjectTransactions;
exports.updateTransactionsByProjectId = updateTransactionsByProjectId;
exports.getUserTransactions = getUserTransactions;
exports.updateUserTransactionsById = updateUserTransactionsById;
exports.removeFileFromTransaction = removeFileFromTransaction;
exports.updateFilesInTransaction = updateFilesInTransaction;
exports.createComment = createComment;
exports.deleteComment = deleteComment;
