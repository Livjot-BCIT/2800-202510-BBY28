<<<<<<< HEAD
require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");


const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

/* secret information section */
=======
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { connectToDatabase } from "./databaseConnection.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;

>>>>>>> a5f9906ee50cf406d49ea92a4fb2cbc92d5fb7ff
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
<<<<<<< HEAD

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

const {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');
const betCollection = database.db(mongodb_database).collection('bets');

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority&tls=true`,
	crypto: {
		secret: mongodb_session_secret
	}
})

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

function sessionValidation(req,res,next) {
    if (isValidSession(req)) {
        next();
    }
    else {
        res.redirect('/login');
    }
}

app.get('/nosql-injection', async (req,res) => {
	var username = req.query.user;

	if (!username) {
		res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
		return;
	}
	console.log("user: "+username);

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

	const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

	console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});

// Array of nav links
const navLinks = [
    {name: "Home", link: "/main"},
	{name: "Shop", link: "/shop"},
    {name: "Leaderboard", link: "/leaderboard"},
    {name: "Create Bet", link: "/createBet"},
    {name: "Stats", link: "/stats"},
    {name: "Groups", link: "/groups"},
    {name: "userprofile", link: "/userprofile"}
]

// Middleware to set nav links in locals
app.use((req, res, next) => {
    app.locals.navLinks = navLinks;
    next();
});

// Rendering pages
// Pages on navbar
app.get('/', (req, res) => {
    res.render("main", {title: "Challenge Feed", css: "/styles/main.css"});
});

app.get('/main', (req, res) => {
    res.render("main", {title: "Challenge Feed", css: "/styles/main.css"});
});

app.get('/shop', (req, res) => {
    res.render("shop", {title: "In-Game Shop", css: "/styles/shop.css"});
});

app.get('/leaderboard', (req, res) => {
    res.render("leaderboard", {title: "Leaderboard", css: "/styles/leaderboard.css"});
});

app.get('/createBet', (req, res) => {   
    res.render("createBet", {title: "Create a Bet", css: "/styles/createPost.css"});
});

app.get('/stats', (req, res) => {
    res.render("stats", {title: "Stats"});
});

app.get('/userprofile', (req, res) => {
    res.render("userprofile", {title: "Profile", css: "/styles/userprofile.css"});
});
// END Pages on navbar

// Login/logout authentication
app.get('/login', (req, res) => {
    // If the user is already logged in, redirect to the main page
    if (req.session.authenticated) {
        res.redirect('/main');
        return;
    }

    res.render("login", {title: "Login", css: "/styles/auth.css"});
});

app.post('/loggingin', async (req,res) => {
    var email = req.body.email;
    var password = req.body.password;

	const schema = Joi.string().max(50).required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/login");
	   return;
	}

	const result = await userCollection.find({email: email}).project({firstName: 1, lastName: 1, password: 1, _id: 1}).toArray();

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

app.get('/logout', (req,res) => {
	req.session.destroy();
    res.redirect('/login');
});
// END Login/logout authentication

// Signup authentication
app.get('/signup', (req, res) => { 
    res.render("signup", {title: "Signup", css: "/styles/auth.css"});
});

app.post('/createUser', async (req,res) => {
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
	
	const validationResult = schema.validate({firstName, lastName, email, password});
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/signup");
	   return;
   }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
	
	await userCollection.insertOne({firstName: firstName, lastName: lastName, email: email, password: hashedPassword});
	console.log("Inserted user");
	
	req.session.authenticated = true;
    req.session.email = email;
    req.session.cookie.maxAge = expireTime;

    var html = "successfully created user";
    res.redirect('/main');
});

app.post('/createBet', async (req, res) => {
    var betTitle = req.body.betTitle;
    var duration = req.body.duration;
    var participants = req.body.participants;
    var betType = req.body.betType;
    var description = req.body.description;
    var privateBet = req.body.privateBet ? true : false;
    
    await betCollection.insertOne({
        betTitle: betTitle, duration: duration, participants: participants,
        betType: betType, description: description, privateBet: privateBet
    });

    console.log("Inserted bet")
    res.redirect('/main')
})
// END Signup authentication
// END Rendering pages

// Mock groups data (replace with database query later)
const mockGroups = [
    { 
        _id: '1', 
        title: 'Group Title #1', 
        description: 'A group for people who love sports betting and want to share tips.',
        members: 42,
        type: 'Sports'
    },
    { 
        _id: '2', 
        title: 'Group Title #2', 
        description: 'A group for people who want to save money and share tips on budgeting and cutting expenses. Let\'s support each other in reaching our financial goals!',
        members: 35,
        type: 'Financial'
    },
    { 
        _id: '3', 
        title: 'Group Title #3', 
        description: 'Discussion group for cryptocurrency enthusiasts and investors.',
        members: 28,
        type: 'Crypto'
    }
];

// Groups page - List all available groups
app.get('/groups', (req, res) => {
    // In a real app, you would fetch groups from your database
    res.render("groups", {
        title: "Groups", 
        css: "/styles/groups.css",
        groups: mockGroups
    });
});

// View group details
app.get('/group-details/:id', (req, res) => {
    const groupId = req.params.id;
    const group = mockGroups.find(g => g._id === groupId);
    
    if (!group) {
        return res.status(404).send("Group not found");
    }
    
    res.render("group-details", {
        title: group.title,
        css: "/styles/groupDescription.css",
        group
    });
});

// Join a group
app.get('/join-group/:id', (req, res) => {
    const groupId = req.params.id;
    const group = mockGroups.find(g => g._id === groupId);
    
    if (!group) {
        return res.status(404).send("Group not found");
    }
    
    // In a real app, you would add the user to the group members in the database
    // For now, we'll just redirect to the group chat page
    
    // Store the group ID in the session so we know which group the user is in
    req.session.currentGroupId = groupId;
    
    res.redirect(`/group-chat/${groupId}`);
});

// Group chat page - After joining a group
app.get('/group-chat/:id', (req, res) => {
    const groupId = req.params.id;
    const group = mockGroups.find(g => g._id === groupId);
    
    if (!group) {
        return res.status(404).send("Group not found");
    }
    
    // In a real app, check if the user is actually a member of this group
    
    res.render("group_chat", {
        title: `Chat - ${group.title}`,
        css: "/styles/style-group-chat.css",
        group
    });
});

// Create group page
app.get('/create-group', (req, res) => {
    res.render("create-group", {
        title: "Create a Group",
        css: "/styles/createGroup.css"
    });
});

// Process group creation
app.post('/create-group', (req, res) => {
    // In a real app, you would save the new group to your database
    // For now, we'll just redirect back to the groups page
    res.redirect('/groups');
});

// Match leaderboard - View results of a specific bet
app.get('/match-leaderboard/:id', async (req, res) => {
    try {
        const betId = req.params.id;
        
        // Find the bet in the database
        const bet = await betCollection.findOne({_id: new ObjectId(betId)});
        
        if (!bet) {
            return res.status(404).send("Bet not found");
        }
        
        // For this example, I'll create mock results
        // In a real implementation, you would fetch actual results from your database
        const results = [
            {
                userId: '1',
                username: 'Champion123',
                points: 200,
                pointsGained: 600, // x3 multiplier
                position: 1,
                profilePic: '/images/profilePic.jpg'
            },
            {
                userId: '2',
                username: 'SilverPlayer',
                points: 150,
                pointsGained: 300, // x2 multiplier
                position: 2,
                profilePic: '/images/profilePic.jpg'
            },
            {
                userId: '3',
                username: 'BronzeStar',
                points: 120,
                pointsGained: 180, // x1.5 multiplier
                position: 3,
                profilePic: '/images/profilePic.jpg'
            },
            {
                userId: '4',
                username: 'FourthPlace',
                points: 100,
                pointsGained: 100,
                position: 4,
                profilePic: '/images/profilePic.jpg'
            },
            {
                userId: '5',
                username: 'FifthUser',
                points: 80,
                pointsGained: 80,
                position: 5,
                profilePic: '/images/profilePic.jpg'
            }
        ];
        
        // In a real app, check if the current user participated
        // and get their result
        let userResult = null;
        if (req.session.authenticated) {
            // This is where you would find the user's result
            // For this example, let's assume the user is the 4th place participant
            userResult = results[3]; // Fourth place user
        }
        
        res.render("match_leaderboard", {
            title: `Results - ${bet.betTitle}`,
            css: "/styles/match_leaderboard.css",
            bet,
            results,
            userResult
        });
    } catch (error) {
        console.error("Error fetching bet results:", error);
        res.status(500).send("Error loading bet results");
    }
});

// In a real app, you'd also want an API endpoint to fetch results dynamically
app.get('/api/bet-results/:id', async (req, res) => {
    try {
        const betId = req.params.id;
        
        // Here you would fetch real results from your database
        // For this example, we'll return mock data
        
        const results = [
            // Same mock data as above
        ];
        
        res.json({ success: true, results });
    } catch (error) {
        console.error("API error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch results" });
    }
});

// Add this before your 404 route handler
app.get('/mockup-leaderboard', async (req, res) => {
    try {
        // Create a mock bet object
        const mockBet = {
            _id: 'mockup123',
            betTitle: 'Weekly Weight Loss Challenge',
            description: 'Participants compete to lose the most weight percentage in 7 days. The winner gets triple points!',
            duration: '7 days',
            betType: 'Fitness',
            participants: 12,
            privateBet: false
        };
        
        // Mock results data
        const mockResults = [
            {
                userId: '1',
                username: 'FitnessFanatic',
                points: 350,
                pointsGained: 1050, // x3 multiplier
                position: 1,
                profilePic: '/images/icons/profilePic.jpg'
            },
            {
                userId: '2',
                username: 'GymRat1992',
                points: 280,
                pointsGained: 560, // x2 multiplier
                position: 2,
                profilePic: '/images/icons/profilePic.jpg'
            },
            {
                userId: '3',
                username: 'HealthyEater',
                points: 220,
                pointsGained: 330, // x1.5 multiplier
                position: 3,
                profilePic: '/images/icons/profilePic.jpg'
            },
            {
                userId: '4',
                username: 'WeightDropper',
                points: 190,
                pointsGained: 190,
                position: 4,
                profilePic: '/images/icons/profilePic.jpg'
            },
            {
                userId: '5',
                username: 'JoggingJunkie',
                points: 170,
                pointsGained: 170,
                position: 5,
                profilePic: '/images/icons/profilePic.jpg'
            },
            {
                userId: '6',
                username: 'SlimmerNow',
                points: 150,
                pointsGained: 150,
                position: 6,
                profilePic: '/images/icons/profilePic.jpg'
            },
            {
                userId: '7',
                username: 'GettingHealthy',
                points: 130,
                pointsGained: 130,
                position: 7,
                profilePic: '/images/icons/profilePic.jpg'
            }
        ];
        
        // Mock current user's result (assume they are logged in)
        const mockUserResult = {
            userId: '4',
            username: 'WeightDropper',
            points: 190,
            pointsGained: 190,
            position: 4,
            profilePic: '/images/icons/profilePic.jpg'
        };
        
        res.render("match_leaderboard", {
            title: "Mockup Leaderboard",
            css: "/styles/match_leaderboard.css",
            bet: mockBet,
            results: mockResults,
            userResult: mockUserResult
        });
    } catch (error) {
        console.error("Error showing mockup leaderboard:", error);
        res.status(500).send("Error showing mockup");
    }
});

// Absolute routes
app.use(express.static(__dirname + "/public"));
app.use('/styles', express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

// 404 Page
app.get(/(.*)/, (req, res, next) => {
    res.status(404);
	res.render("404", {title: "Page Not Found"});
    next();
});

app.listen(port, () => {
	console.log("Node application listening on port "+port);
});
=======
const node_session_secret = process.env.NODE_SESSION_SECRET;
const gemini_api_key = process.env.GEMINI_API_KEY;
// At the top with other initializations
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* Initialize Gemini AI */
const ai = new GoogleGenerativeAI({
	apiKey: gemini_api_key
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// At the top of your index.js, after dotenv.config()
console.log("Gemini API Key:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
/* Navbar Links */
const navLinks = [
	{ name: "Home", link: "/main" },
	{ name: "Shop", link: "/shop" },
	{ name: "Leaderboard", link: "/leaderboard" },
	{ name: "Create Bet", link: "/createBet" },
	{ name: "Stats", link: "/stats" },
	{ name: "Groups", link: "/groups" },
	{ name: "Profile", link: "/userprofile" },
	{ name: "Financials", link: "/money" }
];

/* Dynamic Navbar Middleware */
app.use((req, res, next) => {
	res.locals.navLinks = navLinks;
	next();
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
		const prompt = `Provide concise financial advice (under 200 characters) for someone with $${amount} who wants to follow this plan: Spend ${spendPercent}% and Save ${savePercent}%. Include practical tips.`;

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

/* Static Files */
app.use(express.static(path.join(__dirname, "public")));
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use("/images", express.static(path.join(__dirname, "images")));

/* View Engine Setup */
app.set("view engine", "ejs");

/* Session Configuration */
app.use(
	session({
		secret: node_session_secret,
		store: MongoStore.create({
			mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority`,
			crypto: {
				secret: mongodb_session_secret
			}
		}),
		saveUninitialized: false,
		resave: false,
		cookie: {
			maxAge: 24 * 60 * 60 * 1000,
			secure: false
		}
	})
);
/* Separate Routes for Each Page */
app.get("/main", async (req, res) => {
	try {
		// Connect to the database and get the "bets" collection
		const db = await connectToDatabase();
		const betsCollection = db.collection("bets");

		// Fetch all bets
		const bets = await betsCollection.find().toArray();

		// Render the main page with the fetched bets
		res.render("main", {
			title: "Challenge Feed",
			css: "/styles/main.css",
			bets: bets,
			activeLink: "/main", // Ensure active link is set
			navLinks: navLinks   // Pass the nav links to the template
		});

	} catch (error) {
		console.error("Error fetching bets:", error.message);
		res.status(500).send("Error loading bets");
	}
});




