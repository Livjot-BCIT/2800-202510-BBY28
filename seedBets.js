require("dotenv").config();
const { MongoClient } = require("mongodb");

async function seedDatabase() {
    const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DATABASE);
        const betsCollection = db.collection("bets");

        // Sample bets
        const sampleBets = [
            {
                title: "Chess Challenge",
                duration: "1 week",
                participants: 2,
                type: "mental",
                description: "Get 200 more ELO"
            },
            {
                title: "Marathon Madness",
                duration: "2 weeks",
                participants: 10,
                type: "physical",
                description: "Run 50 kilometers in two weeks"
            },
            {
                title: "No Sugar Challenge",
                duration: "1 month",
                participants: 5,
                type: "diet",
                description: "Avoid all sugary foods for one month"
            }
        ];

        // Insert sample bets
        await betsCollection.insertMany(sampleBets);
        console.log("✅ Sample bets inserted successfully");
    } catch (error) {
        console.error("❌ Error inserting sample bets:", error);
    } finally {
        await client.close();
    }
}

seedDatabase();
