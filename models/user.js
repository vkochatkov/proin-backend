const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  name: { 
    type: String, 
  },
  projects: [{ type: mongoose.Types.ObjectId, ref: 'Project' }],
  userLogo: { type: String },
  tasks: [{ type: mongoose.Types.ObjectId, ref: 'Task' }],
  transactions: [{ type: mongoose.Types.ObjectId, ref: 'Transaction'}]
});

// userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
