require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("node:path");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;
const pool = require("./db");
const indexRouter = require("./routes/index");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(expressLayouts);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.set("layout", "layout");

app.use(
	session({
		secret: process.env.SECRET || "keyboard cat",
		resave: false,
		saveUninitialized: true,
	})
);

app.use(flash());
app.use((req, res, next) => {
	res.locals.user = req.user || null;
	res.locals.success = req.flash("success");
	res.locals.errors = req.flash("error");
	res.locals.messages = req.flash("info");
	next();
});

// Passport session handling and config
app.use(passport.initialize());
app.use(passport.session());

// Make the logged-in user available to all templates via `user`
app.use((req, res, next) => {
	res.locals.user = req.user;
	next();
});

app.use((req, res, next) => {
	res.locals.title = "Access Granted"; // default fallback
	next();
});

// Routes
app.use("/", indexRouter);

// For testing purposes in development
/* app.get("/error-test", (req, res, next) => {
	  // This will trigger the 500 error handler
	next(new Error("Deliberate test error"));
}); */

// 404 Error Handling
app.use((req, res) => {
	res.status(404).render("pages/404", {
		title: "404 Page Not Found | Access Granted",
		user: req.user,
	});
});

// 500 Server Error Handling
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).render("pages/500", {
		title: "500 Server Error | Access Granted",
		user: req.user || null,
	});
});

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
