const generationColors = ['#4A90E2', '#50E3C2', '#F5A623', '#BD10E0', '#7ED321', '#9013FE'];
const defaultProfilePic = "images/placeholder_default.png";

// --- App State ---
let familyData = [];
let csvData = [];

// --- Local storage functions ---
function getLocalStorageData(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

function setLocalStorageData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    return false;
  }
}

// --- CSV Upload Functions ---
function handleCSVUpload(event) {
    const file = event.target.files[0];
    const errorDiv = document.getElementById('csv-error');
    const successDiv = document.getElementById('csv-success');
    const previewDiv = document.getElementById('csv-preview');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1).filter(line => line.trim()).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                return row;
            });
            
            csvData = rows;
            
            // Show preview
            let previewHTML = '<table class="csv-table"><thead><tr>';
            headers.forEach(header => {
                previewHTML += `<th>${header}</th>`;
            });
            previewHTML += '</tr></thead><tbody>';
            
            rows.slice(0, 5).forEach(row => {
                previewHTML += '<tr>';
                headers.forEach(header => {
                    previewHTML += `<td>${row[header] || ''}</td>`;
                });
                previewHTML += '</tr>';
            });
            
            if (rows.length > 5) {
                previewHTML += `<tr><td colspan="${headers.length}" style="text-align:center;color:#666;">... and ${rows.length - 5} more rows</td></tr>`;
            }
            
            previewHTML += '</tbody></table>';
            previewDiv.innerHTML = previewHTML;
            previewDiv.style.display = 'block';
            
            successDiv.textContent = `Found ${rows.length} people in CSV`;
            errorDiv.textContent = '';
            uploadBtn.style.display = 'inline-block';
        } catch (error) {
            errorDiv.textContent = 'Error parsing CSV file: ' + error.message;
            successDiv.textContent = '';
            previewDiv.style.display = 'none';
            uploadBtn.style.display = 'none';
        }
    };
    reader.readAsText(file);
}

async function uploadToBackend() {
    const errorDiv = document.getElementById('csv-error');
    const successDiv = document.getElementById('csv-success');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (!csvData || csvData.length === 0) {
        errorDiv.textContent = 'No CSV data to upload';
        return;
    }
    
    try {
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
        
        // Convert CSV data to family data format and save to localStorage
        const newFamilyData = csvData.map((row, index) => ({
            id: Date.now() + index,
            name: row.name || row.Name || row.NAME || '',
            birth_date: row.birth_date || row.birthDate || row.BirthDate || '',
            death_date: row.death_date || row.deathDate || row.DeathDate || '',
            gender: row.gender || row.Gender || row.GENDER || '',
            contact_email: row.contact_email || row.email || row.Email || '',
            contact_phone: row.contact_phone || row.phone || row.Phone || '',
            contact_street: row.contact_street || row.street || row.Street || '',
            contact_city: row.contact_city || row.city || row.City || '',
            contact_state: row.contact_state || row.state || row.State || '',
            contact_zip: row.contact_zip || row.zip || row.Zip || '',
            occupation: row.occupation || row.Occupation || '',
            notes: row.notes || row.Notes || ''
        }));
        
        // Save to localStorage
        setLocalStorageData('familyData', newFamilyData);
        familyData = newFamilyData;
        
        successDiv.textContent = 'Data uploaded successfully!';
        errorDiv.textContent = '';
        
        // Clear the form
        document.getElementById('csv-file').value = '';
        document.getElementById('csv-preview').style.display = 'none';
        uploadBtn.style.display = 'none';
        
        // Refresh the display
        renderFamilyTree();
        renderUpcomingBirthdays();
        
    } catch (error) {
        errorDiv.textContent = 'Upload failed: ' + error.message;
        successDiv.textContent = '';
    } finally {
        uploadBtn.textContent = 'Upload to Backend';
        uploadBtn.disabled = false;
    }
}

