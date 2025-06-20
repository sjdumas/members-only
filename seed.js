const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

async function seed() {
	try {
		// Clear existing data
		await pool.query("DELETE FROM messages");
		await pool.query("DELETE FROM users");

		const password = await bcrypt.hash("password123", 10);

		const users = [
			{ first_name: "Alice", last_name: "Wright", username: "alice@example.com", is_member: true, is_admin: false },
			{ first_name: "Bob", last_name: "Smith", username: "bob@example.com", is_member: true, is_admin: true },
			{ first_name: "Charlie", last_name: "Johnson", username: "charlie@example.com", is_member: false, is_admin: false },
			{ first_name: "Dana", last_name: "Lee", username: "dana@example.com", is_member: true, is_admin: false },
			{ first_name: "Eli", last_name: "Nguyen", username: "eli@example.com", is_member: false, is_admin: false },
			{ first_name: "Faye", last_name: "Martinez", username: "faye@example.com", is_member: true, is_admin: true },
			{ first_name: "George", last_name: "Kim", username: "george@example.com", is_member: true, is_admin: false },
			{ first_name: "Hana", last_name: "Patel", username: "hana@example.com", is_member: false, is_admin: false },
		];

		const userIds = [];

		for (const user of users) {
			const res = await pool.query(
				`INSERT INTO users (first_name, last_name, username, password, is_member, is_admin)
				VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
				[user.first_name, user.last_name, user.username, password, user.is_member, user.is_admin]
			);
			userIds.push(res.rows[0].id);
		}

		const messages = [
			{ title: "Welcome to the Club", text: "Excited to be part of this group!", author_id: userIds[0] },
			{ title: "Rules", text: "Be kind. Be respectful. No spoilers.", author_id: userIds[1] },
			{ title: "Just Saying Hi", text: "Hope you're all doing well.", author_id: userIds[2] },
			{ title: "Random Thought", text: "Pineapple on pizza is underrated.", author_id: userIds[3] },
			{ title: "Good Morning", text: "Woke up early and feeling motivated!", author_id: userIds[4] },
			{ title: "Let's Connect", text: "Anyone here from the West Coast?", author_id: userIds[5] },
			{ title: "Music Vibes", text: "Listening to Lo-fi beats while coding.", author_id: userIds[6] },
			{ title: "Funny Story", text: "Accidentally sent a cat meme to my boss.", author_id: userIds[7] },
		];

		for (const msg of messages) {
			await pool.query(
				`INSERT INTO messages (title, text, author_id) VALUES ($1, $2, $3)`,
				[msg.title, msg.text, msg.author_id]
			);
		}

		console.log("✅ Seeding complete.");
		process.exit();
	} catch (err) {
		console.error("❌ Seeding failed:", err);
		process.exit(1);
	}
}

seed();
