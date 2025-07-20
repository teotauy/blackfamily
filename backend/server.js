// Family Tree Backend API (Node.js + Express + SQLite)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Email notification setup (using nodemailer)
const nodemailer = require('nodemailer');

// Create transporter for email notifications
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Admin configuration (will be set during setup)
let adminConfig = {
  name: '',
  email: '',
  phone: '',
  familyName: '',
  address: ''
};

// Check if admin is already set up
function isAdminSetup() {
  return adminConfig.email !== '';
}

// Function to send notification email
async function sendNewUserNotification(userEmail) {
  const adminEmail = adminConfig.email || process.env.ADMIN_EMAIL || 'admin@familytree.com';
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: adminEmail,
    subject: `🌳 New User Registration - ${adminConfig.familyName || 'Family Tree App'}`,
    html: `
      <h2>New User Registration</h2>
      <p>A new user has registered for the ${adminConfig.familyName || 'Family Tree App'}:</p>
      <ul>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>Please log into the admin dashboard to approve or reject this user.</p>
      <p><a href="https://blackfamily.vercel.app">Go to Admin Dashboard</a></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('New user notification sent to admin');
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
}

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL || 'https://your-frontend.vercel.app',
        'https://blackfamily.vercel.app',
        'https://blackfamily-k92rbe7i5-colby-blacks-projects.vercel.app'
      ] 
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
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
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
    
    // Send notification email to admin
    sendNewUserNotification(email);
    
    res.json({ 
      message: 'Registration successful! Your account is pending admin approval. You will be notified when approved.',
      userId: this.lastID 
    });
  });
});

// --- Login ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.approved) return res.status(403).json({ error: 'Account not approved yet. Please wait for admin approval.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: !!user.is_admin }, SECRET, { expiresIn: '7d' });
    res.json({ token, is_admin: !!user.is_admin });
  });
});

// --- List Pending Users (Admin) ---
app.get('/api/users/pending', authRequired, adminRequired, (req, res) => {
  db.all('SELECT id, email, created_at FROM users WHERE approved = 0 ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Approve User (Admin) ---
app.post('/api/users/:id/approve', authRequired, adminRequired, async (req, res) => {
  db.get('SELECT email FROM users WHERE id = ?', [req.params.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    
    db.run('UPDATE users SET approved = 1 WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Send approval notification email
      const approvalMailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: user.email,
        subject: '✅ Account Approved - Family Tree App',
        html: `
          <h2>Account Approved!</h2>
          <p>Your account has been approved by the administrator.</p>
          <p>You can now log in to the Family Tree App and start building your family tree!</p>
          <p><a href="https://blackfamily.vercel.app">Login to Family Tree App</a></p>
        `
      };
      
      transporter.sendMail(approvalMailOptions).catch(error => {
        console.error('Failed to send approval email:', error);
      });
      
      res.json({ approved: true, message: 'User approved and notification sent' });
    });
  });
});

// --- Reject/Delete User (Admin) ---
app.post('/api/users/:id/reject', authRequired, adminRequired, async (req, res) => {
  db.get('SELECT email FROM users WHERE id = ?', [req.params.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Send rejection notification email
      const rejectionMailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: user.email,
        subject: '❌ Account Application - Family Tree App',
        html: `
          <h2>Account Application Status</h2>
          <p>We regret to inform you that your account application for the Family Tree App has not been approved.</p>
          <p>If you believe this was an error, please contact the administrator.</p>
        `
      };
      
      transporter.sendMail(rejectionMailOptions).catch(error => {
        console.error('Failed to send rejection email:', error);
      });
      
      res.json({ deleted: true, message: 'User rejected and notification sent' });
    });
  });
});

// --- Admin Setup Endpoints ---

// Check if admin is already set up
app.get('/api/admin/status', (req, res) => {
  res.json({ isSetup: isAdminSetup() });
});

// Admin setup endpoint
app.post('/api/admin/setup', async (req, res) => {
  // Check if admin is already set up
  if (isAdminSetup()) {
    return res.status(400).json({ error: 'Admin is already set up' });
  }
  
  const { name, email, password, phone, familyName, address } = req.body;
  
  // Validation
  if (!name || !email || !password || !familyName) {
    return res.status(400).json({ error: 'Name, email, password, and family name are required' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  try {
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    // Create admin user in database
    db.run('INSERT INTO users (email, password_hash, is_admin, approved) VALUES (?, ?, 1, 1)', 
      [email, hash], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create admin account' });
        }
        
        // Set admin configuration
        adminConfig = {
          name,
          email,
          phone: phone || '',
          familyName,
          address: address || ''
        };
        
        console.log(`Admin setup completed for ${familyName} by ${name} (${email})`);
        
        res.json({ 
          message: 'Admin setup completed successfully',
          adminInfo: adminConfig
        });
      });
      
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({ error: 'Admin setup failed' });
  }
});

// Get admin configuration
app.get('/api/admin/config', (req, res) => {
  if (!isAdminSetup()) {
    return res.status(404).json({ error: 'Admin not set up' });
  }
  res.json(adminConfig);
});

// Get database stats
app.get('/api/admin/stats', (req, res) => {
  db.get('SELECT COUNT(*) as peopleCount FROM people', [], (err, peopleResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as relationshipsCount FROM relationships', [], (err2, relsResult) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      db.get('SELECT COUNT(*) as usersCount FROM users', [], (err3, usersResult) => {
        if (err3) return res.status(500).json({ error: err3.message });
        
        res.json({
          people: peopleResult.peopleCount,
          relationships: relsResult.relationshipsCount,
          users: usersResult.usersCount
        });
      });
    });
  });
});

// Clear all data (admin only)
app.post('/api/admin/clear-data', authRequired, adminRequired, (req, res) => {
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

// --- Get CSV Template ---
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
// Example: app.get('/api/people', treeAuth, ...)
// For now, you can add treeAuth to all /api/people and /api/relationships endpoints to require login.

// --- API Endpoints ---

// Get all people
app.get('/api/people', treeAuth, (req, res) => {
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Family Tree API server running at http://0.0.0.0:${PORT}`);
}); 