// models/Spending.js
const mongoose = require('mongoose');

const spendingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    amount: { type: Number, required: true },
    date: { type: Date, required: true }
});

module.exports = mongoose.model('Spending', spendingSchema);
