require("./utils.js");
require("dotenv").config();

const express = require("express");
const app = express();
const session = require("express-session");
const http = require("http").createServer(app);
const io = require("socket.io")(http);
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
const Message = require("./models/Message");

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// in‑memory storage so we can stream to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

const {
  MONGODB_USER,
  MONGODB_PASSWORD,
  MONGODB_HOST,
  MONGODB_DATABASE,
  MONGODB_SESSION_SECRET,
  NODE_SESSION_SECRET,
  GEMINI_API_KEY,
} = process.env;

const port = process.env.PORT || 3000;
const expireTime = 24 * 60 * 60 * 1000; // 1 day

// Gemini AI init
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
    return res.redirect("/login");
  }
  // Check that the user still exists
  const user = await User.findById(req.session.userId).lean();
  if (!user) {
    // User deleted, clear their session and send them back to signup/login.
    req.session.destroy(() => {
      res.redirect("/signup");
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
    .populate("participants", "firstName lastName profilePictureUrl")
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
      betType,
      description,
      privateBet,
    } = req.body;

    console.log("CreateBet body:", req.body);

    try {
      // Save the bet
      const newBet = await new Bet({
        betPoster: req.session.userId,
        betTitle,
        durationValue: Number(durationValue),
        durationUnit,
        participants: [req.session.userId],
        participantCount: 1,
        betType,
        description,
        privateBet: !!privateBet,
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

// ─── Join a Bet ─────────────────────────────────────────────────────────────
app.post("/api/bets/:id/join", sessionValidation, async (req, res) => {
  try {
    const betId = req.params.id;
    const userId = req.session.userId;

    // 1) fetch the bet
    const bet = await Bet.findById(betId);
    if (!bet) return res.status(404).json({ error: "Bet not found" });

    // 2) if not already a participant, add them
    if (!bet.participants.includes(userId)) {
      bet.participants.push(userId);
      bet.participantCount = bet.participants.length;
      await bet.save();
      // also add to user's participatedBets
      await User.findByIdAndUpdate(userId, {
        $addToSet: { participatedBets: betId },
      });
    }

    // 3) return updated list of participants
    const participants = await User.find(
      { _id: { $in: bet.participants } },
      "firstName lastName profilePictureUrl"
    ).lean();

    res.json({ participants });
  } catch (err) {
    console.error("❌ /api/bets/:id/jjoin error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ─── Start a Bet ─────────────────────────────────────────────────────────────
app.post("/api/bets/:id/start", sessionValidation, async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id);
    if (!bet) return res.status(404).json({ error: "Bet not found" });
    // only the creator can start
    if (bet.betPoster.toString() !== req.session.userId)
      return res.status(403).json({ error: "Not allowed" });
    if (bet.startedAt)
      return res.status(400).json({ error: "Bet already started" });
    bet.startedAt = new Date();
    await bet.save();
    res.json({ startedAt: bet.startedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ─── Money + AI ─────────────────────────────────────────────────────────────
app.get("/money", sessionValidation, (req, res) => {
  res.render("money", { title: "Money", css: "/styles/money.css" });
});
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
// ─── My Bets (Groups) Page ───────────────────────────────────────────────────
app.get("/groups", sessionValidation, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId)
      .populate({
        path: "participatedBets",
        populate: { path: "betPoster", select: "firstName lastName" },
      })
      .populate({
        path: "createdBets",
        populate: { path: "betPoster", select: "firstName lastName" },
      })
      .lean();

    res.render("groups", {
      title: "My Bets",
      css: "/styles/groupList.css",
      currentUser: user,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Group Chat ───────────────────────────────────────────────────────────
app.get("/group/:id", sessionValidation, async (req, res, next) => {
  try {
    const betId = req.params.id;
    const bet = await Bet.findById(betId)
      .populate("betPoster", "firstName lastName")
      .populate("participants", "firstName lastName profilePictureUrl")
      .lean();
    if (!bet) return res.status(404).render("404", { title: "Not Found" });

    res.render("group_chat", {
      title: bet.betTitle,
      css: "/styles/group_chat.css",
      group: {
        _id: bet._id.toString(),
        title: bet.betTitle,
        description: bet.notice || bet.description || "No description",
      },
      participants: bet.participants,
      userId: req.session.userId,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Bet Leaderboard (inner match page) ───────────────────────────────────────
app.get(
  "/bets/:id/match_leaderboard",
  sessionValidation,
  async (req, res, next) => {
    try {
      const bet = await Bet.findById(req.params.id)
        .populate("betPoster", "firstName lastName profilePictureUrl")
        .populate("participants", "firstName lastName profilePictureUrl points")
        .lean();
      if (!bet) return res.status(404).render("404");

      const startTs = bet.startedAt ? new Date(bet.startedAt).getTime() : null;

      const units = {
        hours: 3600,
        days: 86400,
        weeks: 604800,
        months: 2592000,
      };

      const endTs =
        startTs !== null
          ? startTs + bet.durationValue * units[bet.durationUnit] * 1000
          : null;
      // sort participants by points descending
      const pts = (bet.participants || [])
        .slice()
        .sort((a, b) => (b.points || 0) - (a.points || 0));
      const topThree = pts.slice(0, 3);
      const otherUsers = pts.slice(3);

      // current user's rank
      const meId = req.session.userId;
      const currentPosition =
        pts.findIndex((u) => u._id.toString() === meId) + 1;

      res.render("match_leaderboard", {
        title: bet.betTitle,
        css: "/styles/match_leaderboard.css",

        // for your script block:
        betId: bet._id.toString(),
        creatorId: bet.betPoster._id.toString(),
        durationValue: bet.durationValue,
        durationUnit: bet.durationUnit,
        startedAt: bet.startedAt || null,

        // for the template itself:
        bet,
        endTs,
        topThree,
        users: otherUsers,
        currentUser: res.locals.currentUser,
        currentPosition,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Save daily notice ────────────────────────────────────────────────────────
app.post("/bets/:id/notice", sessionValidation, async (req, res, next) => {
  try {
    console.log("📝 Got notice:", req.params.id, req.body.notice);
    const { notice } = req.body;
    await Bet.findByIdAndUpdate(req.params.id, { notice });
    // back to the same match_leaderboard view
    return res.redirect(`/bets/${req.params.id}/match_leaderboard`);
  } catch (err) {
    console.error("❌ Error saving notice:", err);
    return res.status(500).send("Could not save your message");
  }
});

// ─── User Profile ──────────────────────────────────────────────────────────
app.get("/userprofile", sessionValidation, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(req.session.userId)
      .populate("createdGroups joinedGroups participatedBets createdBets") // Remove this if error persists
      .lean();

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("userprofile", {
      title: "Profile",
      css: "/styles/userprofile.css",
      user,
    });
  } catch (err) {
    console.error("UserProfile route error:", err);
    res.status(500).send("Something went wrong while loading the profile.");
  }
});

// ─── User Settings ───────────────────────────────────────────────────────────
const streamifier = require("streamifier");

app
  .route("/usersettings")
  .get(sessionValidation, (req, res) => {
    // res.locals.currentUser already populated
    res.render("usersettings", {
      title: "Settings",
      css: "/styles/usersettings.css",
    });
  })
  .post(
    sessionValidation,
    upload.single("avatar"), // <input name="avatar" type="file">
    async (req, res, next) => {
      try {
        // 1) Gather the text fields
        const { firstName, lastName, email } = req.body;
        const update = { firstName, lastName, email };

        // 2) If there’s a new avatar, stream it to Cloudinary
        if (req.file) {
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "profile_pics",
                public_id: `user_${req.session.userId}`,
              },
              (err, r) => (err ? reject(err) : resolve(r))
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
          });
          update.profilePictureUrl = result.secure_url;
        }

        // 3) Persist all changes in one go
        await User.findByIdAndUpdate(req.session.userId, update);
        res.redirect("/userprofile");
      } catch (err) {
        next(err);
      }
    }
  );

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
    res.render("signup", {
      title: "Signup",
      css: "/styles/auth.css",
      error: req.query.error,
    })
  )
  .post(async (req, res) => {
    console.log("👉  POST /signup received:", req.body);

    const { firstName, lastName, email, password } = req.body;
    const schema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    });
    const { error } = schema.validate({ firstName, lastName, email, password });
    if (error) {
      // include the Joi‐message as a query param
      const msg = encodeURIComponent(error.details[0].message);
      return res.redirect(`/signup?error=${msg}`);
    }

    if (await User.exists({ email })) {
      return res.redirect(
        `/signup?error=${encodeURIComponent("Email already registered.")}`
      );
    }

    try {
      const hash = await bcrypt.hash(password, saltRounds);
      const newUser = await new User({
        firstName,
        lastName,
        email,
        password: hash,
      }).save();
      req.session.authenticated = true;
      req.session.userId = newUser._id.toString();
      return res.redirect("/main");
    } catch (e) {
      console.error("❌ Error saving user:", e);
      return res.redirect(
        `/signup?error=${encodeURIComponent(
          "Internal server error, please try again."
        )}`
      );
    }
  });

// fetch last 50 messages for a group
app.get(
  "/api/group-chat/messages/:groupId",
  sessionValidation,
  async (req, res) => {
    const { groupId } = req.params;
    const msgs = await Message.find({ groupId })
      .sort({ timestamp: 1 })
      .limit(50)
      .lean();
    const out = await Promise.all(
      msgs.map(async (m) => {
        const u = await User.findById(
          m.userId,
          "firstName lastName profilePictureUrl"
        ).lean();
        return {
          userId: m.userId.toString(),
          username: u ? `${u.firstName} ${u.lastName}` : "Unknown",
          message: m.message,
          timestamp: m.timestamp,
          profilePictureUrl:
            u.profilePictureUrl || "/images/default-avatar.png",
        };
      })
    );
    res.json(out);
  }
);
const Spending = require('./models/Spending'); // adjust path as needed

app.post('/api/spend', async (req, res) => {
  try {
    const { amount, date } = req.body;
    const userId = req.session.userId;

    if (!userId || !amount || !date) {
      return res.status(400).json({ error: "Missing data" });
    }

    const newSpend = new Spending({
      userId,
      amount: parseFloat(amount),
      date: new Date(date)
    });

    await newSpend.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving spend:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// send a new chat message
app.post(
  "/api/group-chat/send/:groupId",
  sessionValidation,
  async (req, res) => {
    const { groupId } = req.params;
    const { content } = req.body;
    const m = await Message.create({
      groupId,
      userId: req.session.userId,
      message: content,
      timestamp: new Date(),
    });
    // broadcast via socket.io
    const u = await User.findById(
      req.session.userId,
      "firstName lastName"
    ).lean();
    io.to(groupId).emit("chat-message", {
      userId: m.userId.toString(),
      username: `${u.firstName} ${u.lastName}`,
      message: m.message,
      profilePictureUrl: u.profilePictureUrl || "/images/default-avatar.png",
    });
    res.json(
      await Promise.all(
        msgs.map(async (m) => {
          const u = await User.findById(
            m.userId,
            "firstName lastName profilePictureUrl"
          ).lean();
          return {
            userId: m.userId,
            username: `${u.firstName} ${u.lastName}`,
            message: m.message,
            timestamp: m.timestamp,
            profilePictureUrl:
              u.profilePictureUrl || "/images/default-avatar.png",
          };
        })
      )
    );
  }
);
app.get('/api/spendings', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const spendings = await Spending.find({ userId }).sort({ date: 1 });
    res.json(spendings);
  } catch (err) {
    console.error("Error fetching spendings:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// the page that holds the chat UI
app.get("/group/:id", sessionValidation, async (req, res, next) => {
  const bet = await Bet.findById(req.params.id).lean();
  if (!bet) return res.status(404).render("404");
  res.render("group_chat", {
    title: bet.betTitle,
    css: "/styles/group_chat.css",
    group: {
      _id: bet._id.toString(),
      title: bet.betTitle,
      description: bet.notice || bet.description || "No description",
    },
    userId: req.session.userId,
  });
});

// ─── Chat Connection ──────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  socket.on("join-group", (groupId, userId) => {
    socket.userId = userId; // ← stash it
    socket.join(groupId);
    socket.to(groupId).emit("user-connected", userId);
  });

  socket.on("send-chat-message", (groupId, message) => {
    io.to(groupId).emit("chat-message", {
      userId: socket.userId,
      message,
    });
  });

  socket.on("disconnecting", () => {
    for (let room of socket.rooms) {
      if (room !== socket.id) {
        // now safe—use socket.userId
        socket.to(room).emit("user-disconnected", socket.userId);
      }
    }
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).render("404", { title: "Page Not Found" })
);

http.listen(port, () => {
  console.log(`🚀 Server & socket.io listening on http://localhost:${port}`);
});
