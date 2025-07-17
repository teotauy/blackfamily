
const sqlite3 = require('sqlite3').verbose();

// Open SQLite DB
const db = new sqlite3.Database('./familytree.db', (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err);
    process.exit(1);
  }
  console.log('Connected to database for clearing...');
});

async function clearAllData() {
  return new Promise((resolve, reject) => {
    console.log('🧹 Starting database cleanup...\n');
    
    // First check if tables exist
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='people'", [], (err, tableExists) => {
      if (err) {
        console.error('Error checking table existence:', err);
        return reject(err);
      }
      
      if (!tableExists) {
        console.log('⚠️  Tables don\'t exist yet. Database is already clean!');
        console.log('💡 Run the server first to create tables: cd backend && node server.js');
        return resolve();
      }
      
      // Show current stats
      db.get('SELECT COUNT(*) as people_count FROM people', [], (err, peopleResult) => {
        if (err) {
          console.error('Error getting people count:', err);
          return reject(err);
        }
      
      db.get('SELECT COUNT(*) as relationships_count FROM relationships', [], (err, relResult) => {
        if (err) {
          console.error('Error getting relationships count:', err);
          return reject(err);
        }
        
        console.log(`📊 Current database contents:`);
        console.log(`   People: ${peopleResult.people_count}`);
        console.log(`   Relationships: ${relResult.relationships_count}\n`);
        
        if (peopleResult.people_count === 0 && relResult.relationships_count === 0) {
          console.log('✅ Database is already empty!');
          return resolve();
        }
        
        console.log('🗑️  Clearing all family data...');
        
        // Delete relationships first (foreign key constraints)
        db.run('DELETE FROM relationships', [], function(err) {
          if (err) {
            console.error('❌ Error clearing relationships:', err);
            return reject(err);
          }
          
          console.log(`   ✅ Cleared ${this.changes} relationships`);
          
          // Then delete people
          db.run('DELETE FROM people', [], function(err) {
            if (err) {
              console.error('❌ Error clearing people:', err);
              return reject(err);
            }
            
            console.log(`   ✅ Cleared ${this.changes} people`);
            
            // Reset auto-increment counters
            db.run('DELETE FROM sqlite_sequence WHERE name="people"', [], function(err) {
              if (err) {
                console.log('   ⚠️  Note: Could not reset people ID counter');
              } else {
                console.log('   ✅ Reset people ID counter');
              }
            });
            
            db.run('DELETE FROM sqlite_sequence WHERE name="relationships"', [], function(err) {
              if (err) {
                console.log('   ⚠️  Note: Could not reset relationships ID counter');
              } else {
                console.log('   ✅ Reset relationships ID counter');
              }
              
              console.log('\n🎉 Database cleared successfully!');
              console.log('📝 You can now re-import your family data.');
              resolve();
            });
          });
        });
      });
    });
  });
}

async function main() {
  try {
    await clearAllData();
  } catch (error) {
    console.error('❌ Error during database clearing:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('🔒 Database connection closed.');
      }
    });
  }
}

main();
