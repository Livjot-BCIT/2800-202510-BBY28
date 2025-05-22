const mongoose = require('mongoose');
require('dotenv').config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;

const mongoUrl = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority`;

mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('✅ Mongoose connected successfully');
});

module.exports = mongoose;
