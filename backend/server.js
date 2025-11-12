// Family Tree Backend API (Node.js + Express + SQLite) - Simplified Version
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 5000;

function parseFamilyDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  // Handle year-only format (e.g., "1955")
  const yearOnly = /^\d{4}$/.test(trimmed);
  if (yearOnly) {
    const year = parseInt(trimmed, 10);
    if (!isNaN(year) && year >= 1000 && year <= 9999) {
      // Use January 1st of that year for comparison purposes
      return new Date(year, 0, 1);
    }
  }

  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    let [month, day, year] = parts.map(part => part.trim());
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    let yearNum = parseInt(year, 10);

    if (!isNaN(monthNum) && !isNaN(dayNum)) {
      if (!isNaN(yearNum)) {
        if (year.length === 2) {
          yearNum += yearNum >= 50 ? 1900 : 2000;
        }
        const reconstructed = new Date(yearNum, monthNum - 1, dayNum);
        if (!isNaN(reconstructed.getTime())) {
          return reconstructed;
        }
      }
    }
  }

  return null;
}

function normalizePhone(value) {
  if (!value) return '';
  return String(value).replace(/\D+/g, '');
}

// Simple password for family access
const FAMILY_PASSWORD = 'blackfamily2024';

// Simple CORS - allow all origins for family app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Phone + Password verification endpoint
app.post('/api/verify-access', (req, res) => {
  const { phone, password } = req.body;
  const normalizedPhone = normalizePhone(phone);
  
  // First check if phone exists in family database
  db.all('SELECT id, contact_phone FROM people', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    const person = rows.find(row => normalizePhone(row.contact_phone) === normalizedPhone);

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

  // Deduplicate existing relationship rows and enforce uniqueness
  db.run(
    `DELETE FROM relationships
     WHERE id NOT IN (
       SELECT MIN(id) FROM relationships GROUP BY person_id, related_id, type
     )`,
    (err) => {
      if (err) {
        console.error('Error deduplicating relationships:', err);
      }
    }
  );

  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_unique
     ON relationships(person_id, related_id, type)`,
    (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating unique index for relationships:', err);
      }
    }
  );
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
  db.all(
    `SELECT MIN(id) as id, person_id, related_id, type
     FROM relationships
     GROUP BY person_id, related_id, type`,
    [],
    (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a relationship
app.post('/api/relationships', (req, res) => {
  const { person_id, related_id, type } = req.body;

  const insertRelationship = () => {
    db.run(
      'INSERT OR IGNORE INTO relationships (person_id, related_id, type) VALUES (?, ?, ?)',
      [person_id, related_id, type],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, inserted: this.changes > 0 });
      }
    );
  };

  if (type === 'parent' || type === 'child') {
    const childId = type === 'parent' ? person_id : related_id;
    const parentId = type === 'parent' ? related_id : person_id;

    db.get('SELECT id, name, birthDate FROM people WHERE id = ?', [parentId], (parentErr, parentRow) => {
      if (parentErr) return res.status(500).json({ error: parentErr.message });
      db.get('SELECT id, name, birthDate FROM people WHERE id = ?', [childId], (childErr, childRow) => {
        if (childErr) return res.status(500).json({ error: childErr.message });

        const parentDate = parentRow && parentRow.birthDate ? parseFamilyDate(parentRow.birthDate) : null;
        const childDate = childRow && childRow.birthDate ? parseFamilyDate(childRow.birthDate) : null;

        // Only validate if both dates exist and are valid
        // If parent date is missing, allow the relationship (user can add date later)
        if (parentDate && childDate) {
          // Compare years for year-only dates, full dates otherwise
          const parentYear = parentDate.getFullYear();
          const childYear = childDate.getFullYear();
          
          // If parent year is >= child year, that's invalid
          if (parentYear >= childYear) {
            const parentName = parentRow ? parentRow.name : 'Parent';
            const childName = childRow ? childRow.name : 'Child';
            const parentDateStr = parentRow.birthDate || 'Unknown';
            const childDateStr = childRow.birthDate || 'Unknown';
            return res.status(400).json({
              error: `Parent birth date must be earlier than the child's birth date. ${parentName}'s birth date (${parentDateStr}) must be before ${childName}'s birth date (${childDateStr}). Please verify the dates.`
            });
          }
        }

        insertRelationship();
      });
    });
  } else {
    insertRelationship();
  }
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
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Process ID: ${process.pid}`);
});
