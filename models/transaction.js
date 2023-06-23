const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  description: { type: String },
  projectId: { type: String },
  userId: { type: String },
  sum: { type: Number },
  classifier: { type: String },
  id: { type: String },
  timestamp: { type: String },
  type: { type: String },
});

module.exports = mongoose.model('Transaction', transactionSchema);