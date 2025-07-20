
const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the existing backend server logic
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Serve static files (frontend) from the root directory
app.use(express.static('./', {
  index: 'index.html'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- SQLite Setup ---
const db = new sqlite3.Database('./familytree.db', (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// --- Create Tables if Not Exist ---
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birthDate TEXT,
    deathDate TEXT,
    pronouns TEXT,
    bio TEXT,
    notes TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_street TEXT,
    contact_city TEXT,
    contact_state TEXT,
    contact_zip TEXT,
    occupation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    related_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'parent', 'child', 'spouse'
    FOREIGN KEY(person_id) REFERENCES people(id),
    FOREIGN KEY(related_id) REFERENCES people(id)
  )`);
});

// --- Users Table ---
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// --- Seed Initial Admin User ---
db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
  if (!err && row.count === 0) {
    const hash = await bcrypt.hash('adminpassword', 10);
    db.run('INSERT INTO users (email, password_hash, is_admin, approved) VALUES (?, ?, 1, 1)', ['admin@familytree.com', hash]);
    console.log('Seeded initial admin user: admin@familytree.com / adminpassword');
  }
});

// --- Auth Middleware ---
function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
function adminRequired(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// --- Register ---
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash], function(err) {
    if (err) return res.status(400).json({ error: 'Email already exists' });
    
    // Send notification email to admin
    console.log(`\n🔔 NEW ACCOUNT REQUEST`);
    console.log(`Email: ${email}`);
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log(`Action needed: Login as admin to approve this user at your app URL`);
    console.log(`Admin email: colby@colbyangusblack.com - Please check your family tree app to approve this user.\n`);
    
    res.json({ message: 'Registration successful, pending admin approval.' });
  });
});

// --- Login ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.approved) return res.status(403).json({ error: 'Not approved by admin yet' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: !!user.is_admin }, SECRET, { expiresIn: '7d' });
    res.json({ token, is_admin: !!user.is_admin });
  });
});

// --- List Pending Users (Admin) ---
app.get('/api/users/pending', authRequired, adminRequired, (req, res) => {
  db.all('SELECT id, email, created_at FROM users WHERE approved = 0', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Approve User (Admin) ---
app.post('/api/users/:id/approve', authRequired, adminRequired, (req, res) => {
  db.run('UPDATE users SET approved = 1 WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ approved: true });
  });
});

// --- Reject/Delete User (Admin) ---
app.post('/api/users/:id/reject', authRequired, adminRequired, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: true });
  });
});

// --- Protect Family Tree Endpoints ---
function treeAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    if (!user) return res.status(401).json({ error: 'Invalid user' });
    req.user = user;
    next();
  });
}

// --- API Endpoints ---

// Get all people
app.get('/api/people', (req, res) => {
  db.all('SELECT * FROM people', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get one person (with relationships)
app.get('/api/people/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM people WHERE id = ?', [id], (err, person) => {
    if (err || !person) return res.status(404).json({ error: 'Person not found' });
    db.all('SELECT * FROM relationships WHERE person_id = ?', [id], (err2, rels) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...person, relationships: rels });
    });
  });
});

// Add a new person
app.post('/api/people', treeAuth, (req, res) => {
  const p = req.body;
  db.run(`INSERT INTO people (name, birthDate, deathDate, pronouns, bio, notes, contact_email, contact_phone, contact_street, contact_city, contact_state, contact_zip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.name, p.birthDate, p.deathDate, p.pronouns, p.bio, p.notes, p.contact?.email, p.contact?.phone, p.contact?.street, p.contact?.city, p.contact?.state, p.contact?.zip],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// Update a person
app.put('/api/people/:id', treeAuth, (req, res) => {
  const id = req.params.id;
  const p = req.body;
  db.run(`UPDATE people SET name=?, birthDate=?, deathDate=?, pronouns=?, bio=?, notes=?, contact_email=?, contact_phone=?, contact_street=?, contact_city=?, contact_state=?, contact_zip=? WHERE id=?`,
    [p.name, p.birthDate, p.deathDate, p.pronouns, p.bio, p.notes, p.contact?.email, p.contact?.phone, p.contact?.street, p.contact?.city, p.contact?.state, p.contact?.zip, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    });
});

// Delete a person (and their relationships)
app.delete('/api/people/:id', treeAuth, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM relationships WHERE person_id = ? OR related_id = ?', [id, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM people WHERE id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ deleted: true });
    });
  });
});

// Get all relationships
app.get('/api/relationships', treeAuth, (req, res) => {
  db.all('SELECT * FROM relationships', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a relationship
app.post('/api/relationships', treeAuth, (req, res) => {
  const { person_id, related_id, type } = req.body;
  db.run('INSERT INTO relationships (person_id, related_id, type) VALUES (?, ?, ?)', [person_id, related_id, type], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Delete a relationship
app.delete('/api/relationships/:id', treeAuth, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM relationships WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: true });
  });
});

// Catch-all handler: send back index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Family Tree server running at http://0.0.0.0:${PORT}`);
});
