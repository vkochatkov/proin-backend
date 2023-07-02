const express = require('express');

const transactionsControllers = require('../controllers/transactions-controllers');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.use(checkAuth);

router.post('/transaction/', transactionsControllers.createTransaction);
router.patch('/transaction/:id', transactionsControllers.updateTransaction);
router.delete('/transaction/:id', transactionsControllers.deleteTransaction);
router.get('/transaction/:id', transactionsControllers.getTransactionById);
router.get('/project/:pid', transactionsControllers.getProjectTransactions);
router.patch('/project/:pid', transactionsControllers.updateTransactionsByProjectId);

module.exports = router;
