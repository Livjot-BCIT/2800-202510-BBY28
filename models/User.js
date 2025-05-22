const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName:  String,
  email:     { type: String, required: true, unique: true },
  password:  String,
  points:    { type: Number, default: 0 },
  dateJoined:{ type: Date,   default: Date.now },
  profilePictureUrl: String,

  createdGroups:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  joinedGroups:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  participatedBets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bet' }],
  createdBets:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bet' }]
});

module.exports = mongoose.model('User', userSchema);
