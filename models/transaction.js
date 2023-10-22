const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  id: { type: String },
  text: { type: String },
  timestamp: { type: String },
  name: { type: String },
  transactionId: { type: mongoose.Types.ObjectId, required: true, ref: 'Transaction' },
  userId: { type: mongoose.Types.ObjectId },
  mentions: [{ type: String }],
  parentId: { type: String },
});

const transactionSchema = new Schema({
  description: { type: String },
  projectId: { type: String },
  userId: { type: String },
  sum: { type: Number },
  classifier: { type: String },
  id: { type: String },
  timestamp: { type: String },
  type: { type: String },
  classifiers: { 
    income: [String],
    expenses: [String],
    transfer: [String],
  },
  files: [{
    width: { type: Number },
    height: { type: Number },
    name: { type: String }, 
    url: { type: String },
    id: { type: mongoose.Types.ObjectId, default: function() { return this._id } }
  }],
  comments: [commentSchema]
});

module.exports = mongoose.model('Transaction', transactionSchema);