// Script to add a user account to the database for login
// Usage: node add-user-account.js [phone] [name] [email]

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Default values - can be overridden via command line arguments
const DEFAULT_PHONE = '5124266530';
const DEFAULT_NAME = 'Colby Black';
const DEFAULT_EMAIL = 'colby@colbyangusblack.com';

// Get arguments or use defaults
const phone = process.argv[2] || DEFAULT_PHONE;
const name = process.argv[3] || DEFAULT_NAME;
const email = process.argv[4] || DEFAULT_EMAIL;

// Normalize phone number (remove all non-digits)
function normalizePhone(value) {
  if (!value) return '';
  return String(value).replace(/\D+/g, '');
}

const normalizedPhone = normalizePhone(phone);

console.log('🔐 Adding user account to database...');
console.log(`   Phone: ${phone} (normalized: ${normalizedPhone})`);
console.log(`   Name: ${name}`);
console.log(`   Email: ${email}`);
console.log('');

// Connect to database
const dbPath = path.join(__dirname, 'familytree.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Could not connect to database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Check if person with this phone already exists
db.all('SELECT id, name, contact_phone FROM people WHERE contact_phone LIKE ?', [`%${normalizedPhone}%`], (err, rows) => {
  if (err) {
    console.error('❌ Error checking database:', err);
    db.close();
    process.exit(1);
  }

  // Check for exact match after normalization
  const exactMatch = rows.find(row => normalizePhone(row.contact_phone) === normalizedPhone);

  if (exactMatch) {
    console.log(`✅ Account already exists!`);
    console.log(`   Person ID: ${exactMatch.id}`);
    console.log(`   Name: ${exactMatch.name}`);
    console.log(`   Phone: ${exactMatch.contact_phone}`);
    console.log('');
    console.log('📱 You can now log in with:');
    console.log(`   Phone: ${phone} (or ${normalizedPhone})`);
    console.log(`   Password: blackfamily2024`);
    db.close();
    return;
  }

  // Add new person record
  console.log('➕ Adding new person record...');
  db.run(
    `INSERT INTO people (name, contact_email, contact_phone) VALUES (?, ?, ?)`,
    [name, email, normalizedPhone],
    function(err) {
      if (err) {
        console.error('❌ Error adding person:', err);
        db.close();
        process.exit(1);
      }

      console.log(`✅ Account created successfully!`);
      console.log(`   Person ID: ${this.lastID}`);
      console.log(`   Name: ${name}`);
      console.log(`   Phone: ${normalizedPhone}`);
      console.log(`   Email: ${email}`);
      console.log('');
      console.log('📱 You can now log in with:');
      console.log(`   Phone: ${phone} (or ${normalizedPhone})`);
      console.log(`   Password: blackfamily2024`);
      console.log('');
      console.log('💡 Note: The phone number can be entered with or without formatting');
      console.log('   (e.g., "5124266530" or "512-426-6530" both work)');
      
      db.close();
    }
  );
});

