const { MongoClient } = require('mongodb');

const url = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`;
const dbName =  `${mongodb_database}`;
async function getLeaderboard() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db(dbName);
        const users = await db.collection('users')
            .find({}, { projection: { username: 1, photo: 1, points: 1, _id: 0 } })
            .sort({ points: -1 })
            .limit(10)
            .toArray();
        return users;
    } finally {
        await client.close();
    }
}

module.exports = { getLeaderboard }; 

