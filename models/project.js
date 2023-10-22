const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const projectSchema = new Schema({
  projectName: { type: String },
  description: { type: String },
  logoUrl: { type: String },
  comments: [{ type: mongoose.Types.ObjectId, ref: 'Comment' }],
  creator: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  invitations: [{
    invitationId: String,
    email: String
  }],
  sharedWith: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
  subProjects: [{ type: mongoose.Types.ObjectId , ref: 'Project' }],
  parentProject: { type: mongoose.Types.ObjectId, ref: 'Project' },
  files: [{
    name: { type: String }, 
    url: { type: String },
    width: { type: Number},
    height: { type: Number }
  }],
  tasks: [{ type: mongoose.Types.ObjectId, ref: 'Task' }],
  transactions: [{ type: mongoose.Types.ObjectId, ref: 'Transaction'}],
  classifiers: { 
    income: [String],
    expenses: [String],
    transfer: [String],
  },
  timestamp: { type: String }
});

module.exports = mongoose.model('Project', projectSchema);