app.get("/shop", (req, res) => {
	res.render("shop", { title: "In-Game Shop", css: "/styles/shop.css", activeLink: "/shop" });
});

app.get("/leaderboard", (req, res) => {
	res.render("leaderboard", { title: "Leaderboard", css: "/styles/leaderboard.css", activeLink: "/leaderboard" });
});

app.get("/createBet", (req, res) => {
	res.render("createBet", { title: "Create Bet", css: "/styles/createBet.css", activeLink: "/createBet" });
});

app.get("/stats", (req, res) => {
	res.render("stats", { title: "Stats", css: "/styles/stats.css", activeLink: "/stats" });
});

app.get("/groups", (req, res) => {
	res.render("groups", { title: "Groups", css: "/styles/groups.css", activeLink: "/groups" });
});

app.get("/userprofile", (req, res) => {
	res.render("userprofile", { title: "User Profile", css: "/styles/userprofile.css", activeLink: "/userprofile" });
});

app.get("/money", (req, res) => {
	res.render("money", { title: "Your Financials", css: "/styles/money.css", activeLink: "/money" });
});

app.get("/money", (req, res) => {
	res.render("money", {
		title: "Your Financials",
		css: "/styles/money.css"
	});
});

app.get("/signup", (req, res) => {
	res.render("signup", {
		title: "Signup",
		css: "/styles/auth.css",
		activeLink: "/signup",
		navLinks: navLinks
	});
});

/* Route: Login */
app.get("/login", (req, res) => {
	if (req.session.authenticated) {
		res.redirect("/main");
		return;
	}
	res.render("login", {
		title: "Login",
		css: "/styles/auth.css",
		activeLink: "/login",
		navLinks: navLinks
	});
});

/* Route: Login */
app.get("/login", (req, res) => {
	res.render("login", {
		title: "Login",
		css: "/styles/auth.css"
	});
});


/* Page Routes */
const pages = [
	"main",
	"shop",
	"leaderboard",
	"createBet",
	"stats",
	"groups",
	"userprofile",
	"money"
];

pages.forEach(page => {
	app.get(`/${page}`, (req, res) => {
		res.render(page, {
			title: page.charAt(0).toUpperCase() + page.slice(1),
			css: `/styles/${page}.css`
		});
	});
});

/* 404 Page Not Found */
app.use((req, res) => {
	res.status(404).render("404", { title: "Page Not Found" });
});

/* Start Server */
app.listen(port, () => {
	console.log(`🚀 Server running at: http://localhost:${port}`);
});
>>>>>>> a5f9906ee50cf406d49ea92a4fb2cbc92d5fb7ff