function downloadCSVTemplate() {
    const csvContent = 'name,birth_date,death_date,gender,contact_email,contact_phone,contact_street,contact_city,contact_state,contact_zip,occupation,notes\nJohn Doe,1990-01-01,,male,john@example.com,555-1234,123 Main St,Anytown,CA,12345,Engineer,Family patriarch\nJane Doe,1992-05-15,,female,jane@example.com,555-5678,123 Main St,Anytown,CA,12345,Designer,Family matriarch';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'family-tree-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// --- Load data from localStorage ---
async function loadFamilyDataFromAPI() {
    try {
        const people = getLocalStorageData('familyData') || [];
        const relationships = getLocalStorageData('relationships') || [];
        
        // Build relationships into people
        const personMap = new Map(people.map(p => [p.id, { ...p, parents: [], children: [], marriages: [], contact: {
            email: p.contact_email,
            phone: p.contact_phone,
            street: p.contact_street,
            city: p.contact_city,
            state: p.contact_state,
            zip: p.contact_zip
        }}]));
        
        relationships.forEach(rel => {
            const person = personMap.get(rel.person_id);
            if (!person) return;
            if (rel.type === 'parent') {
                person.parents.push(rel.related_id);
            } else if (rel.type === 'child') {
                person.children.push(rel.related_id);
            } else if (rel.type === 'spouse') {
                person.marriages.push({ spouseId: rel.related_id });
            }
        });
        
        familyData = Array.from(personMap.values());
        console.log('Loaded family data from localStorage:', familyData.length, 'people');
    } catch (error) {
        console.error('Error loading family data:', error);
        familyData = [];
    }
}

// --- Password Protection Functions ---
function showPasswordGate() {
    // Hide onboarding and show password gate
    document.getElementById('onboarding-overlay').style.display = 'none';
    document.getElementById('family-tree-app').style.display = 'none';
    
    // Create password gate HTML
    const passwordGateHTML = `
        <div id="password-gate" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
                width: 90%;
            ">
                <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">👨‍👩‍👧‍👦 Family Tree</h1>
                <p style="color: #666; margin-bottom: 30px; font-size: 16px;">Enter the family password to access the family tree and contact information</p>
                
                <div style="margin-bottom: 20px;">
                    <input type="password" id="family-password" placeholder="Enter family password" style="
                        width: 100%;
                        padding: 15px;
                        border: 2px solid #e1e5e9;
                        border-radius: 8px;
                        font-size: 16px;
                        outline: none;
                        transition: border-color 0.3s;
                    " onkeypress="if(event.key==='Enter') checkFamilyPassword()">
                </div>
                
                <button onclick="checkFamilyPassword()" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: transform 0.2s;
                    width: 100%;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    🔓 Access Family Tree
                </button>
                
                <div id="password-error" style="
                    color: #e74c3c;
                    margin-top: 15px;
                    font-size: 14px;
                    display: none;
                ">❌ Incorrect password. Please try again.</div>
            </div>
        </div>
    `;
    
    // Add password gate to page
    document.body.insertAdjacentHTML('beforeend', passwordGateHTML);
}

async function checkFamilyPassword() {
    const password = document.getElementById('family-password').value;
    const errorDiv = document.getElementById('password-error');
    
    // Set your family password here
    const correctPassword = 'SamBlack'; // You can change this to whatever you want
    
    if (password === correctPassword) {
        // Password correct - grant access
        sessionStorage.setItem('familyAccessGranted', 'true');
        document.getElementById('password-gate').remove();
        await showFamilyApp();
    } else {
        // Password incorrect
        errorDiv.style.display = 'block';
        document.getElementById('family-password').value = '';
        document.getElementById('family-password').focus();
    }
}

async function showFamilyApp() {
    console.log('Access granted - showing family app');
    
    // Load data from localStorage
    await loadFamilyDataFromAPI();
    
    // Show the main app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Setup all app functionality
    setupAppEventListeners();
    
    // Render the family tree
    renderFamilyTree();
    renderUpcomingBirthdays();
}

// --- Local storage functions for people and relationships ---
async function addPersonAPI(personObj) {
    const people = getLocalStorageData('familyData') || [];
    const newPerson = {
        ...personObj,
        id: Date.now() + Math.random() // Simple ID generation
    };
    people.push(newPerson);
    setLocalStorageData('familyData', people);
    familyData = people; // Update global state
    return newPerson.id;
}

async function updatePersonAPI(id, personObj) {
    const people = getLocalStorageData('familyData') || [];
    const index = people.findIndex(p => p.id == id);
    if (index !== -1) {
        people[index] = { ...people[index], ...personObj };
        setLocalStorageData('familyData', people);
        familyData = people; // Update global state
    }
}

async function deletePersonAPI(id) {
    const people = getLocalStorageData('familyData') || [];
    const filteredPeople = people.filter(p => p.id != id);
    setLocalStorageData('familyData', filteredPeople);
    familyData = filteredPeople; // Update global state
}

async function addRelationshipAPI(person_id, related_id, type) {
    const relationships = getLocalStorageData('relationships') || [];
    const newRelationship = {
        id: Date.now() + Math.random(),
        person_id: parseInt(person_id),
        related_id: parseInt(related_id),
        type: type
    };
    relationships.push(newRelationship);
    setLocalStorageData('relationships', relationships);
}

async function deleteRelationshipAPI(relId) {
    const relationships = getLocalStorageData('relationships') || [];
    const filteredRelationships = relationships.filter(r => r.id != relId);
    setLocalStorageData('relationships', filteredRelationships);
}

async function deletePerson(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    
    if (confirm(`Are you sure you want to delete ${person.name}? This will also delete all their relationships and cannot be undone.`)) {
        try {
            await deletePersonAPI(personId);
            alert(`${person.name} has been deleted successfully.`);
            
            // Reload data and refresh UI
            await loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            
            // Clear person info panel and remove selection styling
            const detailsContainer = document.getElementById('details-container');
            detailsContainer.classList.remove('person-selected');
            document.getElementById('person-info').innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #666;"><h3>👤 No Person Selected</h3><p>Click on anyone in the family tree to see their details here.</p></div>';
        } catch (error) {
            console.error('Error deleting person:', error);
            alert('Failed to delete person. Please try again.');
        }
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded - starting app initialization');
    
    // Clear any existing error messages
    const errorDivs = document.querySelectorAll('.error-message');
    errorDivs.forEach(div => {
        if (div.textContent === 'Load failed') {
            console.log('Clearing Load failed error');
            div.textContent = '';
        }
    });
    
    // Check if user is already authenticated
    const isAuthenticated = sessionStorage.getItem('familyAccessGranted');
    
    if (isAuthenticated) {
        // User already entered password, show app
        await showFamilyApp();
    } else {
        // Show password gate
        showPasswordGate();
    }
    
    console.log('App initialization complete');
});

// --- Family Tree Functions ---
function renderFamilyTree() {
    const container = document.getElementById('tree-container');
    if (!container) return;
    
    if (!familyData || familyData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <h3>🌳 No Family Data</h3>
                <p>Start by adding family members using the "Add Person" button above.</p>
            </div>
        `;
        return;
    }
    
    // Create a map for quick person lookup
    const personMap = new Map(familyData.map(p => [p.id, p]));
    
    // Find root person (someone with no parents or the first person)
    function renderRootOrSkip(person) {
        const hasParents = person.parents && person.parents.length > 0;
        if (hasParents) {
            // Find a parent to render as root
            const parent = personMap.get(person.parents[0]);
            if (parent) {
                return renderRootOrSkip(parent);
            }
        }
        return person;
    }
    
    const rootPerson = renderRootOrSkip(familyData[0]);
    if (!rootPerson) return;
    
    // Create the tree visualization
    const treeHTML = createPersonNodeDOM(rootPerson, personMap, 0);
    container.innerHTML = treeHTML;
}

function createPersonNodeDOM(person, personMap, level) {
    if (!person) return '';
    
    const children = person.children ? person.children.map(id => personMap.get(id)).filter(Boolean) : [];
    const spouses = person.marriages ? person.marriages.map(m => personMap.get(m.spouseId)).filter(Boolean) : [];
    
    const color = generationColors[level % generationColors.length];
    const age = person.birth_date ? calculateAge(person.birth_date) : '';
    const ageDisplay = age ? ` (${age})` : '';
    
    let html = `
        <div class="person-node" style="
            display: inline-block;
            margin: 10px;
            padding: 15px;
            background: ${color};
            color: white;
            border-radius: 10px;
            text-align: center;
            min-width: 120px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            cursor: pointer;
            transition: transform 0.2s;
        " onclick="displayPersonDetails(${person.id})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-weight: bold; margin-bottom: 5px;">${person.name}${ageDisplay}</div>
            <div style="font-size: 12px; opacity: 0.9;">${person.birth_date || 'No birth date'}</div>
        </div>
    `;
    
    // Add spouses
    if (spouses.length > 0) {
        html += '<div style="display: flex; justify-content: center; align-items: center; margin: 10px 0;">';
        spouses.forEach(spouse => {
            const spouseAge = spouse.birth_date ? calculateAge(spouse.birth_date) : '';
            const spouseAgeDisplay = spouseAge ? ` (${spouseAge})` : '';
            html += `
                <div class="person-node" style="
                    display: inline-block;
                    margin: 0 5px;
                    padding: 12px;
                    background: ${color};
                    color: white;
                    border-radius: 8px;
                    text-align: center;
                    min-width: 100px;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.2);
                    cursor: pointer;
                    transition: transform 0.2s;
                " onclick="displayPersonDetails(${spouse.id})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="font-weight: bold; margin-bottom: 3px;">${spouse.name}${spouseAgeDisplay}</div>
                    <div style="font-size: 11px; opacity: 0.9;">${spouse.birth_date || 'No birth date'}</div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    // Add children
    if (children.length > 0) {
        html += '<div style="display: flex; justify-content: center; margin-top: 20px;">';
        html += '<div style="display: flex; flex-direction: column; align-items: center;">';
        html += '<div style="width: 2px; height: 20px; background: #ccc; margin-bottom: 10px;"></div>';
        html += '<div style="display: flex; justify-content: center; gap: 20px;">';
        children.forEach(child => {
            html += createPersonNodeDOM(child, personMap, level + 1);
        });
        html += '</div>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function displayPersonDetails(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    
    const detailsContainer = document.getElementById('details-container');
    const personInfo = document.getElementById('person-info');
    
    // Add selection styling
    detailsContainer.classList.add('person-selected');
    
    const age = person.birth_date ? calculateAge(person.birth_date) : 'Unknown';
    const contactInfo = person.contact_email || person.contact_phone ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <h4>📞 Contact Information</h4>
            ${person.contact_email ? `<p><strong>Email:</strong> ${person.contact_email}</p>` : ''}
            ${person.contact_phone ? `<p><strong>Phone:</strong> ${person.contact_phone}</p>` : ''}
            ${person.contact_street ? `<p><strong>Address:</strong> ${person.contact_street}, ${person.contact_city}, ${person.contact_state} ${person.contact_zip}</p>` : ''}
        </div>
    ` : '';
    
    personInfo.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="color: #2c3e50; margin-bottom: 15px;">${person.name}</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p><strong>Age:</strong> ${age}</p>
                <p><strong>Birth Date:</strong> ${person.birth_date || 'Not specified'}</p>
                ${person.death_date ? `<p><strong>Death Date:</strong> ${person.death_date}</p>` : ''}
                <p><strong>Gender:</strong> ${person.gender || 'Not specified'}</p>
                ${person.occupation ? `<p><strong>Occupation:</strong> ${person.occupation}</p>` : ''}
            </div>
            ${person.notes ? `<div style="margin-bottom: 15px;"><h4>📝 Notes</h4><p>${person.notes}</p></div>` : ''}
            ${contactInfo}
            <div style="margin-top: 20px;">
                <button onclick="showEditRelationshipsModal(${person.id})" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-right: 10px;
                ">Edit Relationships</button>
                <button onclick="deletePerson(${person.id})" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                ">Delete Person</button>
            </div>
        </div>
    `;
}

function renderUpcomingBirthdays() {
    const container = document.getElementById('birthdays-list');
    if (!container) return;
    
    const upcoming = getUpcomingBirthdays(familyData, 30);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<li style="padding: 15px; text-align: center; color: #666;">No birthdays in the next 30 days</li>';
        return;
    }
    
    container.innerHTML = upcoming.map(person => {
        const daysUntil = getDaysUntilBirthday(person.birth_date);
        return `
            <li style="
                padding: 15px;
                margin-bottom: 10px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                cursor: pointer;
                transition: transform 0.2s;
            " onclick="displayPersonDetails(${person.id})" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; color: #2c3e50;">${person.name}</div>
                <div style="color: #7f8c8d; font-size: 14px;">${formatBirthday(person.birth_date)} (${daysUntil} days)</div>
            </li>
        `;
    }).join('');
}

function getUpcomingBirthdays(people, daysInAdvance) {
    if (!people || people.length === 0) return [];
    
    const today = new Date();
    const upcoming = [];
    
    people.forEach(person => {
        if (!person.birth_date) return;
        
        const birthday = new Date(person.birth_date);
        const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        
        // If this year's birthday has passed, check next year
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= daysInAdvance) {
            upcoming.push({ ...person, daysUntil });
        }
    });
    
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

function getDaysUntilBirthday(birthDate) {
    if (!birthDate) return 0;
    
    const today = new Date();
    const birthday = new Date(birthDate);
    const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
    
    if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    return Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
}

function formatBirthday(birthDate) {
    if (!birthDate) return '';
    
    const date = new Date(birthDate);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// --- Setup App Event Listeners ---
function setupAppEventListeners() {
    // Setup CSV upload
    const csvFileInput = document.getElementById('csv-file');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCSVUpload);
    }
    
    // Setup add person form
    const addPersonForm = document.getElementById('add-person-form');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', handleAddPersonFormSubmit);
    }
    
    // Setup search functionality
    const searchInput = document.getElementById('family-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleFamilySearch);
    }
    
    // Setup relationship calculator
    const relationshipForm = document.getElementById('relationship-form');
    if (relationshipForm) {
        relationshipForm.addEventListener('submit', handleCalculateRelationship);
    }
}

