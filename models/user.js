const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  name: { 
    type: String, 
    // required: true 
  },
  projects: [{ type: mongoose.Types.ObjectId, ref: 'Project' }],
});

// userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
