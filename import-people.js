// import-people.js
// Usage: node import-people.js
// Imports people from js/family-data.json into backend/familytree.db

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Path to your JSON data and SQLite DB
const DATA_PATH = path.join(__dirname, 'js', 'family-data.json');
const DB_PATH = path.join(__dirname, 'backend', 'familytree.db');

// Read and parse the JSON data
let people;
try {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  people = JSON.parse(raw);
} catch (err) {
  console.error('Failed to read or parse js/family-data.json:', err);
  process.exit(1);
}

// Open SQLite DB
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err);
    process.exit(1);
  }
});

// Prepare insert statement
const insertStmt = db.prepare(`
  INSERT INTO people (
    name, birthDate, deathDate, pronouns, bio, notes,
    contact_email, contact_phone, contact_street, contact_city, contact_state, contact_zip
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let imported = 0;

db.serialize(() => {
  for (const person of people) {
    insertStmt.run([
      person.name || '',
      person.birthDate || '',
      '', // deathDate (not in your data)
      person.pronouns || '',
      person.bio || '',
      '', // notes (not in your data)
      person.contact?.email || '',
      person.contact?.phone || '',
      person.contact?.street || '',
      person.contact?.city || '',
      person.contact?.state || '',
      person.contact?.zip || ''
    ], (err) => {
      if (err) {
        console.error(`Failed to import person: ${person.name} (${person.id}):`, err.message);
      } else {
        imported++;
      }
    });
  }

  insertStmt.finalize((err) => {
    if (err) console.error('Error finalizing statement:', err);
    db.close(() => {
      console.log(`Import complete. Imported ${imported} people.`);
    });
  });
}); 