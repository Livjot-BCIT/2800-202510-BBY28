require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const { fileURLToPath } = require('url');

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

const gemini_api_key = process.env.GEMINI_API_KEY;
// At the top with other initializations
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* Initialize Gemini AI */
const ai = new GoogleGenerativeAI({
	apiKey: gemini_api_key
});


/* Initialize Server for group chat */
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);

// Initialize rooms collection to store chat data
const rooms = {};

// Socket.IO connection handling
io.on('connection', socket => {
  /* Join a room (group) */
  socket.on('join-group', (groupId, userId) => {
    /* Initialize room if it doesn't exist */
    if (!rooms[groupId]) {
      rooms[groupId] = { users: {} };
    }
    
    socket.join(groupId);
    
    /* Get user info from database and store it */
    getUserInfo(userId).then(user => {
      const username = `${user.firstName} ${user.lastName}`;
      rooms[groupId].users[socket.id] = { 
        id: userId,
        name: username
      };
      
      /* Notify others that user has joined */
      socket.to(groupId).emit('user-connected', username);
    });
  });
  
  /* Handle chat messages */
  socket.on('send-chat-message', (groupId, message) => {
    const room = rooms[groupId];
    if (room && room.users[socket.id]) {
      socket.to(groupId).emit('chat-message', { 
        message: message, 
        name: room.users[socket.id].name 
      });
      
      /* Save message to database */
      saveMessageToDb(groupId, room.users[socket.id].id, message);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // Find all rooms the user was in
    getUserRooms(socket).forEach(groupId => {
      const username = rooms[groupId].users[socket.id]?.name;
      if (username) {
        socket.to(groupId).emit('user-disconnected', username);
        delete rooms[groupId].users[socket.id];
      }
    });
  });
});

/* Helper function to get rooms a user is in */
function getUserRooms(socket) {
  return Object.entries(rooms).reduce((groups, [groupId, room]) => {
    if (room.users[socket.id] != null) groups.push(groupId);
    return groups;
  }, []);
}

// Helper function to get user info from the database
async function getUserInfo(userId) {
  try {
    return await userCollection.findOne({ _id: new ObjectId(userId) });
  } catch (error) {
    console.error("Error fetching user:", error);
    return { firstName: "Anonymous", lastName: "User" };
  }
}

// Helper function to save messages to database
async function saveMessageToDb(groupId, userId, message) {
  try {
    const messageCollection = database.db(mongodb_database).collection('groupMessages');
    await messageCollection.insertOne({
      groupId: groupId,
      userId: userId,
      message: message,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error saving message:", error);
  }
}


// END Initialize Server for group chat

app.use(express.json());

// check if Gemini API key is loadedd
console.log("Gemini API Key:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");

const { database } = require('./databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');
const betCollection = database.db(mongodb_database).collection('bets');
const groupCollection = database.db(mongodb_database).collection('groups');

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority&tls=true`,
	crypto: {
		secret: mongodb_session_secret
	},
	dbName: mongodb_database,
	collectionName: 'sessions'
})

// Session creation and validation
app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false,
	resave: true
}
));

function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	}
	return false;
}

function sessionValidation(req, res, next) {
	if (isValidSession(req)) {
		next();
	}
	else {
		res.redirect('/login');
	}
}
// END Session creation and validation

app.get('/nosql-injection', async (req, res) => {
	var username = req.query.user;

	if (!username) {
		res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
		return;
	}
	console.log("user: " + username);

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);

	//If we didn't use Joi to validate and check for a valid URL parameter below
	// we could run our userCollection.find and it would be possible to attack.
	// A URL parameter of user[$ne]=name would get executed as a MongoDB command
	// and may result in revealing information about all users or a successful
	// login without knowing the correct password.
	if (validationResult.error != null) {
		console.log(validationResult.error);
		res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
		return;
	}

	const result = await userCollection.find({ username: username }).project({ username: 1, password: 1, _id: 1 }).toArray();

	console.log(result);

	res.send(`<h1>Hello ${username}</h1>`);
});

// Array of nav links
const navLinks = [
    {name: "Home", link: "/main"},
	{name: "Shop", link: "/shop"},
    {name: "Leaderboard", link: "/leaderboard"},
    {name: "Create Bet", link: "/createBet"},
    {name: "Money", link: "/money"},
    {name: "Groups", link: "/groups"},
    {name: "userprofile", link: "/userprofile"}
]

// Middleware to set nav links in locals
app.use((req, res, next) => {
	app.locals.navLinks = navLinks;
	next();
});

// Absolute routes
app.use(express.static(__dirname + "/public"));
app.use('/styles', express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

// Rendering pages
// Pages on navbar
app.get('/', async (req, res) => {
    try {
        const bets = await betCollection.find({}).toArray();
        res.render("main", {
            title: "Challenge Feed",
            css: "/styles/main.css",
            bets: bets
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading bets");
    }
});

app.get('/main', async (req, res) => {
    try {
        const bets = await betCollection.find({}).toArray();
        res.render("main", {
            title: "Challenge Feed",
            css: "/styles/main.css",
            bets: bets
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading bets");
    }
});

app.get('/shop', (req, res) => {
	res.render("shop", { title: "In-Game Shop", css: "/styles/shop.css" });
});

const { ObjectId } = require('mongodb');

app.get('/leaderboard', async (req, res) => {
	try {
        // Adjust the projection and sorting as needed for your leaderboard
        const users = await userCollection.find({})
            .project({ firstName: 1, lastName: 1, points: 1, _id: 0 }) // Add fields you want to show
			.sort({ points: -1 })
            .toArray();

		const topThree = users.slice(0, 3);
		const otherUsers = users.slice(3);

		const userId = req.session.userId;
		let currentUser = null;
		let position = null;

		if (userId) {
			currentUser = await userCollection.findOne(
				{ _id: new ObjectId(userId) },
				{ projection: { firstName: 1, lastName: 1, points: 1 } }
			);

			if (currentUser) {
				position = await userCollection.countDocuments({ points: { $gt: currentUser.points } });
				position = position + 1;
			}
		}

		console.log("Session data:", req.session);

        res.render("leaderboard", {
            title: "Leaderboard",
            css: "/styles/leaderboard.css",
			topThree: topThree,
            users: otherUsers,
			currentUser: currentUser,
			currentPosition: position
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading leaderboard");
    }
});

app.get('/createBet', (req, res) => {
	res.render("createBet", { title: "Create a Bet", css: "/styles/createPost.css" });
});

app.get('/match-history', (req, res) => {
    res.render('match_history', { title: "Bets", css: "/styles/match_history.css" });
});

app.get('/money', (req, res) => {
    res.render("money", {title: "Money", css: "/styles/money.css"});
});

// Replace the existing leaderboard-match route with this:
app.get('/leaderboard-match', (req, res) => {
    // Hardcoded match data
    const matchData = {
        date: "12/12/30",
        creator: "user123",
        title: "GET A 8 HOUR SLEEP EVERY DAY FOR A WEEK",
        description: "I've been feeling tired lately, so I made this challenge to help me fix my sleep schedule. Let's try getting 8 full hours every night for one week!",
        timeRemaining: "3 days and 30 minutes",
        participants: [
            { rank: "1st", name: "VictorDih", points: 1000, multiplier: "x2!!!" },
            { rank: "2nd", name: "user123", points: 520, multiplier: "x1.75" },
            { rank: "3rd", name: "terrariagamb", points: 500, multiplier: "x1.5" },
            { rank: "4th", name: "user", points: 300, multiplier: "x1.3" },
            { rank: "5th", name: "anon", points: 300, multiplier: "x1" },
            { rank: "6th", name: "op13", points: 200, multiplier: "x1" },
            { rank: "7th", name: "betterme", points: 200, multiplier: "x1" },
            { rank: "8th", name: "rororo", points: 100, multiplier: "x1" },
            { rank: "9th", name: "ohnoimlast", points: 50, multiplier: "x1" }
        ]
    };
    
    res.render('leaderboard_match', {
        title: "Match Leaderboard", 
        css: "/styles/leaderboard_match.css",
        match: matchData
    });
});



/* Financial Advice Route (Gemini 2.0 Flash) */
app.post("/api/financial-advice", async (req, res) => {
	try {
		const { amount, plan } = req.body;

		// Validation
		if (!amount || isNaN(amount) || amount <= 0) {
			return res.status(400).json({ error: "Please enter a valid amount" });
		}

		if (!plan) {
			return res.status(400).json({ error: "Please select a financial plan" });
		}

		const match = plan.match(/(\d+)% Spend \/ (\d+)% Save/);
		if (!match) {
			return res.status(400).json({ error: "Invalid plan format" });
		}

		const [_, spendPercent, savePercent] = match;

		// Create prompt
		const prompt = `Provide concise financial advice (under 200 characters) for someone with $
						${amount} who wants to follow this plan: Spend ${spendPercent}% and Save 
						${savePercent}%. Include practical tips.`;

		// Get AI response
		const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		res.json({
			advice: text,
			plan,
			amount: parseFloat(amount).toFixed(2)
		});

	} catch (error) {
		console.error("AI Error:", error);
		res.status(500).json({
			error: "Failed to generate financial advice",
			details: error.message
		});
	}
});

app.get('/groups', (req, res) => {
	res.render("groups", { title: "Groups" });
});

// Group chat route - display a specific group's chat
app.get('/group/:id', sessionValidation, async (req, res) => {
    try {
        const groupId = req.params.id;
        
        // Fetch group details from database
        const group = await groupCollection.findOne({ _id: new ObjectId(groupId) });
        
        if (!group) {
            return res.status(404).render("404", { title: "Group Not Found" });
        }
        
        // Count members (could be stored in the group document)
        const memberCount = group.members?.length || 0;
        
        res.render('group_chat', {
            title: group.title,
            css: "/styles/group_chat.css",
            group: {
                _id: group._id.toString(),
                title: group.title,
                description: group.description || "No description available",
                memberCount: memberCount
            },
            userId: req.session.userId
        });
    } catch (err) {
        console.error("Error loading group:", err);
        res.status(500).send("Error loading group");
    }
});

// API endpoint to fetch previous messages
app.get('/api/group-messages/:groupId', sessionValidation, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const messageCollection = database.db(mongodb_database).collection('groupMessages');
        
        // Get messages for this group, sorted by timestamp
        const messages = await messageCollection.find({ groupId: groupId })
            .sort({ timestamp: 1 })
            .limit(50) // Limit to last 50 messages
            .toArray();
            
        // Fetch user details for each message
        const messagesWithUserNames = await Promise.all(messages.map(async msg => {
            let userName = "Unknown User";
            try {
                const user = await userCollection.findOne({ _id: new ObjectId(msg.userId) });
                if (user) {
                    userName = `${user.firstName} ${user.lastName}`;
                }
            } catch (e) {
                console.error("Error getting username:", e);
            }
            
            return {
                userId: msg.userId,
                userName: userName,
                message: msg.message,
                timestamp: msg.timestamp
            };
        }));
        
        res.json(messagesWithUserNames);
    } catch (err) {
        console.error("Error loading messages:", err);
        res.status(500).json({ error: "Failed to load messages" });
    }
});

//make sample data
const sampleGroups = require('./scripts/sampleGroups.js');
app.get('/makeGroupData', async (req, res) => {
	try {
		const groupCollection = database.db(mongodb_database).collection('groups');
		const existing = await groupCollection.countDocuments();

		if (existing === 0) {
			await groupCollection.insertMany(sampleGroups);
		}
	} catch (err) {
		console.error(err);
	} finally {
		res.end();
	}
});


app.get('/groupList', (req, res) => {
	res.render("groupList", {
		title: "Groups",
		css: "/styles/groupList.css"
	});
});

// API route to get all groups
app.get('/api/groups', async (req, res) => {
    try {
        const groups = await groupCollection.find({}).toArray();
        
        // Format the groups for the frontend
        const formattedGroups = groups.map(group => {
            return {
                _id: group._id,
                title: group.title,
                description: group.description,
                memberCount: group.members ? group.members.length : 0,
                category: group.category || 'Uncategorized'
            };
        });
        
        res.json(formattedGroups);
    } catch (err) {
        console.error("Error fetching groups:", err);
        res.status(500).json({ error: "Failed to load groups" });
    }
});

app.get('/userprofile', (req, res) => {
	res.render("userprofile", { title: "Profile", css: "/styles/userprofile.css" });
});
// END Pages on navbar

// Login/logout authentication
app.get('/login', (req, res) => {
	// If the user is already logged in, redirect to the main page
	if (req.session.authenticated) {
		res.redirect('/main');
		return;
	}

	res.render("login", { title: "Login", css: "/styles/auth.css" });
});

app.post('/loggingin', async (req, res) => {
	var email = req.body.email;
	var password = req.body.password;

	const schema = Joi.string().max(50).required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
		console.log(validationResult.error);
		res.redirect("/login");
		return;
	}

	const result = await userCollection.find({ email: email }).project({ firstName: 1, lastName: 1, password: 1, _id: 1 }).toArray();

	console.log(result);
	if (result.length != 1) {
		console.log("user not found");
		res.redirect("/login");
		return;
	}
	if (await bcrypt.compare(password, result[0].password)) {
		console.log("correct password");
		req.session.authenticated = true;
		req.session.email = email;
		req.session.userId = result[0]._id;
		req.session.cookie.maxAge = expireTime;

		res.redirect('/main');
		return;
	}
	else {
		console.log("incorrect password");
		res.redirect("/login");
		return;
	}
});

app.use('/loggedin', sessionValidation);

app.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect('/login');
});
// END Login/logout authentication

// Signup authentication
app.get('/signup', (req, res) => {
	res.render("signup", { title: "Signup", css: "/styles/auth.css" });
});

app.post('/createUser', async (req, res) => {
	var firstName = req.body.firstName;
	var lastName = req.body.lastName;
	var email = req.body.email;
	var password = req.body.password;

	const schema = Joi.object(
		{
			firstName: Joi.string().alphanum().max(20).required(),
			lastName: Joi.string().alphanum().max(20).required(),
			email: Joi.string().email().max(50).required(),
			password: Joi.string().max(20).required()
		});

	const validationResult = schema.validate({ firstName, lastName, email, password });
	if (validationResult.error != null) {
		console.log(validationResult.error);
		res.redirect("/signup");
		return;
	}

    var hashedPassword = await bcrypt.hash(password, saltRounds);
	
	const insertResult = await userCollection.insertOne({firstName, lastName, email, password: hashedPassword});
	console.log("Inserted user");
	
	req.session.authenticated = true;
	req.session.email = email;
    req.session.userId = insertResult.insertedId;
    req.session.cookie.maxAge = expireTime;

	req.session.authenticated = true;
	req.session.email = email;
	req.session.cookie.maxAge = expireTime;

	var html = "successfully created user";
	res.redirect('/main');
});

// Create a new bet (post)
app.post('/createBet', async (req, res) => {
	var betPoster = req.session.userId;
    var betTitle = req.body.betTitle;
    var duration = req.body.duration;
    var participants = req.body.participants;
    var betType = req.body.betType;
    var description = req.body.description;
    var privateBet = req.body.privateBet ? true : false;
    
    await betCollection.insertOne({
        betPoster: betPoster, betTitle: betTitle, duration: duration, participants: participants,
        betType: betType, description: description, privateBet: privateBet
    });

    console.log("Inserted bet")
    res.redirect('/main')
});
// END Signup authentication
// END Rendering pages


// Database initialization route
app.get('/setup-database', async (req, res) => {
    try {
        // Create/ensure collections exist
        const collections = ['users', 'bets', 'groups', 'groupMessages'];
        const db = database.db(mongodb_database);
        
        // Get list of existing collections
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);
        
        // Create collections that don't exist
        for (const collection of collections) {
            if (!existingNames.includes(collection)) {
                await db.createCollection(collection);
                console.log(`Created collection: ${collection}`);
            }
        }
        
        // Initialize sample data if collections are empty
        const groupCollection = db.collection('groups');
        const groupCount = await groupCollection.countDocuments();
        
        if (groupCount === 0) {
            const sampleGroups = require('./scripts/sampleGroups.js');
            await groupCollection.insertMany(sampleGroups);
            console.log('Sample group data created');
        }
        
        res.send('Database setup complete. Collections created and initialized.');
    } catch (error) {
        console.error('Database setup error:', error);
        res.status(500).send('Error setting up database: ' + error.message);
    }
});

// 404 Page
app.get(/(.*)/, (req, res, next) => {
	res.status(404);
	res.render("404", { title: "Page Not Found" });
	next();
});

// Use server.listen instead of app.listen at the end of your file
server.listen(port, () => {
  console.log("Node application listening on port " + port);
});
