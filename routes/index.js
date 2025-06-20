const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");
const pool = require("../db");

const ensureAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect("/login");
};

// GET the basic pages
router.get("/about", (req, res) => {
	res.render("pages/about", { user: req.user });
});

router.get("/features", (req, res) => {
	res.render("pages/features", { user: req.user });
});

router.get("/faq", (req, res) => {
	res.render("pages/faq", { user: req.user });
});

router.get("/contact", (req, res) => {
	res.render("pages/contact", { user: req.user });
});

router.get("/terms", (req, res) => {
	res.render("pages/terms", { user: req.user });
});

router.get("/privacy", (req, res) => {
	res.render("pages/privacy", { user: req.user });
});

// GET the Signup Form
router.get("/signup", (req, res) => {
	res.render("signup", { errors: [] });
});

// GET the Join Form
router.get("/join", ensureAuthenticated, (req, res) => {
	res.render("join", { errors: [] });
});

// GET the Admin Promotion Form
router.get("/admin", ensureAuthenticated, (req, res) => {
	res.render("admin", { errors: [] });
});

// GET the Login Form
router.get("/login", (req, res) => {
	res.render("login", { errors: [] });
});

// GET the Logout Form
router.get("/logout", (req, res) => {
	res.logout(function (error) {
		if (error) return next(error);
		req.session.destroy(() => {
			res.redirect("/");
		});
	});
});

// GET the message creation form
router.get("/message/new", ensureAuthenticated, (req, res) => {
	res.render("message_form", { errors: [] });
});

// GET Home page to display all messages
router.get("/", async (req, res) => {
	try {
		const result = await pool.query(
			`
			SELECT messages.*, users.first_name, users.last_name
			FROM messages
			JOIN users ON messages.author_id = users.id
			ORDER BY messages.timestamp DESC
		`
		);
		res.render("index", {
			user: req.user,
			messages: result.rows,
		});
	} catch (error) {
		console.error(error);
		res.send("Error loading messages.");
	}
});

// POST Signup
router.post("/signup", async (req, res) => {
	const first_name = req.body.first_name.trim();
	const last_name = req.body.last_name.trim();
	const username = req.body.username.trim();
	const { password, confirmPassword } = req.body;
	const errors = [];

	if (!first_name || !last_name || !username || !password || !confirmPassword) {
		errors.push("All fields are required.");
	}

	if (password !== confirmPassword) {
		errors.push("Passwords do not match.");
	}

	if (password.length < 6) {
		errors.push("Password must be at least 6 characters.");
	}

	if (errors.length > 0) {
		return res.render("signup", { errors });
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);

		await pool.query(
			`INSERT INTO users (first_name, last_name, username, password)
			VALUES ($1, $2, $3, $4)`,
			[first_name, last_name, username, hashedPassword]
		);

		res.redirect("/login");
	} catch (error) {
		console.error(error);
		errors.push("User already exists or database error.");
		res.render("signup", { errors });
	}
});

// POST Join
router.post("/join", ensureAuthenticated, async (req, res) => {
	const { passcode } = req.body;
	const userId = req.session.userId;
	const errors = [];

	if (!passcode || passcode !== process.env.MEMBER_PASSCODE) {
		errors.push("Incorrect passcode.");
		return res.render("join", { errors });
	}

	try {
		await pool.query(`UPDATE users SET is_member = true WHERE id = $1`, [userId]);
		res.redirect("/");
	} catch (error) {
		console.error(error);
		errors.push("Database error. Try again.");
		res.render("join", { errors });
	}
});

// POST Admin Promotion Submission
router.post("/admin", ensureAuthenticated, async (req, res) => {
	const { admincode } = req.body;
	const userId = req.session.userId;
	const errors = [];

	if (!admincode || admincode !== process.env.ADMIN_PASSCODE) {
		errors.push("Incorrect admin code.");
		return res.render("admin", { errors });
	}

	try {
		await pool.query(`UPDATE users SET is_admin = true WHERE id = $1`, [userId]);
		res.redirect("/");
	} catch (error) {
		console.error(error);
		errors.push("Database error. Try again.");
		res.render("admin", { errors });
	}
})

// POST Login
router.post("/login", (req, res, next) => {
	passport.authenticate("local", (error, user, info) => {
		if (error) return next(error);

		if (!user) {
			return res.render("login", { errors: ["Invalid email or password."] });
		}
		req.logIn(user, (error) => {
			if (error) return next(error);
			req.session.userId = user.id;
			return res.redirect("/");
		});
	})(req, res, next);
});

// POST Handle message submission
router.post("/message/new", ensureAuthenticated, async (req, res) => {
	const title = req.body.title.trim();
	const text = req.body.text.trim();
	const errors = [];

	if (!title || !text) {
		errors.push("Both title and text are required.");
		return res.render("message_form", { errors });
	}

	try {
		await pool.query(
			`INSERT INTO messages (title, text, author_id) VALUES ($1, $2, $3)`,
			[title, text, req.user.id]
		);
		res.redirect("/");
	} catch (error) {
		console.error(error);
		errors.push("Database error. Try again.");
		res.render("message_form", { errors });
	}
});

// POST Delete a message (for admins only)
router.post("/message/:id/delete", ensureAuthenticated, async (req, res) => {
	const messageId = req.params.id;

	if (!req.user.is_admin) {
		return res.status(403).send("Forbidden: Admins only");
	}

	try {
		await pool.query(`DELETE FROM messages WHERE id = $1`, [messageId]);
		res.redirect("/");
	} catch (error) {
		console.error(error);
		res.status(500).send("Error deleting message.");
	}
});

// 404 Error Handling
router.use((req, res) => {
	res.status(404).render("pages/404", { user: req.user });
});

module.exports = router;
