// Example backend code (not for frontend JS!)
// filepath: server.js

const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

const dbConfig = {
    host: 'localhost',
    user: 'your_db_user',
    password: 'your_db_password',
    database: 'your_db_name'
};

app.get('/api/group-chat', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT username, message, timestamp, profile_pic AS profilePic FROM group_chat ORDER BY timestamp ASC'
        );
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));