async function handleAddPersonFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const personData = {
        name: formData.get('name'),
        birth_date: formData.get('birth_date'),
        death_date: formData.get('death_date') || null,
        gender: formData.get('gender'),
        contact_email: formData.get('contact_email'),
        contact_phone: formData.get('contact_phone'),
        contact_street: formData.get('contact_street'),
        contact_city: formData.get('contact_city'),
        contact_state: formData.get('contact_state'),
        contact_zip: formData.get('contact_zip'),
        occupation: formData.get('occupation'),
        notes: formData.get('notes')
    };
    
    try {
        await addPersonAPI(personData);
        event.target.reset();
        
        // Refresh the display
        renderFamilyTree();
        renderUpcomingBirthdays();
        
        alert('Person added successfully!');
    } catch (error) {
        console.error('Error adding person:', error);
        alert('Failed to add person. Please try again.');
    }
}

function handleFamilySearch() {
    const searchTerm = document.getElementById('family-search').value.toLowerCase();
    const personNodes = document.querySelectorAll('.person-node');
    
    personNodes.forEach(node => {
        const personName = node.querySelector('div').textContent.toLowerCase();
        if (personName.includes(searchTerm)) {
            node.style.opacity = '1';
            node.style.transform = 'scale(1.1)';
        } else {
            node.style.opacity = '0.3';
            node.style.transform = 'scale(1)';
        }
    });
}

