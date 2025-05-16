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
