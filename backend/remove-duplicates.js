
const sqlite3 = require('sqlite3').verbose();

// Open SQLite DB
const db = new sqlite3.Database('./familytree.db', (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err);
    process.exit(1);
  }
  console.log('Connected to database for duplicate removal...');
});

async function removeDuplicates() {
  return new Promise((resolve, reject) => {
    // Find duplicates based on name and birthDate
    const findDuplicatesQuery = `
      SELECT name, birthDate, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM people 
      WHERE name IS NOT NULL AND name != ''
      GROUP BY name, birthDate 
      HAVING COUNT(*) > 1
      ORDER BY name
    `;

    db.all(findDuplicatesQuery, [], (err, duplicateGroups) => {
      if (err) {
        console.error('Error finding duplicates:', err);
        return reject(err);
      }

      if (duplicateGroups.length === 0) {
        console.log('✅ No duplicates found!');
        return resolve();
      }

      console.log(`\n🔍 Found ${duplicateGroups.length} groups of duplicates:`);
      
      let totalDuplicatesRemoved = 0;
      let processedGroups = 0;

      duplicateGroups.forEach(group => {
        const ids = group.ids.split(',').map(id => parseInt(id));
        const keepId = Math.min(...ids); // Keep the one with the lowest ID (first created)
        const removeIds = ids.filter(id => id !== keepId);

        console.log(`\n📋 "${group.name}" (${group.birthDate || 'No birth date'})`);
        console.log(`   Keeping ID: ${keepId}`);
        console.log(`   Removing IDs: ${removeIds.join(', ')}`);

        // Remove relationships for duplicate IDs
        removeIds.forEach(removeId => {
          db.run('DELETE FROM relationships WHERE person_id = ? OR related_id = ?', [removeId, removeId], (err) => {
            if (err) {
              console.error(`❌ Error removing relationships for ID ${removeId}:`, err);
            } else {
              console.log(`   ✅ Removed relationships for ID ${removeId}`);
            }
          });

          // Remove the duplicate person
          db.run('DELETE FROM people WHERE id = ?', [removeId], (err) => {
            if (err) {
              console.error(`❌ Error removing person ID ${removeId}:`, err);
            } else {
              console.log(`   ✅ Removed duplicate person ID ${removeId}`);
              totalDuplicatesRemoved++;
            }
          });
        });

        processedGroups++;
        
        // Check if we've processed all groups
        if (processedGroups === duplicateGroups.length) {
          setTimeout(() => {
            console.log(`\n🎉 Duplicate removal complete!`);
            console.log(`📊 Removed ${totalDuplicatesRemoved} duplicate entries`);
            resolve();
          }, 1000); // Give time for all deletions to complete
        }
      });
    });
  });
}

// Also check for exact duplicates (all fields the same)
async function removeExactDuplicates() {
  return new Promise((resolve, reject) => {
    const findExactDuplicatesQuery = `
      SELECT name, birthDate, deathDate, pronouns, bio, notes, 
             contact_email, contact_phone, contact_street, contact_city, contact_state, contact_zip,
             COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM people 
      GROUP BY name, birthDate, deathDate, pronouns, bio, notes, 
               contact_email, contact_phone, contact_street, contact_city, contact_state, contact_zip
      HAVING COUNT(*) > 1
    `;

    db.all(findExactDuplicatesQuery, [], (err, exactDuplicates) => {
      if (err) {
        console.error('Error finding exact duplicates:', err);
        return reject(err);
      }

      if (exactDuplicates.length === 0) {
        console.log('✅ No exact duplicates found!');
        return resolve();
      }

      console.log(`\n🔍 Found ${exactDuplicates.length} groups of exact duplicates:`);
      
      let totalExactDuplicatesRemoved = 0;
      let processedExactGroups = 0;

      exactDuplicates.forEach(group => {
        const ids = group.ids.split(',').map(id => parseInt(id));
        const keepId = Math.min(...ids); // Keep the one with the lowest ID
        const removeIds = ids.filter(id => id !== keepId);

        console.log(`\n📋 Exact duplicate: "${group.name}"`);
        console.log(`   Keeping ID: ${keepId}`);
        console.log(`   Removing exact duplicate IDs: ${removeIds.join(', ')}`);

        // Remove relationships and people for exact duplicates
        removeIds.forEach(removeId => {
          db.run('DELETE FROM relationships WHERE person_id = ? OR related_id = ?', [removeId, removeId], (err) => {
            if (err) console.error(`❌ Error removing relationships for exact duplicate ID ${removeId}:`, err);
          });

          db.run('DELETE FROM people WHERE id = ?', [removeId], (err) => {
            if (err) {
              console.error(`❌ Error removing exact duplicate ID ${removeId}:`, err);
            } else {
              console.log(`   ✅ Removed exact duplicate ID ${removeId}`);
              totalExactDuplicatesRemoved++;
            }
          });
        });

        processedExactGroups++;
        
        if (processedExactGroups === exactDuplicates.length) {
          setTimeout(() => {
            console.log(`\n🎉 Exact duplicate removal complete!`);
            console.log(`📊 Removed ${totalExactDuplicatesRemoved} exact duplicate entries`);
            resolve();
          }, 1000);
        }
      });
    });
  });
}

async function showStats() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as total FROM people', [], (err, result) => {
      if (err) {
        console.error('Error getting stats:', err);
      } else {
        console.log(`\n📊 Current database stats:`);
        console.log(`   Total people: ${result.total}`);
      }
      resolve();
    });
  });
}

async function main() {
  try {
    console.log('🧹 Starting duplicate removal process...\n');
    
    await showStats();
    await removeDuplicates();
    await removeExactDuplicates();
    await showStats();
    
    console.log('\n✨ All done! Your database should now be clean of duplicates.');
    
  } catch (error) {
    console.error('❌ Error during duplicate removal:', error);
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
