// Family Tree Backend API (Node.js + Express + SQLite) - Simplified Version
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Simple password for family access
const FAMILY_PASSWORD = 'blackfamily2024';

// CORS configuration for production - More permissive
const corsOptions = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  optionsSuccessStatus: 200
};

// Add CORS debugging
app.use((req, res, next) => {
  console.log('CORS Debug - Origin:', req.headers.origin);
  console.log('CORS Debug - Method:', req.method);
  next();
});
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint to verify CORS
app.get('/api/test-cors', (req, res) => {
  console.log('CORS Test - Origin:', req.headers.origin);
  res.json({ 
    message: 'CORS test successful', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Phone + Password verification endpoint
app.post('/api/verify-access', (req, res) => {
  const { phone, password } = req.body;
  
  // First check if phone exists in family database
  db.get('SELECT id FROM people WHERE contact_phone = ?', [phone], (err, person) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!person) {
      return res.status(401).json({ error: 'Phone number not found in family database' });
    }
    
    // Then verify family password
    if (password === FAMILY_PASSWORD) {
      res.json({ 
        success: true, 
        message: 'Access granted',
        token: 'family-access-token',
        personId: person.id
      });
    } else {
      res.status(401).json({ error: 'Incorrect family password' });
    }
  });
});

// Keep simple login for backward compatibility
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === FAMILY_PASSWORD) {
    res.json({ 
      success: true, 
      message: 'Access granted',
      token: 'family-access-token' // Simple token
    });
  } else {
    res.status(401).json({ error: 'Incorrect password' });
  }
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
    middle_name TEXT,
    maiden_name TEXT,
    nickname TEXT,
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
    can_receive_sms TEXT DEFAULT 'unsure'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    related_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE,
    FOREIGN KEY (related_id) REFERENCES people (id) ON DELETE CASCADE
  )`);

  // Add columns if they don't exist
  db.run("ALTER TABLE people ADD COLUMN middle_name TEXT", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding middle_name column:', err);
    }
  });

  db.run("ALTER TABLE people ADD COLUMN maiden_name TEXT", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding maiden_name column:', err);
    }
  });

  db.run("ALTER TABLE people ADD COLUMN nickname TEXT", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding nickname column:', err);
    }
  });
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

// Add a person
app.post('/api/people', (req, res) => {
  const p = req.body;
  db.run(`INSERT INTO people (name, middle_name, maiden_name, nickname, birthDate, deathDate, pronouns, bio, notes, contact_email, contact_phone, contact_street, contact_city, contact_state, contact_zip, can_receive_sms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.name, p.middle_name, p.maiden_name, p.nickname, p.birthDate || p.birth_date, p.deathDate || p.death_date, p.pronouns, p.bio, p.notes, p.contact_email || p.contact?.email, p.contact_phone || p.contact?.phone, p.contact_street || p.contact?.street, p.contact_city || p.contact?.city, p.contact_state || p.contact?.state, p.contact_zip || p.contact?.zip, p.can_receive_sms || 'unsure'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// Update a person
app.put('/api/people/:id', (req, res) => {
  const id = req.params.id;
  const p = req.body;
  db.run(`UPDATE people SET name=?, middle_name=?, maiden_name=?, nickname=?, birthDate=?, deathDate=?, pronouns=?, bio=?, notes=?, contact_email=?, contact_phone=?, contact_street=?, contact_city=?, contact_state=?, contact_zip=?, can_receive_sms=? WHERE id=?`,
    [p.name, p.middle_name, p.maiden_name, p.nickname, p.birthDate || p.birth_date, p.deathDate || p.death_date, p.pronouns, p.bio, p.notes, p.contact_email || p.contact?.email, p.contact_phone || p.contact?.phone, p.contact_street || p.contact?.street, p.contact_city || p.contact?.city, p.contact_state || p.contact?.state, p.contact_zip || p.contact?.zip, p.can_receive_sms || 'unsure', id],
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

// Bulk import endpoint for CSV upload
app.post('/api/people/bulk', (req, res) => {
  const people = req.body;
  if (!Array.isArray(people)) {
    return res.status(400).json({ error: 'Expected an array of people' });
  }
  const placeholders = people.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
  const values = [];
  people.forEach(p => {
    values.push(
      p.name || '',
      p.middle_name || '',
      p.maiden_name || '',
      p.nickname || '',
      p.birth_date || '',
      p.death_date || '',
      p.pronouns || '',
      p.bio || '',
      p.notes || '',
      p.contact_email || '',
      p.contact_phone || '',
      p.contact_street || '',
      p.contact_city || '',
      p.contact_state || '',
      p.contact_zip || '',
      p.can_receive_sms || 'unsure'
    );
  });
  const sql = `INSERT INTO people (name, middle_name, maiden_name, nickname, birthDate, deathDate, pronouns, bio, notes, contact_email, contact_phone, contact_street, contact_city, contact_state, contact_zip, can_receive_sms) VALUES ${placeholders}`;
  db.run(sql, values, function(err) {
    if (err) {
      console.error('Bulk insert error:', err);
      return res.status(500).json({ error: 'Failed to insert people' });
    }
    res.json({ message: 'People imported', count: people.length });
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

// Simple clear data endpoint
app.post('/api/clear-data', (req, res) => {
  db.run('DELETE FROM relationships', [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('DELETE FROM people', [], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      
      res.json({ 
        message: 'All data cleared successfully',
        relationshipsDeleted: this.changes,
        peopleDeleted: this.changes
      });
    });
  });
});

// Get CSV template
app.get('/api/csv-template', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="family-tree-template.csv"');
  res.send(`First Name,Last Name,DOB,Email,Phone,Notes
John,Doe,1980-05-15,john.doe@email.com,555-123-4567,Primary contact
Jane,Doe,1982-08-22,jane.doe@email.com,555-123-4568,Spouse
Michael,Doe,2005-03-10,michael.doe@email.com,555-123-4569,Child
Sarah,Doe,2008-11-05,sarah.doe@email.com,555-123-4570,Child
Robert,Smith,1955-12-03,robert.smith@email.com,555-123-4571,Father
Mary,Smith,1957-04-18,mary.smith@email.com,555-123-4572,Mother`);
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Railway deployment check - ${new Date().toISOString()}`);
  console.log(`Family password: ${FAMILY_PASSWORD}`);
});
