const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const projectSchema = new Schema({
  projectName: { type: String },
  description: { type: String },
  logoUrl: { type: String },
  comments: [{ type: mongoose.Types.ObjectId, ref: 'Comment' }],
  creator: { type: mongoose.Types.ObjectId, required: true, ref: 'User' }
});

module.exports = mongoose.model('Project', projectSchema);
