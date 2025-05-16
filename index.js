
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

// 1. import multer
const multer = require('multer');
const path = require('path');

// 2. configure storage
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'public/images/uploads');
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const name = Date.now() + ext;
		cb(null, name);
	}
});

// 3. create upload instance
const upload = multer({ storage: storage });

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

const { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');
const betCollection = database.db(mongodb_database).collection('bets');

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

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

function sessionValidation(req, res, next) {
	if (isValidSession(req)) {
		next();
	}
	else {
		res.redirect('/login');
	}
}

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
	{ name: "Home", link: "/main" },
	{ name: "Shop", link: "/shop" },
	{ name: "Leaderboard", link: "/leaderboard" },
	{ name: "Create Bet", link: "/createBet" },
	{ name: "Stats", link: "/stats" },
	{ name: "Groups", link: "/groups" },
	{ name: "userprofile", link: "/userprofile" }
]

// Middleware to set nav links in locals
app.use((req, res, next) => {
	app.locals.navLinks = navLinks;
	next();
});

// Rendering pages
// Pages on navbar
app.get('/', (req, res) => {
	res.render("main", { title: "Challenge Feed", css: "/styles/main.css" });
});

app.get('/main', (req, res) => {
	res.render("main", { title: "Challenge Feed", css: "/styles/main.css" });
});

app.get('/shop', (req, res) => {
	res.render("shop", { title: "In-Game Shop", css: "/styles/shop.css" });
});

app.get('/leaderboard', (req, res) => {
	res.render("leaderboard", { title: "Leaderboard", css: "/styles/leaderboard.css" });
});

app.get('/createBet', (req, res) => {
	res.render("createBet", { title: "Create a Bet", css: "/styles/createPost.css" });
});

app.get('/stats', (req, res) => {
	res.render("stats", { title: "Stats" });
});

// app.get('/groups', (req, res) => {
// 	res.render("groups", { title: "Groups" });
// });

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


app.get('/groups', (req, res) => {
	res.render("groups", {
		title: "Groups",
		css: "/styles/groups.css"
	});
});

const groupCollection = database.db(mongodb_database).collection('groups');

app.get('/api/groups', async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = 6;
	const skip = (page - 1) * limit;

	try {
		const groups = await groupCollection.find({})
			.project({ name: 1, description: 1, type: 1, memberCount: 1, image: 1 })
			.skip(skip)
			.limit(limit)
			.toArray();


		res.json(groups);
	} catch (err) {
		console.error("Failed to fetch paginated groups:", err);
		res.status(500).json({ error: "Failed to fetch group data" });
	}
});

app.post('/api/createGroup', upload.single('groupImage'), async (req, res) => {
	try {
		const { groupName, groupDescription, groupType } = req.body;
		const imagePath = req.file ? '/images/uploads/' + req.file.filename : '/images/example.jpg';

		await groupCollection.insertOne({
			name: groupName,
			description: groupDescription,
			type: groupType,
			image: imagePath,
			memberCount: 0
		});

		res.sendStatus(200);
	} catch (err) {
		console.error('Error creating group:', err);
		res.status(500).send('Failed to create group.');
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

	await userCollection.insertOne({ firstName: firstName, lastName: lastName, email: email, password: hashedPassword });
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

// Absolute routes
app.use(express.static(__dirname + "/public"));
app.use('/styles', express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

// 404 Page
app.get(/(.*)/, (req, res, next) => {
	res.status(404);
	res.render("404", { title: "Page Not Found" });
	next();
});

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 