function handleCalculateRelationship() {
    const person1Id = parseInt(document.getElementById('person1-select').value);
    const person2Id = parseInt(document.getElementById('person2-select').value);
    
    if (!person1Id || !person2Id) {
        alert('Please select two people to calculate their relationship.');
        return;
    }
    
    if (person1Id === person2Id) {
        alert('Please select two different people.');
        return;
    }
    
    const personMap = new Map(familyData.map(p => [p.id, p]));
    const relationship = determineRelationship(person1Id, person2Id, personMap);
    
    const resultDiv = document.getElementById('relationship-result');
    resultDiv.innerHTML = `<p style="color: #27ae60; font-weight: bold;">${relationship}</p>`;
}

function determineRelationship(person1Id, person2Id, personMap) {
    const person1 = personMap.get(person1Id);
    const person2 = personMap.get(person2Id);
    
    if (!person1 || !person2) return 'Relationship not found';
    
    // Check if they're the same person
    if (person1Id === person2Id) return 'Same person';
    
    // Check if they're spouses
    if (person1.marriages && person1.marriages.some(m => m.spouseId === person2Id)) {
        return `${person1.name} and ${person2.name} are spouses`;
    }
    
    // Check parent-child relationships
    if (person1.parents && person1.parents.includes(person2Id)) {
        return `${person2.name} is ${person1.name}'s parent`;
    }
    if (person2.parents && person2.parents.includes(person1Id)) {
        return `${person1.name} is ${person2.name}'s parent`;
    }
    if (person1.children && person1.children.includes(person2Id)) {
        return `${person2.name} is ${person1.name}'s child`;
    }
    if (person2.children && person2.children.includes(person1Id)) {
        return `${person1.name} is ${person2.name}'s child`;
    }
    
    // Check if they're siblings
    if (person1.parents && person2.parents) {
        const commonParents = person1.parents.filter(p => person2.parents.includes(p));
        if (commonParents.length > 0) {
            return `${person1.name} and ${person2.name} are siblings`;
        }
    }
    
    return 'Relationship not determined';
}

