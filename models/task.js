const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const actionSchema = new Schema({
  description: { type: String },
  timestamp: { type: Date, default: Date.now() },
  userId: { type: mongoose.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  userLogo: { type: String },
  name: { type: String },
  userLogo: { type: String },
  field: { type: String },
  oldValue: { type: String },
  newValue: { type: String }
});

const taskSchema = new Schema({
  timestamp: { type: String },
  projectId: { type: mongoose.Types.ObjectId, ref: 'Project'},
  userId: { type: mongoose.Types.ObjectId, ref: 'User'}, 
  status: {
    type: String,
    enum: ['new', 'in progress', 'ready', 'canceled'],
    required: true
  },
  description: { type: String },
  name: { type: String },
  files: [{
    name: { type: String }, 
    url: { type: String }
  }],
  taskId: { type: String },
  actions: [actionSchema]
});

module.exports = mongoose.model('Task', taskSchema);
