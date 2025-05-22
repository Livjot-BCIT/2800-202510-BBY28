const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: String,
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bet' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', groupSchema);
