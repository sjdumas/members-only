require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("node:path");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;
const pool = require("./db");
const indexRouter = require("./routes/index");
const app = express();

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
	session({
		secret: process.env.SECRET || "keyboard cat",
		resave: false,
		saveUninitialized: true,
	})
);

// Passport session handling and config
app.use(passport.initialize());
app.use(passport.session());

// Make the logged-in user available to all templates via `user`
app.use((req, res, next) => {
	res.locals.user = req.user;
	next();
});

// Routes
app.use("/", indexRouter);

passport.use(
	new LocalStrategy(async (username, password, done) => {
		try {
			const result = await pool.query(
				"SELECT * FROM users WHERE username = $1",
				[username]
			);

			if (result.rows.length === 0) {
				return done(null, false, { message: "Incorrect username." });
			}

			const user = result.rows[0];
			const isMatch = await bcrypt.compare(password, user.password);

			if (!isMatch) {
				return done(null, false, { message: "Incorrect password." });
			}

			return done(null, user);
		} catch (error) {
			return done(error);
		}
	})
);

// Serialize the user
passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
		done(null, result.rows[0]);
	} catch (error) {
		done(error);
	}
});

const PORT = process.env.PORT || 3000;

pool.connect()
	.then(()=> console.log("Connected to PostgreSQL"))
	.catch((err)=> console.error("Connection error", err.stack));

app.listen(PORT, () => {
	console.log(`Express App listening on port 3000! http://localhost:${PORT}`);
});
