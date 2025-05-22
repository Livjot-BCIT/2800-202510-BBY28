const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  betPoster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  betTitle:    { type: String, required: true },
  durationValue: { type: Number, required: true },       
  durationUnit:  { type: String,
                   enum: ['hours','days','weeks','months'],
                   required: true },                     
  participants: { type: Number, required: true },
  betType:      { type: String, required: true },
  description:  { type: String },
  privateBet:   { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bet', betSchema);
