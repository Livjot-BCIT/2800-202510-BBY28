require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 12;
const Joi = require("joi");
const path = require("path");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("./models/User");
const Bet = require("./models/Bet");
const Group = require("./models/Group");

const {
  MONGODB_USER,
  MONGODB_PASSWORD,
  MONGODB_HOST,
  MONGODB_DATABASE,
  MONGODB_SESSION_SECRET,
  NODE_SESSION_SECRET,
  GEMINI_API_KEY,
} = process.env;

const app = express();
const port = process.env.PORT || 3000;
const expireTime = 24 * 60 * 60 * 1000; // 1 day

// Gemini AI init (if you need it)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// body‑parsing & view engine
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

mongoose.set("debug", true);
// ─── connect to MongoDB via Mongoose ──────────────────────────────────────────
mongoose
  .connect(
    `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DATABASE}?retryWrites=true&w=majority&tls=true`
  )
  .then(() => console.log("✔️ Connected to MongoDB via Mongoose"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─── session store ─────────────────────────────────────────────────────────────
const store = MongoStore.create({
  mongoUrl: `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DATABASE}?retryWrites=true&w=majority&tls=true`,
  crypto: { secret: MONGODB_SESSION_SECRET },
  dbName: MONGODB_DATABASE,
  collectionName: "sessions",
});
app.use(
  session({
    secret: NODE_SESSION_SECRET,
    store,
    saveUninitialized: false,
    resave: true,
    cookie: { maxAge: expireTime },
  })
);

// ─── auth middleware ───────────────────────────────────────────────────────────
function isValidSession(req) {
  return !!req.session.authenticated;
}
async function sessionValidation(req, res, next) {
  if (!req.session.authenticated || !req.session.userId) {
    return res.redirect('/login');
  }
  // Check that the user still exists
  const user = await User.findById(req.session.userId).lean();
  if (!user) {
    // User deleted, clear their session and send them back to signup/login.
    req.session.destroy(() => {
      res.redirect('/signup');
    });
    return;
  }
  // attach the user to res.locals for easy access in views:
  res.locals.currentUser = user;
  next();
}

// ─── nav links (for header partial) ───────────────────────────────────────────
const navLinks = [
  { name: "Home", link: "/main" },
  { name: "Shop", link: "/shop" },
  { name: "Leaderboard", link: "/leaderboard" },
  { name: "Create Bet", link: "/createBet" },
  { name: "Money", link: "/money" },
  { name: "Groups", link: "/groups" },
  { name: "userprofile", link: "/userprofile" },
];
app.use((req, res, next) => {
  res.locals.navLinks = navLinks;
  next();
});

// ─── static folders ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use("/images", express.static(path.join(__dirname, "images")));

// ─── Challenge feed ─────────────────────────────────────────────────────────
app.get(["/", "/main"], sessionValidation, async (req, res) => {
  let bets = await Bet.find()
    .populate("betPoster", "firstName lastName profilePictureUrl")
    .lean();
  bets.forEach((b) => {
    b.poster = b.betPoster;
  });
  res.render("main", {
    title: "Challenge Feed",
    css: "/styles/main.css",
    bets,
  });
});

// ─── Shop ───────────────────────────────────────────────────────────────────
app.get("/shop", sessionValidation, (req, res) => {
  res.render("shop", { title: "In‑Game Shop", css: "/styles/shop.css" });
});

// ─── Leaderboard ────────────────────────────────────────────────────────────
app.get("/leaderboard", sessionValidation, async (req, res) => {
  const users = await User.find({}, "firstName lastName points")
    .sort({ points: -1 })
    .lean();
  const topThree = users.slice(0, 3);
  const others = users.slice(3);

  let me = null,
    position = null;
  if (req.session.userId) {
    me = await User.findById(req.session.userId, "points").lean();
    if (me) {
      position =
        (await User.countDocuments({ points: { $gt: me.points } })) + 1;
    }
  }

  res.render("leaderboard", {
    title: "Leaderboard",
    css: "/styles/leaderboard.css",
    topThree,
    users: others,
    currentUser: me,
    currentPosition: position,
  });
});

// ─── Create Bet ─────────────────────────────────────────────────────────────
app
  .route("/createBet")
  .get(sessionValidation, (req, res) => {
    res.render("createBet", {
      title: "Create a Bet",
      css: "/styles/createPost.css",
    });
  })
  .post(sessionValidation, async (req, res) => {
    const {
      betTitle,
      durationValue,
      durationUnit,
      participants,
      betType,
      description,
      privateBet
    } = req.body;

    console.log("CreateBet body:", req.body);

    try {
      // Save the bet
      const newBet = await new Bet({
        betPoster:     req.session.userId,
        betTitle,
        durationValue: Number(durationValue),
        durationUnit,
        participants:  Number(participants),
        betType,
        description,
        privateBet:    !!privateBet
      }).save();

      // Push its _id onto the user's createdBets array
      await User.findByIdAndUpdate(
        req.session.userId,
        { $push: { createdBets: newBet._id } },
        { new: true }
      );

      // boom done
      return res.redirect("/main");
    } catch (err) {
      console.error("❌ Error in createBet route:", err);
      return res
        .status(500)
        .send("Internal Server Error – check your console for details");
    }
  });

// ─── Money + AI ─────────────────────────────────────────────────────────────
app.get("/money", sessionValidation, (req, res) => {
  res.render("money", { title: "Money", css: "/styles/money.css" });
});
app.post("/api/financial-advice", sessionValidation, async (req, res) => {
  const { amount, plan } = req.body;
  // …validate amount & plan…
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const { response } = await (
    await model.generateContent(`Advice for $${amount} with plan ${plan}`)
  ).response;
  res.json({ advice: response.text(), plan, amount });
});

// ─── Groups ────────────────────────────────────────────────────────────────
app.get("/groups", sessionValidation, (req, res) => {
  res.render("groups", { title: "Groups", css: "/styles/groupList.css" });
});
app.get("/makeGroupData", async (req, res) => {
  if ((await Group.countDocuments()) === 0) {
    const sample = require("./scripts/sampleGroups");
    await Group.insertMany(sample);
  }
  res.end();
});
app.get("/api/groups", sessionValidation, async (req, res) => {
  const page = +req.query.page || 1,
    limit = 6;
  const groups = await Group.find()
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  res.json(groups);
});

// ─── User Profile ──────────────────────────────────────────────────────────
app.get("/userprofile", sessionValidation, async (req, res) => {
  const user = await User.findById(req.session.userId)
    .populate("createdGroups joinedGroups participatedBets createdBets")
    .lean();
  res.render("userprofile", {
    title: "Profile",
    css: "/styles/userprofile.css",
    user,
  });
});

// ─── Login / Logout ─────────────────────────────────────────────────────────
app
  .route("/login")
  .get((req, res) =>
    res.render("login", { title: "Login", css: "/styles/auth.css" })
  )
  .post(async (req, res) => {
    const { email, password } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    });
    if (schema.validate({ email, password }).error)
      return res.redirect("/login");
    const user = await User.findOne({ email });
    if (!user) return res.redirect("/login");
    if (!(await bcrypt.compare(password, user.password)))
      return res.redirect("/login");
    req.session.authenticated = true;
    req.session.userId = user._id.toString();
    res.redirect("/main");
  });

