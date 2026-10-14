require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "wanderease-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 }
  })
);
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "wanderease",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please login first." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

// Session
app.get("/api/session", (req, res) => {
  res.json({ user: req.session.user || null });
});

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        message: "Name, email and a password of at least 6 characters are required."
      });
    }

    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
      [name.trim(), email.trim().toLowerCase(), hash]
    );

    req.session.user = {
      id: result.insertId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "user"
    };

    res.status(201).json({ message: "Registration successful.", user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed." });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await query(
      "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const u = rows[0];
    req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role };
    res.json({ message: "Login successful.", user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed." });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

// Destinations
app.get("/api/destinations", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM destinations ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load destinations." });
  }
});

app.post("/api/destinations", requireAdmin, async (req, res) => {
  try {
    const { name, location, category, image, description } = req.body;
    if (!name || !location || !category) {
      return res.status(400).json({ message: "Name, location and category are required." });
    }

    const result = await query(
      "INSERT INTO destinations (name, location, category, image, description) VALUES (?, ?, ?, ?, ?)",
      [name, location, category, image || "", description || ""]
    );

    const rows = await query("SELECT * FROM destinations WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not add destination." });
  }
});

app.put("/api/destinations/:id", requireAdmin, async (req, res) => {
  try {
    const { name, location, category, image, description } = req.body;
    await query(
      `UPDATE destinations
       SET name=?, location=?, category=?, image=?, description=?
       WHERE id=?`,
      [name, location, category, image || "", description || "", req.params.id]
    );
    const rows = await query("SELECT * FROM destinations WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update destination." });
  }
});

app.delete("/api/destinations/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM destinations WHERE id = ?", [req.params.id]);
    res.json({ message: "Destination deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete destination." });
  }
});

// Packages
app.get("/api/packages", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM packages ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load packages." });
  }
});

app.post("/api/packages", requireAdmin, async (req, res) => {
  try {
    const { title, destination, duration, price, image, description } = req.body;
    if (!title || !destination || !duration || price === undefined) {
      return res.status(400).json({ message: "Title, destination, duration and price are required." });
    }

    const result = await query(
      `INSERT INTO packages
       (title, destination, duration, price, image, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, destination, duration, Number(price), image || "", description || ""]
    );

    const rows = await query("SELECT * FROM packages WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not add package." });
  }
});

app.put("/api/packages/:id", requireAdmin, async (req, res) => {
  try {
    const { title, destination, duration, price, image, description } = req.body;
    await query(
      `UPDATE packages
       SET title=?, destination=?, duration=?, price=?, image=?, description=?
       WHERE id=?`,
      [title, destination, duration, Number(price), image || "", description || "", req.params.id]
    );
    const rows = await query("SELECT * FROM packages WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update package." });
  }
});

app.delete("/api/packages/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM packages WHERE id = ?", [req.params.id]);
    res.json({ message: "Package deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete package." });
  }
});

// Bookings
app.post("/api/bookings", requireLogin, async (req, res) => {
  try {
    const { packageId, travelDate, travelers } = req.body;
    if (!packageId || !travelDate || !travelers || Number(travelers) < 1) {
      return res.status(400).json({ message: "Package, travel date and travelers are required." });
    }

    const packages = await query("SELECT * FROM packages WHERE id = ?", [packageId]);
    if (!packages.length) return res.status(404).json({ message: "Package not found." });

    const p = packages[0];
    const total = Number(p.price) * Number(travelers);

    const result = await query(
      `INSERT INTO bookings
       (user_id, package_id, travel_date, travelers, total_price, status)
       VALUES (?, ?, ?, ?, ?, 'Confirmed')`,
      [req.session.user.id, packageId, travelDate, Number(travelers), total]
    );

    const rows = await query(
      `SELECT b.*, p.title AS package_title
       FROM bookings b
       JOIN packages p ON p.id=b.package_id
       WHERE b.id=?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Booking failed." });
  }
});

app.get("/api/bookings", requireLogin, async (req, res) => {
  try {
    let sql = `
      SELECT b.*, p.title AS package_title, p.destination
      FROM bookings b
      JOIN packages p ON p.id=b.package_id
    `;
    const params = [];

    if (req.session.user.role !== "admin") {
      sql += " WHERE b.user_id = ?";
      params.push(req.session.user.id);
    }

    sql += " ORDER BY b.id DESC";
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load bookings." });
  }
});

app.patch("/api/bookings/:id/cancel", requireLogin, async (req, res) => {
  try {
    const rows = await query("SELECT * FROM bookings WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Booking not found." });

    if (
      req.session.user.role !== "admin" &&
      rows[0].user_id !== req.session.user.id
    ) {
      return res.status(403).json({ message: "Not allowed." });
    }

    await query("UPDATE bookings SET status='Cancelled' WHERE id=?", [req.params.id]);
    res.json({ message: "Booking cancelled." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not cancel booking." });
  }
});

// Reviews
app.get("/api/reviews", async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.name
      FROM reviews r
      JOIN users u ON u.id=r.user_id
      ORDER BY r.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load reviews." });
  }
});

app.post("/api/reviews", requireLogin, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const score = Number(rating);

    if (!score || score < 1 || score > 5 || !comment?.trim()) {
      return res.status(400).json({ message: "Rating 1–5 and a comment are required." });
    }

    const result = await query(
      "INSERT INTO reviews (user_id, rating, comment) VALUES (?, ?, ?)",
      [req.session.user.id, score, comment.trim()]
    );

    const rows = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name
       FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.id=?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not submit review." });
  }
});

// Contact/enquiry
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All contact fields are required." });
    }

    await query(
      `INSERT INTO enquiries (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim(), subject.trim(), message.trim()]
    );

    res.status(201).json({ message: "Your enquiry has been submitted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not submit enquiry." });
  }
});

// Dashboard stats
app.get("/api/stats", requireLogin, async (req, res) => {
  try {
    const [[destinations]] = await pool.query("SELECT COUNT(*) AS count FROM destinations");
    const [[packages]] = await pool.query("SELECT COUNT(*) AS count FROM packages");
    const [[bookings]] =
      req.session.user.role === "admin"
        ? await pool.query("SELECT COUNT(*) AS count FROM bookings")
        : await pool.query("SELECT COUNT(*) AS count FROM bookings WHERE user_id=?", [
            req.session.user.id
          ]);

    res.json({
      destinations: destinations.count,
      packages: packages.count,
      bookings: bookings.count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load statistics." });
  }
});

// Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  try {
    await query("SELECT 1");
    console.log("MySQL connected successfully.");
    app.listen(PORT, () => {
      console.log(`WanderEase running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MySQL connection failed.");
    console.error("Check MySQL is running and your .env credentials are correct.");
    console.error(err.message);
    process.exit(1);
  }
}

start();