function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    content.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #2c3e50;">Edit Relationships for ${person.name}</h3>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Parents:</label>
            <select id="parent-select" multiple style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                ${familyData.filter(p => p.id !== personId).map(p => 
                    `<option value="${p.id}" ${person.parents && person.parents.includes(p.id) ? 'selected' : ''}>${p.name}</option>`
                ).join('')}
            </select>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Children:</label>
            <select id="child-select" multiple style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                ${familyData.filter(p => p.id !== personId).map(p => 
                    `<option value="${p.id}" ${person.children && person.children.includes(p.id) ? 'selected' : ''}>${p.name}</option>`
                ).join('')}
            </select>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Spouse:</label>
            <select id="spouse-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="">No spouse</option>
                ${familyData.filter(p => p.id !== personId).map(p => 
                    `<option value="${p.id}" ${person.marriages && person.marriages.some(m => m.spouseId === p.id) ? 'selected' : ''}>${p.name}</option>`
                ).join('')}
            </select>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button onclick="closeModal()" style="
                padding: 10px 20px;
                background: #95a5a6;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">Cancel</button>
            <button onclick="saveRelationships(${personId})" style="
                padding: 10px 20px;
                background: #27ae60;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">Save Changes</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal on escape key
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
    
    function closeModal() {
        document.removeEventListener('keydown', escListener);
        document.body.removeChild(modal);
    }
    
    window.closeModal = closeModal;
    window.saveRelationships = async (personId) => {
        const parentSelect = document.getElementById('parent-select');
        const childSelect = document.getElementById('child-select');
        const spouseSelect = document.getElementById('spouse-select');
        
        const newParentIds = Array.from(parentSelect.selectedOptions).map(opt => parseInt(opt.value));
        const newChildIds = Array.from(childSelect.selectedOptions).map(opt => parseInt(opt.value));
        const newSpouseId = spouseSelect.value ? parseInt(spouseSelect.value) : null;
        
        try {
            await updatePersonRelationships(personId, newParentIds, newChildIds, newSpouseId);
            closeModal();
            renderFamilyTree();
            alert('Relationships updated successfully!');
        } catch (error) {
            console.error('Error updating relationships:', error);
            alert('Failed to update relationships. Please try again.');
        }
    };
}