app.get("/logout", sessionValidation, (req, res) =>
  req.session.destroy(() => res.redirect("/login"))
);

// ─── Signup ────────────────────────────────────────────────────────────────
app
  .route("/signup")
  .get((req, res) =>
    res.render("signup", { title: "Signup", css: "/styles/auth.css", error: req.query.error })
  )
    .post(async (req, res) => {
    console.log("👉  POST /signup received:", req.body);

    const { firstName, lastName, email, password } = req.body;
    const schema = Joi.object({
      firstName: Joi.string().required(),
      lastName:  Joi.string().required(),
      email:     Joi.string().email().required(),
      password:  Joi.string().min(6).required(),
    });
    const { error } = schema.validate({ firstName, lastName, email, password });
    if (error) {
      // include the Joi‐message as a query param
      const msg = encodeURIComponent(error.details[0].message);
      return res.redirect(`/signup?error=${msg}`);
    }

    if (await User.exists({ email })) {
      return res.redirect(`/signup?error=${encodeURIComponent("Email already registered.")}`);
    }

    try {
      const hash = await bcrypt.hash(password, saltRounds);
      const newUser = await new User({ firstName, lastName, email, password: hash }).save();
      req.session.authenticated = true;
      req.session.userId = newUser._id.toString();
      return res.redirect("/main");
    } catch (e) {
      console.error("❌ Error saving user:", e);
      return res.redirect(`/signup?error=${encodeURIComponent("Internal server error, please try again.")}`);
    }
  });

// ─── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).render("404", { title: "Page Not Found" })
);

app.listen(port, () =>
  console.log(`🚀 Server listening on http://localhost:${port}`)
);
