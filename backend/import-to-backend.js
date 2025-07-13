// Usage:
// 1. Place your exported JSON file as 'family.json' in the backend directory.
// 2. Run: npm install node-fetch@2
// 3. Run: node import-to-backend.js
//
// This script will POST each person in the JSON to your backend API.

const fetch = require('node-fetch'); // v2 syntax
const fs = require('fs');

const people = JSON.parse(fs.readFileSync('family.json', 'utf8'));

async function importPeople() {
  for (const person of people) {
    try {
      const res = await fetch('http://localhost:4000/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person)
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Failed to import:', person.name, err);
      } else {
        const data = await res.json();
        console.log('Imported:', person.name, '->', data.id);
      }
    } catch (e) {
      console.error('Error importing', person.name, e);
    }
  }
  console.log('Import complete!');
}

importPeople(); 