require("dotenv").config();
const { MongoClient } = require("mongodb");

async function connectToDatabase() {
    try {
        const mongodb_host = process.env.MONGODB_HOST;
        const mongodb_user = process.env.MONGODB_USER;
        const mongodb_password = process.env.MONGODB_PASSWORD;
        const mongodb_database = process.env.MONGODB_DATABASE;

        const uri = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority`;

        const client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        await client.connect();
        console.log("✅ Connected to the database successfully");

        const db = client.db(mongodb_database);
        return db;
    } catch (error) {
        console.error("❌ Database connection error:", error);
        process.exit(1); // Exit the process if the connection fails
    }
}

module.exports = { connectToDatabase };

