const fs = require('fs');
const csv = require('csv-parser');

const API_BASE = 'https://blackfamily-production.up.railway.app/api';

async function importFamilyData() {
  console.log('Starting import to Railway backend...');
  
  const people = [];
  
  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream('sample-family-data.csv')
      .pipe(csv())
      .on('data', (row) => {
        people.push({
          name: `${row['First Name']} ${row['Last Name']}`,
          date_of_birth: row['DOB'],
          contact_email: row['Email'],
          contact_phone: row['Phone'],
          notes: row['Notes']
        });
      })
      .on('end', async () => {
        console.log(`Found ${people.length} people to import`);
        
        // Import each person
        for (const person of people) {
          try {
            const response = await fetch(`${API_BASE}/people`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(person)
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Imported: ${person.first_name} ${person.last_name}`);
            } else {
              console.error(`❌ Failed to import ${person.first_name} ${person.last_name}:`, await response.text());
            }
          } catch (error) {
            console.error(`❌ Error importing ${person.first_name} ${person.last_name}:`, error.message);
          }
        }
        
        console.log('Import complete!');
        resolve();
      })
      .on('error', reject);
  });
}

importFamilyData().catch(console.error);
