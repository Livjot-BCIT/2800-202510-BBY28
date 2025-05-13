
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
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

const {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

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
app.get('/', (req, res) => {
    res.render("main");
});

app.get('/main', (req, res) => {
    res.render("main");
});

app.get('/shop', (req, res) => {
    res.render("shop");
});

app.get('/leaderboard', (req, res) => {
    res.render("leaderboard");
});

app.get('/createBet', (req, res) => {   
    res.render("createBet");
});

app.get('/stats', (req, res) => {
    res.render("stats");
});

app.get('/groups', (req, res) => {
    res.render("groups");
});

app.get('/userprofile', (req, res) => {
    res.render("userprofile");
});
// Rendering pages END

// Absolute routes
app.use(express.static(__dirname + "/public"));
app.use('/styles', express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

app.get(/(.*)/, (req, res, next) => {
    res.status(404);
	res.render("404", {navLinks: navLinks});
    next();
});

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 