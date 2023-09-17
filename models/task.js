const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  id: {type: String},
  text: { type: String },
  timestamp: { type: String },
  name: { type: String },
  taskId: { type: mongoose.Types.ObjectId, required: true, ref: 'Task' },
  userId: { type: mongoose.Types.ObjectId },
  mentions: [{ type: String }],
  parentId: { type: String }
});

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
  newValue: { type: String },
  id: { type: mongoose.Types.ObjectId, default: function() { return this._id } }
});

const taskSchema = new Schema({
  taskId: { type: String },
  timestamp: { type: String },
  projectId: { type: mongoose.Types.ObjectId, ref: 'Project'},
  userId: { type: mongoose.Types.ObjectId, ref: 'User'}, 
  status: {
    type: String,
    enum: ['new', 'in progress', 'done', 'canceled'],
    required: true
  },
  description: { type: String },
  name: { type: String },
  files: [{
    name: { type: String }, 
    url: { type: String },
    id: { type: mongoose.Types.ObjectId, default: function() { return this._id } }
  }],
  actions: [actionSchema],
  comments: [commentSchema]
});

module.exports = mongoose.model('Task', taskSchema);
