const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  text: { type: String },
  timestamp: { type: String },
  name: { type: String },
  projectId: { type: mongoose.Types.ObjectId, required: true, ref: 'Project' },
  userId: { type: mongoose.Types.ObjectId }
});

module.exports = mongoose.model('Comment', commentSchema);
