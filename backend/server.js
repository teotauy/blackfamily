// Family Tree Backend API (Node.js + Express + SQLite)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check endpoint for Railway
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
    contact_zip TEXT
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
app.post('/api/people', (req, res) => {
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
app.put('/api/people/:id', (req, res) => {
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
app.delete('/api/people/:id', (req, res) => {
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
app.get('/api/relationships', (req, res) => {
  db.all('SELECT * FROM relationships', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a relationship
app.post('/api/relationships', (req, res) => {
  const { person_id, related_id, type } = req.body;
  db.run('INSERT INTO relationships (person_id, related_id, type) VALUES (?, ?, ?)', [person_id, related_id, type], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Delete a relationship
app.delete('/api/relationships/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM relationships WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: true });
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Family Tree API server running at http://localhost:${PORT}`);
}); 