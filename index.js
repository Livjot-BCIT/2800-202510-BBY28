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

app.use(express.json());

// check if Gemini API key is loadedd
console.log("Gemini API Key:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
/* END secret section */

const { database } = require('./databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');
const betCollection = database.db(mongodb_database).collection('bets');

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));

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

function sessionValidation(req,res,next) {
    if (isValidSession(req)) {
        next();
    }
    else {
        res.redirect('/login');
    }
}
// END Session creation and validation

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
app.get('/', (req, res) => {
    res.render("main", {title: "Challenge Feed", css: "/styles/main.css"});
});

app.get('/main', (req, res) => {
    res.render("main", {title: "Challenge Feed", css: "/styles/main.css"});
});

app.get('/shop', (req, res) => {
    res.render("shop", {title: "In-Game Shop", css: "/styles/shop.css"});
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
    res.render("createBet", {title: "Create a Bet", css: "/styles/createPost.css"});
});

app.get('/money', (req, res) => {
    res.render("money", {title: "Money", css: "/styles/money.css"});
});

app.get('/groups', (req, res) => {
    res.render("groups", {title: "Groups"});
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
	
	const insertResult = await userCollection.insertOne({firstName, lastName, email, password: hashedPassword});
	console.log("Inserted user");
	
	req.session.authenticated = true;
	req.session.email = email;
    req.session.userId = insertResult.insertedId;
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

// 404 Page
app.get(/(.*)/, (req, res, next) => {
    res.status(404);
	res.render("404", {title: "Page Not Found"});
    next();
});

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 