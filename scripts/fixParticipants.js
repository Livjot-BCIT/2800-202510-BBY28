// scripts/fixParticipants.js
require('dotenv').config();
const mongoose = require('mongoose');
const Bet = require('../models/Bet');

const {
  MONGODB_USER,
  MONGODB_PASSWORD,
  MONGODB_HOST,
  MONGODB_DATABASE
} = process.env;

// build the same URI you use in index.js
const uri = `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DATABASE}?retryWrites=true&w=majority&tls=true`;

(async () => {
  try {
    // 1) connect
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✔️  Connected to MongoDB');

    // 2) find any Bet where `participants` is stored as a number
    //    and convert it into an empty array (you can tweak as needed)
    const result = await Bet.updateMany(
      { participants: { $type: 'number' } },
      { 
        $set: { 
          participants: [], 
          participantCount: 0   // if you also track count separately
        } 
      }
    );

    console.log(`✅ Matched ${result.matchedCount}, modified ${result.modifiedCount} bet(s)`);
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    // 3) disconnect & exit
    await mongoose.disconnect();
    process.exit(0);
  }
})();
