const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const taskSchema = new Schema({
  timestamp: { type: String },
  projectId: { type: mongoose.Types.ObjectId, ref: 'Project'},
  userId: { type: mongoose.Types.ObjectId, ref: 'User'}, 
  status: {
    type: String,
    enum: ['new', 'in progress'],
    required: true
  },
  description: { type: String },
  name: { type: String },
  files: [{
    name: { type: String }, 
    url: { type: String }
  }],
});

module.exports = mongoose.model('Task', taskSchema);