async function updatePersonRelationships(personId, newParentIds, newChildIds, newSpouseId) {
    // Update the person's relationships in localStorage
    const people = getLocalStorageData('familyData') || [];
    const personIndex = people.findIndex(p => p.id == personId);
    
    if (personIndex !== -1) {
        people[personIndex].parents = newParentIds;
        people[personIndex].children = newChildIds;
        people[personIndex].marriages = newSpouseId ? [{ spouseId: newSpouseId }] : [];
        setLocalStorageData('familyData', people);
        familyData = people;
    }
    
    // Update relationships in the relationships table
    const relationships = getLocalStorageData('relationships') || [];
    
    // Remove old relationships for this person
    const filteredRelationships = relationships.filter(r => r.person_id !== personId);
    
    // Add new relationships
    const newRelationships = [];
    
    newParentIds.forEach(parentId => {
        newRelationships.push({
            id: Date.now() + Math.random(),
            person_id: personId,
            related_id: parentId,
            type: 'parent'
        });
    });
    
    newChildIds.forEach(childId => {
        newRelationships.push({
            id: Date.now() + Math.random(),
            person_id: personId,
            related_id: childId,
            type: 'child'
        });
    });
    
    if (newSpouseId) {
        newRelationships.push({
            id: Date.now() + Math.random(),
            person_id: personId,
            related_id: newSpouseId,
            type: 'spouse'
        });
    }
    
    setLocalStorageData('relationships', [...filteredRelationships, ...newRelationships]);
}