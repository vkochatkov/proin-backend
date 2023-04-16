const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function(v) {
        return v === null || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'userId must be a valid ObjectId or null'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'guest'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active'],
    required: true
  }
});

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

module.exports = ProjectMember;
