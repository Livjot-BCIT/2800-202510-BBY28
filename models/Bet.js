const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  betPoster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  betTitle:    { type: String, required: true },
  durationValue: { type: Number, required: true },       
  durationUnit:  { type: String,
                   enum: ['hours','days','weeks','months'],
                   required: true },                     
  participantCount: { type: Number, default: 0 },                 
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  betType:      { type: String, required: true },
  description:  { type: String },
  privateBet:   { type: Boolean, default: false },
  notice:         { type: String, default: '' },
  createdAt:    { type: Date, default: Date.now },
  startedAt:   { type: Date }    
});

module.exports = mongoose.model('Bet', betSchema);
