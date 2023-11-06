const express = require('express');

const transactionsControllers = require('../controllers/transactions-controllers');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.use(checkAuth);

router.post('/transaction', transactionsControllers.createTransaction);
router.patch('/transaction/:id', transactionsControllers.updateTransaction);
router.delete('/transaction/:id', transactionsControllers.deleteTransaction);
router.get('/transaction/:id', transactionsControllers.getTransactionById);
router.get('/project/:pid', transactionsControllers.getProjectTransactions);
router.patch('/project/:pid', transactionsControllers.updateTransactionsByProjectId);
router.get('/all', transactionsControllers.getUserTransactions);
router.patch('/user/:uid', transactionsControllers.updateUserTransactionsById);
router.delete('/files/:id/:fid', transactionsControllers.removeFileFromTransaction);
router.post('/files/:id', transactionsControllers.updateFilesInTransaction);
router.post('/:tid/comments', transactionsControllers.createComment);
router.delete('/:tid/comments/:cid', transactionsControllers.deleteComment);
router.post('/user-transaction', transactionsControllers.createUserTransaction);

module.exports = router;
