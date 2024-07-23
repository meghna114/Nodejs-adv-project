const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  googleId: String,
  username: String,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
