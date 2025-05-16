// testDatabaseConnection.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function testConnection() {
    const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("✅ Connected to MongoDB successfully");
        const db = client.db(process.env.MONGODB_DATABASE);
        const bets = await db.collection("bets").find().toArray();
        console.log("Fetched bets:", bets);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
    } finally {
        await client.close();
    }
}

testConnection();
