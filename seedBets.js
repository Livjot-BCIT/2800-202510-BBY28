require("dotenv").config();
const { MongoClient } = require("mongodb");

async function seedDatabase() {
    const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DATABASE);
        const betsCollection = db.collection("bets");

        // Sample bets using your actual structure
        const sampleBets = [
            {
                betTitle: "Chess Challenge",
                duration: "1 week",
                participants: [],
                betType: "Mental",
                description: "Reach +200 ELO in blitz chess",
                privateBet: false,
                createdAt: new Date()
            },
            {
                betTitle: "Marathon Madness",
                duration: "2 weeks",
                participants: [],
                betType: "Physical",
                description: "Run a total of 50km in two weeks",
                privateBet: false,
                createdAt: new Date()
            },
            {
                betTitle: "No Sugar Challenge",
                duration: "1 month",
                participants: [],
                betType: "Social",
                description: "Avoid all sugary snacks for 30 days",
                privateBet: true,
                createdAt: new Date()
            }
        ];

        await betsCollection.deleteMany({}); // Optional: Clear existing for fresh seed
        await betsCollection.insertMany(sampleBets);
        console.log("✅ Sample bets inserted successfully");
    } catch (error) {
        console.error("❌ Error inserting sample bets:", error);
    } finally {
        await client.close();
    }
}

seedDatabase();
