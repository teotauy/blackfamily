// Script to add a user account to the deployed backend database
// Usage: node add-user-to-deployed-backend.js [phone] [name] [email]

const https = require('https');

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
const BACKEND_URL = 'https://blackfamilybackend.onrender.com';

console.log('🔐 Adding user account to deployed backend...');
console.log(`   Backend: ${BACKEND_URL}`);
console.log(`   Phone: ${phone} (normalized: ${normalizedPhone})`);
console.log(`   Name: ${name}`);
console.log(`   Email: ${email}`);
console.log('');

// First, check if person with this phone already exists
console.log('🔍 Checking if account already exists...');
const checkUrl = `${BACKEND_URL}/api/people`;

const checkData = JSON.stringify({});

const checkOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const checkReq = https.request(checkUrl, checkOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const people = JSON.parse(data);
      
      // Check if person with this phone already exists
      const existingPerson = people.find(p => {
        const existingPhone = normalizePhone(p.contact_phone || '');
        return existingPhone === normalizedPhone;
      });

      if (existingPerson) {
        console.log(`✅ Account already exists on deployed backend!`);
        console.log(`   Person ID: ${existingPerson.id}`);
        console.log(`   Name: ${existingPerson.name}`);
        console.log(`   Phone: ${existingPerson.contact_phone}`);
        console.log('');
        console.log('📱 You can now log in with:');
        console.log(`   Phone: ${phone} (or ${normalizedPhone})`);
        console.log(`   Password: blackfamily2024`);
        return;
      }

      // Add new person record
      console.log('➕ Adding new person record to deployed backend...');
      addPersonToBackend();
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Response:', data);
    }
  });
});

checkReq.on('error', (error) => {
  console.error('❌ Error checking backend:', error.message);
  console.log('💡 Trying to add account anyway...');
  addPersonToBackend();
});

checkReq.end();

function addPersonToBackend() {
  const personData = {
    name: name,
    contact_email: email,
    contact_phone: normalizedPhone
  };

  const postData = JSON.stringify(personData);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const addUrl = `${BACKEND_URL}/api/people`;
  const req = https.request(addUrl, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        const result = JSON.parse(data);
        console.log(`✅ Account created successfully on deployed backend!`);
        console.log(`   Person ID: ${result.id}`);
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
      } else {
        console.error(`❌ Error adding account. Status: ${res.statusCode}`);
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error adding account:', error.message);
  });

  req.write(postData);
  req.end();
}

