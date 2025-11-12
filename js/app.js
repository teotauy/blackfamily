const generationColors = ['#4A90E2', '#50E3C2', '#F5A623', '#BD10E0', '#7ED321', '#9013FE'];
const defaultProfilePic = "images/placeholder_default.png"; // Path to your default placeholder

// --- API URL ---
const API_BASE = 'https://blackfamilybackend.onrender.com/api';

// --- Onboarding State ---
let currentStep = 1;
let onboardingAuthToken = '';
let csvData = [];

// --- Onboarding Functions ---
function nextStep() {
    if (currentStep < 4) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(el => el.classList.remove('active'));
    
    // Show current step
    document.getElementById(`step-${step}`).classList.add('active');
    
    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === step - 1);
    });
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('show-login-btn').style.background = '#3498db';
    document.getElementById('show-register-btn').style.background = '#95a5a6';
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('show-login-btn').style.background = '#95a5a6';
    document.getElementById('show-register-btn').style.background = '#3498db';
}

async function handleLogin() {
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!password) {
        errorDiv.textContent = 'Please enter the family password';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        onboardingAuthToken = data.token;
        errorDiv.textContent = '';
        nextStep();
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

async function handleRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    if (!email || !password || !confirmPassword) {
        errorDiv.textContent = 'Please fill in all fields';
        return;
    }
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters long';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        errorDiv.textContent = '';
        successDiv.textContent = data.message || 'Registration successful! Please wait for admin approval.';
        
        // Clear form
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        
        // Show login form after successful registration
        setTimeout(() => {
            showLoginForm();
            successDiv.textContent = '';
        }, 3000);
        
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

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
            uploadBtn.disabled = false;
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
    
    if (!authToken) {
        errorDiv.textContent = 'Please login first';
        return;
    }
    
    if (!csvData.length) {
        errorDiv.textContent = 'No CSV data to upload';
        return;
    }
    
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
    try {
        beginLoaderCountdown();
        const normalizeValue = (val) => (val || '').trim().toLowerCase();
        const toKey = (firstName, lastName, dob, phone) => {
            return `${normalizeValue(firstName)}|${normalizeValue(lastName)}|${normalizeValue(dob)}|${normalizeValue(phone)}`;
        };

        const existingKeys = new Set(
            familyData.map(person => {
                // Attempt to split existing name into first/last
                const parts = (person.name || '').trim().split(/\s+/);
                const last = parts.length > 1 ? parts.pop() : '';
                const first = parts.join(' ');
                return toKey(first, last, person.birthDate || '', person.contact_phone || '');
            })
        );

        let insertedCount = 0;
        const peopleData = csvData.map(row => {
            const firstName = row['First Name'] || '';
            const lastName = row['Last Name'] || '';
            const key = toKey(firstName, lastName, row['DOB'] || row['Birth Date'] || '', row['Phone'] || '');
            const isDuplicate = existingKeys.has(key);
            if (!isDuplicate) {
                existingKeys.add(key);
            }
            return {
                key,
                skip: isDuplicate,
                payload: {
                    name: `${firstName} ${lastName}`.trim(),
                    birthDate: row['DOB'] || row['Birth Date'] || '',
                    contact_email: row['Email'] || '',
                    contact_phone: row['Phone'] || '',
                    pronouns: row['Pronouns'] || row['Preferred Pronouns'] || row['Preferred Pronoun'] || row['Preferred Pronoun(s)'] || '',
                    bio: `Imported from CSV: ${row['Notes'] || ''}`
                }
            };
        });
        
        // Upload each person to the backend
        for (const person of peopleData) {
            if (person.skip) {
                continue;
            }
            const response = await fetch(`${API_BASE}/people`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(person.payload)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to upload: ${response.statusText}`);
            }
            insertedCount += 1;
        }
        
        successDiv.textContent = `Added ${insertedCount} new people. Skipped ${peopleData.length - insertedCount} duplicates.`;
        errorDiv.textContent = '';
        await loadFamilyDataFromAPI();
        renderFamilyTree();
        renderUpcomingBirthdays();
        const csvModal = document.getElementById('csv-upload-modal');
        if (csvModal) {
            csvModal.style.display = 'none';
        }
        csvData = [];
    } catch (error) {
        errorDiv.textContent = `Upload failed: ${error.message}`;
        successDiv.textContent = '';
    } finally {
        uploadBtn.textContent = 'Upload to Database';
        uploadBtn.disabled = false;
        completeLoaderRequest();
        hideGlobalLoader();
    }
}

function completeOnboarding() {
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

function downloadCSVTemplate() {
    // Create a link element to download the CSV template
    const link = document.createElement('a');
    link.href = `${API_BASE}/csv-template`;
    link.download = 'family-tree-template.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function skipOnboarding() {
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Check if user is already logged in
    if (authToken) {
        updateUIForAuth();
        loadFamilyDataFromAPI();
        renderFamilyTree();
        renderUpcomingBirthdays();
        setupAppEventListeners();
    } else {
        showAuthModal();
    }
}

// --- Authentication State ---
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let familyData = [];
let appEventListenersInitialized = false;

// --- UI Helpers ---
function getDefaultPersonCardMarkup() {
  return `
    <div class="empty-state">
      <h3>👤 No Person Selected</h3>
      <p>Choose someone from the tree to explore their story.</p>
    </div>
  `;
}

// --- Loader State ---
const loaderElements = {
  container: null,
  primaryText: null,
  secondaryText: null,
  retryButton: null
};

const loaderState = {
  activeRequests: 0,
  revealTimer: null,
  lockVisible: false
};

function ensureLoaderElements() {
  if (loaderElements.container) {
    return;
  }
  loaderElements.container = document.getElementById('global-loader');
  loaderElements.primaryText = document.getElementById('loader-primary-text');
  loaderElements.secondaryText = document.getElementById('loader-secondary-text');
  loaderElements.retryButton = document.getElementById('loader-retry-button');

  if (loaderElements.retryButton) {
    loaderElements.retryButton.addEventListener('click', () => {
      loaderState.lockVisible = false;
      loaderState.activeRequests = 0;
      hideGlobalLoader();
      window.location.reload();
    });
    loaderElements.retryButton.style.display = 'none';
  }
}

function showGlobalLoader({ primary, secondary, showRetry = false, lock = false } = {}) {
  ensureLoaderElements();
  if (!loaderElements.container) {
    return;
  }
  loaderElements.primaryText.textContent = primary || 'Waking the family tree…';
  loaderElements.secondaryText.textContent = secondary || '';
  loaderElements.retryButton.style.display = showRetry ? 'block' : 'none';
  loaderState.lockVisible = lock;
  loaderElements.container.classList.add('visible');
  loaderElements.container.setAttribute('aria-hidden', 'false');
}

function hideGlobalLoader() {
  ensureLoaderElements();
  if (!loaderElements.container || loaderState.lockVisible) {
    return;
  }
  loaderElements.container.classList.remove('visible');
  loaderElements.container.setAttribute('aria-hidden', 'true');
  if (loaderElements.retryButton) {
    loaderElements.retryButton.style.display = 'none';
  }
}

function beginLoaderCountdown() {
  ensureLoaderElements();
  loaderState.activeRequests += 1;
  if (loaderState.revealTimer) {
    return;
  }
  loaderState.revealTimer = setTimeout(() => {
    loaderState.revealTimer = null;
    if (loaderState.activeRequests > 0) {
      const fact = calculateNextBirthdayFact({ fallback: 'Gathering family milestones…', short: true });
      showGlobalLoader({
        primary: 'Waking the family records…',
        secondary: fact || 'Hang tight while we connect.',
        showRetry: false,
        lock: false
      });
    }
  }, 1200);
}

function completeLoaderRequest() {
  loaderState.activeRequests = Math.max(0, loaderState.activeRequests - 1);
  if (loaderState.activeRequests === 0) {
    if (loaderState.revealTimer) {
      clearTimeout(loaderState.revealTimer);
      loaderState.revealTimer = null;
    }
    if (!loaderState.lockVisible) {
      setTimeout(() => hideGlobalLoader(), 150);
    }
  }
}

function showLoaderErrorMessage(message) {
  const secondary = 'The server might be waking up. Try again in a few seconds or tap retry.';
  showGlobalLoader({
    primary: message || 'Having trouble reaching the server…',
    secondary,
    showRetry: true,
    lock: true
  });
}

// Restore user info from token if available
async function restoreUserFromToken() {
  if (authToken) {
    // Simple token system - if we have a token, we're logged in
    currentUser = {
      email: 'family@blackfamily.com',
      is_admin: true
    };
    console.log('Restored user from token:', currentUser);
  }
}

// --- Auth Functions ---
function showAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) {
    authModal.style.display = 'flex';
  } else {
    console.warn('auth-modal element is missing from the HTML.');
    return;
  }
  const closeBtn = document.getElementById('close-auth-modal');
  if (closeBtn) {
    closeBtn.onclick = hideAuthModal;
  } else {
    console.warn('close-auth-modal element is missing from the HTML.');
  }
}

function hideAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) {
    authModal.style.display = 'none';
  }
  const loginErrorEl = document.getElementById('login-error');
  if (loginErrorEl) {
    loginErrorEl.textContent = '';
  }
  const registerErrorEl = document.getElementById('register-error');
  if (registerErrorEl) {
    registerErrorEl.textContent = '';
  }
}

function showLoginForm() {
  const titleEl = document.getElementById('auth-modal-title');
  if (titleEl) {
    titleEl.textContent = 'Login';
  }
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.style.display = 'block';
  }
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.style.display = 'none';
  }
  const toggleBtn = document.getElementById('toggle-auth-mode');
  if (toggleBtn) {
    toggleBtn.textContent = "Don't have an account? Register";
  }
}

function showRegisterForm() {
  const titleEl = document.getElementById('auth-modal-title');
  if (titleEl) {
    titleEl.textContent = 'Register';
  }
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.style.display = 'none';
  }
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.style.display = 'block';
  }
  const toggleBtn = document.getElementById('toggle-auth-mode');
  if (toggleBtn) {
    toggleBtn.textContent = 'Already have an account? Login';
  }
}

async function login(phone, password) {
  try {
    beginLoaderCountdown();
    const response = await fetch(`${API_BASE}/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Access denied');
    }
    
    authToken = data.token;
    currentUser = { 
      email: 'family@blackfamily.com', 
      is_admin: true,
      phone: phone,
      personId: data.personId
    };
    localStorage.setItem('authToken', authToken);
    hideAuthModal();
    const appContainer = document.getElementById('family-tree-app');
    if (appContainer) {
      appContainer.style.display = 'block';
    }
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.display = 'grid';
    }
    const actionsToolbar = document.getElementById('actions-toolbar');
    if (actionsToolbar) {
      actionsToolbar.style.display = 'grid';
    }
    const searchSection = document.getElementById('search-section-container');
    if (searchSection) {
      searchSection.style.display = 'block';
    }
    const relationshipFinder = document.getElementById('relationship-finder-container');
    if (relationshipFinder) {
      relationshipFinder.style.display = 'block';
    }
    updateUIForAuth();
    await loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners(); // Setup all app functionality after login
    hideGlobalLoader();
  } catch (error) {
    document.getElementById('login-error').textContent = error.message;
    hideGlobalLoader();
  } finally {
    completeLoaderRequest();
  }
}

async function register(email, password) {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    document.getElementById('register-error').textContent = 'Registration successful! Please wait for admin approval.';
    setTimeout(() => {
      showLoginForm();
    }, 2000);
  } catch (error) {
    document.getElementById('register-error').textContent = error.message;
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  familyData = []; // Clear cached family data
  appEventListenersInitialized = false;
  loaderState.lockVisible = false;
  hideGlobalLoader();
  localStorage.removeItem('authToken');
  
  // Clear any displayed content
  const personInfo = document.getElementById('person-info');
  if (personInfo) {
    personInfo.innerHTML = getDefaultPersonCardMarkup();
  }
  const treeContainer = document.getElementById('tree-container');
  if (treeContainer) {
    treeContainer.innerHTML = '<p class="empty-state-text">Add a family member to start shaping the tree.</p>';
  }
  const birthdaysList = document.getElementById('birthdays-list');
  if (birthdaysList) {
    birthdaysList.innerHTML = '<li class="empty-state-text">No birthdays soon.</li>';
  }
  
  updateUIForAuth();
  showAuthModal();
}

function updateUIForAuth() {
  const isLoggedIn = !!authToken;
  const isAdmin = currentUser?.is_admin;
  const headerAuthSection = document.getElementById('header-auth-section');
  
  console.log('updateUIForAuth called:', { isLoggedIn, isAdmin, currentUser });
  
  // Update header auth section
  if (headerAuthSection) {
    headerAuthSection.innerHTML = `
      <div class="auth-banner">
        <span class="auth-greeting">Welcome to the Black Family Tree (${currentUser?.phone || 'Family Member'})</span>
        <button id="logout-btn" class="ghost danger small">Logout</button>
      </div>
    `;
    
    // Re-attach event listeners
    document.getElementById('logout-btn').onclick = logout;
  } else {
    console.warn('header-auth-section element is missing from the HTML.');
  }
  
  // Show/hide main app content
  const mainContent = document.querySelector('main');
  const actionsToolbar = document.getElementById('actions-toolbar');
  const searchSection = document.getElementById('search-section-container');
  const relationshipFinder = document.getElementById('relationship-finder-container');
  
  console.log('Main content elements found:', {
    mainContent: !!mainContent,
    actionsToolbar: !!actionsToolbar,
    searchSection: !!searchSection,
    relationshipFinder: !!relationshipFinder
  });
  
  if (isLoggedIn) {
    console.log('User is logged in, showing main content...');
    if (mainContent) mainContent.style.display = 'grid';
    if (actionsToolbar) actionsToolbar.style.display = 'grid';
    if (searchSection) searchSection.style.display = 'block';
    if (relationshipFinder) relationshipFinder.style.display = 'block';
    
    // Load family data and setup app
    loadFamilyDataFromAPI().then(() => {
      console.log('Family data loaded, rendering tree and setting up app...');
      renderFamilyTree();
      renderUpcomingBirthdays();
      setupAppEventListeners();
    }).catch(error => {
      console.error('Failed to load family data:', error);
    });
  } else {
    console.log('User is not logged in, hiding main content...');
    if (mainContent) mainContent.style.display = 'none';
    if (actionsToolbar) actionsToolbar.style.display = 'none';
    if (searchSection) searchSection.style.display = 'none';
    if (relationshipFinder) relationshipFinder.style.display = 'none';
    
    // Show a message indicating login is required
    if (!document.getElementById('login-required-message')) {
      const loginMessage = document.createElement('div');
      loginMessage.id = 'login-required-message';
      loginMessage.style.cssText = 'text-align: center; padding: 60px 20px; background: #f8f9fa; border-radius: 12px; margin: 40px auto; max-width: 600px;';
      loginMessage.innerHTML = `
        <h2 style="color: #2c3e50; margin-bottom: 20px;">🌳 Welcome to the Family Tree</h2>
        <p style="color: #7f8c8d; font-size: 18px; margin-bottom: 30px;">Please log in to view and manage your family data.</p>
        <button onclick="showAuthModal()" style="padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: bold;">🔐 Login to Get Started</button>
      `;
      document.body.appendChild(loginMessage);
    }
    const personInfo = document.getElementById('person-info');
    if (personInfo) {
      personInfo.innerHTML = getDefaultPersonCardMarkup();
    }
  }
  
  // Remove login message if logged in
  if (isLoggedIn) {
    const loginMessage = document.getElementById('login-required-message');
    if (loginMessage) loginMessage.remove();
  }
}



async function clearAllData() {
  if (!confirm('Are you sure you want to clear all family data? This action cannot be undone.')) {
    return;
  }
  
  try {
    await fetch(`${API_BASE}/clear-data`, {
      method: 'POST'
    });
    alert('All data cleared successfully');
    location.reload();
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Failed to clear data');
  }
}

// --- API Helper with Auth ---
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    }
  };
  
  try {
    beginLoaderCountdown();
    const response = await fetch(url, config);
    if (response.status === 401) {
      console.log('Authentication failed, logging out...');
      logout();
      completeLoaderRequest();
      return null;
    }
    if (!response.ok) {
      let message = `API call failed: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody && errorBody.error) {
          message = errorBody.error;
        }
      } catch {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }
    completeLoaderRequest();
    hideGlobalLoader();
    return response;
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    if (error.message && error.message.includes('Failed to fetch')) {
      showLoaderErrorMessage('Still reaching for the family server…');
    }
    if (authToken && error.message && error.message.includes('fetch')) {
      logout();
    }
    completeLoaderRequest();
    throw error;
  }
}

// --- Load data from backend on page load ---
async function loadFamilyDataFromAPI() {
    try {
        const [peopleRes, relsRes] = await Promise.all([
            apiCall('/people'),
            apiCall('/relationships')
        ]);
        if (!peopleRes || !relsRes) {
            console.error('Failed to load data from API');
            return;
        }
        const people = await peopleRes.json();
        const relationships = await relsRes.json();
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
                if (!person.parents.includes(rel.related_id)) {
                    person.parents.push(rel.related_id);
                }
            } else if (rel.type === 'child') {
                if (!person.children.includes(rel.related_id)) {
                    person.children.push(rel.related_id);
                }
            } else if (rel.type === 'spouse') {
                const alreadyLinked = person.marriages.some(marriage => marriage.spouseId === rel.related_id);
                if (!alreadyLinked) {
                    person.marriages.push({ spouseId: rel.related_id });
                }
            }
        });
        familyData = Array.from(personMap.values()).map(person => ({
            ...person,
            parents: Array.from(new Set(person.parents)),
            children: Array.from(new Set(person.children)),
            marriages: person.marriages.reduce((unique, marriage) => {
                if (!unique.some(existing => existing.spouseId === marriage.spouseId)) {
                    unique.push(marriage);
                }
                return unique;
            }, [])
        }));
    } catch (error) {
        console.error('Error loading family data:', error);
    }
}

// --- Replace initial data load ---
document.addEventListener('DOMContentLoaded', async () => {
    // Restore user from token first
    ensureLoaderElements();
    hideGlobalLoader();
    await restoreUserFromToken();
    
    // Always update UI first to show correct initial state
    updateUIForAuth();
    
    // Check if user is already logged in
    if (authToken && currentUser) {
        try {
            // Try to load data - if it fails, user will be logged out automatically
            await loadFamilyDataFromAPI();
            if (familyData.length > 0) {
                renderFamilyTree();
                renderUpcomingBirthdays();
                setupAppEventListeners(); // Setup all app functionality after successful auth
            }
            // Update UI again after successful data load
            updateUIForAuth();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            // If loading fails, the apiCall function will handle logout
        }
    } else {
        // Show login modal if no token or user
        showAuthModal();
    }
    
    // Setup auth event listeners
    setupAuthEventListeners();
});

// --- Replace add/edit/delete person/relationship logic with API calls ---
// Example for adding a person:
async function addPersonAPI(personObj) {
    const res = await apiCall('/people', {
        method: 'POST',
        body: JSON.stringify(personObj)
    });
    if (!res) return null;
    const data = await res.json();
    return data.id;
}

async function updatePersonAPI(id, personObj) {
    await apiCall(`/people/${id}`, {
        method: 'PUT',
        body: JSON.stringify(personObj)
    });
}

async function deletePersonAPI(id) {
    await apiCall(`/people/${id}`, { method: 'DELETE' });
}

async function addRelationshipAPI(person_id, related_id, type) {
    await apiCall('/relationships', {
        method: 'POST',
        body: JSON.stringify({ person_id, related_id, type })
    });
}

async function deleteRelationshipAPI(relId) {
    await apiCall(`/relationships/${relId}`, { method: 'DELETE' });
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
            document.getElementById('person-info').innerHTML = getDefaultPersonCardMarkup();
        } catch (error) {
            console.error('Error deleting person:', error);
            alert('Failed to delete person. Please try again.');
        }
    }
}

// --- Existing code ...

// Function to calculate the "Next Birthday" fact
function calculateNextBirthdayFact(options = {}) {
    const fallback = options.fallback || '';
    if (!familyData || familyData.length === 0) {
        return fallback;
    }

    const today = new Date();
    let soonest = null;

    familyData.forEach(person => {
        if (!person.birthDate) {
            return;
        }
        const birthDate = new Date(person.birthDate);
        if (isNaN(birthDate.getTime())) {
            return;
        }
        const target = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (target < today) {
            target.setFullYear(today.getFullYear() + 1);
        }
        if (!soonest || target < soonest.target) {
            soonest = { person, target, birthDate };
        }
    });

    if (!soonest) {
        return fallback;
    }

    const formattedDate = soonest.target.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    let ageText = '';
    if (!isNaN(soonest.birthDate.getTime())) {
        const upcomingAge = soonest.target.getFullYear() - soonest.birthDate.getFullYear();
        if (Number.isFinite(upcomingAge)) {
            ageText = upcomingAge;
        }
    }

    if (options.short) {
        return `${soonest.person.name} • ${formattedDate}${ageText ? ` (${ageText})` : ''}`;
    }

    return ageText
        ? `Next up: ${soonest.person.name} turns ${ageText} on ${formattedDate}.`
        : `Next up: Celebrate ${soonest.person.name} on ${formattedDate}.`;
}

function getZodiacSign(month, day) {
    const md = (month + 1) * 100 + day;
    if (md >= 321 && md <= 419) return 'Aries';
    if (md >= 420 && md <= 520) return 'Taurus';
    if (md >= 521 && md <= 620) return 'Gemini';
    if (md >= 621 && md <= 722) return 'Cancer';
    if (md >= 723 && md <= 822) return 'Leo';
    if (md >= 823 && md <= 922) return 'Virgo';
    if (md >= 923 && md <= 1022) return 'Libra';
    if (md >= 1023 && md <= 1121) return 'Scorpio';
    if (md >= 1122 && md <= 1221) return 'Sagittarius';
    if (md >= 1222 || md <= 119) return 'Capricorn';
    if (md >= 120 && md <= 218) return 'Aquarius';
    return 'Pisces';
}

function collectZodiacCounts() {
    const counts = {};
    if (!familyData || familyData.length === 0) {
        return counts;
    }
    familyData.forEach(person => {
        if (!person.birthDate) return;
        const birthDate = new Date(person.birthDate);
        if (isNaN(birthDate.getTime())) return;
        const sign = getZodiacSign(birthDate.getMonth(), birthDate.getDate());
        counts[sign] = (counts[sign] || 0) + 1;
    });
    return counts;
}

// Function to calculate the "Least Common Zodiac Sign" fact
function calculateLeastCommonZodiacSignFact() {
    const counts = collectZodiacCounts();
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        return '';
    }
    entries.sort((a, b) => a[1] - b[1]);
    const [sign, total] = entries[0];
    return `Rarest sign in the family: ${sign} (${total} member${total === 1 ? '' : 's'}).`;
}

// Function to calculate the "Most Common Zodiac Sign" fact
function calculateMostCommonZodiacSignFact() {
    const counts = collectZodiacCounts();
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        return '';
    }
    entries.sort((a, b) => b[1] - a[1]);
    const [sign, total] = entries[0];
    return `Most common sign: ${sign} (${total} member${total === 1 ? '' : 's'}).`;
}

function calculateFamilySizeFact() {
    if (!familyData || familyData.length === 0) {
        return '';
    }
    const total = familyData.length;
    return `We’re tracking ${total} family member${total === 1 ? '' : 's'} so far.`;
}

// Array of functions that calculate facts. Add more fact functions here later.
const familyFactCalculators = [
    calculateNextBirthdayFact,
    calculateLeastCommonZodiacSignFact,
    calculateMostCommonZodiacSignFact,
    calculateFamilySizeFact
];

// Function to display a random fact
function displayRandomFact() {
    const factDisplayElement = document.getElementById('random-fact-display');
    if (!factDisplayElement) {
        console.error("Random fact display element not found!");
        return;
    }

    if (!familyData || familyData.length === 0) {
        factDisplayElement.innerHTML = '<p class="empty-state-text">We’ll show fun facts once the family data loads.</p>';
        return;
    }

    const facts = familyFactCalculators
        .map(fn => fn({ fallback: '' }))
        .filter(Boolean);

    if (facts.length === 0) {
        factDisplayElement.innerHTML = '<p class="empty-state-text">We’re still curating family highlights.</p>';
        return;
    }

    const randomIndex = Math.floor(Math.random() * facts.length);
    factDisplayElement.innerHTML = `<p>${facts[randomIndex]}</p>`;
}

function setupAuthEventListeners() {
  const closeBtn = document.getElementById('close-auth-modal');
  if (closeBtn) {
    closeBtn.onclick = hideAuthModal;
  } else {
    console.warn('close-auth-modal element is missing from the HTML.');
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const phone = document.getElementById('login-phone').value;
      const password = document.getElementById('login-password').value;
      login(phone, password);
    };
  } else {
    console.warn('login-form element is missing from the HTML.');
  }
}

// Setup all the app event listeners (only called after successful login)
function setupAppEventListeners() {
    if (appEventListenersInitialized) {
        return;
    }
    appEventListenersInitialized = true;
    // Setup Autocompletes
    setupAutocomplete('add-parents-input', 'add-parents-suggestions', 'selected-parents-list', 'add-parents-ids', 'parent');
    setupAutocomplete('add-children-input', 'add-children-suggestions', 'selected-children-list', 'add-children-ids', 'child');
    setupAutocomplete('add-spouse-input', 'add-spouse-suggestions', 'selected-spouse-display', 'add-spouse-id-hidden', 'spouse');

    // Setup for Relationship Finder autocompletes
    setupAutocomplete('person1-relationship-input', 'person1-relationship-suggestions', 'selected-person1-display', 'person1-relationship-id', 'relFinderPerson1');
    setupAutocomplete('person2-relationship-input', 'person2-relationship-suggestions', 'selected-person2-display', 'person2-relationship-id', 'relFinderPerson2');

    const importCsvButton = document.getElementById('import-csv-button');
    if (importCsvButton) {
        importCsvButton.addEventListener('click', () => {
            const csvModal = document.getElementById('csv-upload-modal');
            if (csvModal) {
                csvModal.style.display = 'block';
            }
        });
    }

    const csvFileInput = document.getElementById('csv-file');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCSVUpload);
    }

    const csvCancelBtn = document.querySelector('#csv-upload-modal button[onclick=\"closeCSVModal()\"]');
    if (csvCancelBtn) {
        csvCancelBtn.addEventListener('click', () => {
            const csvModal = document.getElementById('csv-upload-modal');
            if (csvModal) {
                csvModal.style.display = 'none';
            }
        });
    }

    const csvUploadBtn = document.getElementById('upload-btn');
    if (csvUploadBtn) {
        csvUploadBtn.addEventListener('click', uploadToBackend);
    }

    const addPersonForm = document.getElementById('add-person-form');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', handleAddPersonFormSubmit);
    } else {
        console.error("Add person form not found!");
    }

    const searchInput = document.getElementById('family-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleFamilySearch);
        // Optional: Hide results if clicked outside
        document.addEventListener('click', function(event) {
            const resultsContainer = document.getElementById('family-search-results');
            if (resultsContainer && !searchInput.contains(event.target) && !resultsContainer.contains(event.target)) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
            }
        });
    } else {
        console.error("Family search input not found!");
    }

    const calcButton = document.getElementById('calculate-relationship-button');
    if (calcButton) {
        calcButton.addEventListener('click', handleCalculateRelationship);
    }

    const holidayPdfButton = document.getElementById('generate-holiday-card-pdf-button');
    if (holidayPdfButton) {
        holidayPdfButton.addEventListener('click', generateHolidayCardPDF);
    }

    const individualLabelsPdfButton = document.getElementById('generate-individual-labels-pdf-button');
    if (individualLabelsPdfButton) {
        individualLabelsPdfButton.addEventListener('click', generateIndividualMailingLabelsPDF);
    }

    const birthdayListPdfButton = document.getElementById('generate-birthday-list-pdf-button');
    if (birthdayListPdfButton) {
        birthdayListPdfButton.addEventListener('click', generateBirthdayListPDF);
    }

    const familyBlastButton = document.getElementById('family-blast-news-button');
    if (familyBlastButton) {
        familyBlastButton.addEventListener('click', showFamilyBlastModal);
    }

    const familyTextBlastButton = document.getElementById('family-text-blast-button');
    if (familyTextBlastButton) {
        familyTextBlastButton.addEventListener('click', () => showFamilyBlastModal('text'));
    }

    const familyEmailBlastButton = document.getElementById('family-email-blast-button');
    if (familyEmailBlastButton) {
        familyEmailBlastButton.addEventListener('click', () => showFamilyBlastModal('email'));
    }

    // Call the random fact display function
    displayRandomFact();

    // Set interval to rotate facts every X milliseconds (e.g., 10 seconds)
    const factRotationInterval = 10000; // 10 seconds
    setInterval(displayRandomFact, factRotationInterval);

    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('add-pronouns');
    const pronounsCustom = document.getElementById('add-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }

    const exportFamilyDataBtn = document.getElementById('export-family-data-btn');
    if (exportFamilyDataBtn) {
        exportFamilyDataBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(familyData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'family-data-export.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
    }
    
    const csvImportBtn = document.getElementById('csv-import-btn');
    if (csvImportBtn) {
        csvImportBtn.addEventListener('click', () => {
            window.open('csv-importer.html', '_blank');
        });
    }
}

function renderFamilyTree() {
    console.log('renderFamilyTree called with familyData:', familyData);
    
    const treeContainer = document.getElementById('tree-container');
    if (!treeContainer) {
        console.error('tree-container element not found');
        return;
    }
    
    console.log('Found tree-container, rendering tree...');
    treeContainer.innerHTML = '';
    const treeRootElement = document.createElement('div');
    treeRootElement.classList.add('tree');
    treeContainer.appendChild(treeRootElement);

    if (!familyData || familyData.length === 0) {
        console.log('No family data to render');
        treeRootElement.innerHTML = '<p class="empty-state-text">Add the first family member to see the tree bloom.</p>';
        return;
    }
    
    console.log(`Rendering tree with ${familyData.length} people`);

    // Find root nodes (individuals without parents listed in the data)
    const personMap = new Map(familyData.map(p => [p.id, p]));
    const allChildrenIds = new Set();
    const anchoredIds = new Set(); // People who are anchored via parents or as children

    familyData.forEach(person => {
        if (person.parents && person.parents.length > 0) {
            anchoredIds.add(person.id);
        }
        if (person.children && person.children.length > 0) {
            person.children.forEach(childId => {
                allChildrenIds.add(childId);
                anchoredIds.add(childId);
            });
        }
    });

    const marriedIntoAnchoredIds = new Set();
    familyData.forEach(person => {
        if (anchoredIds.has(person.id) && person.marriages && person.marriages.length > 0) {
            person.marriages.forEach(marriage => {
                marriedIntoAnchoredIds.add(marriage.spouseId);
            });
        }
    });

    const rootNodes = familyData.filter(person => 
        (!person.parents || person.parents.length === 0) && 
        !allChildrenIds.has(person.id) &&
        !marriedIntoAnchoredIds.has(person.id)
    );

    // --- Avoid duplicate spouse nodes ---
    const renderedIds = new Set();
    function renderRootOrSkip(person) {
        if (renderedIds.has(person.id)) return;
        let spouseId = null;
        if (person.marriages && person.marriages.length > 0) {
            spouseId = person.marriages[0].spouseId;
        }
        if (spouseId && renderedIds.has(spouseId)) return; // Already rendered as a spouse
        // Render this person (and spouse inline)
        const personNode = createPersonNodeDOM(person, personMap, 0);
        treeRootElement.appendChild(personNode);
        renderedIds.add(person.id);
        if (spouseId) renderedIds.add(spouseId);
    }

    if (rootNodes.length > 0) {
        rootNodes.sort((a,b) => new Date(a.birthDate) - new Date(b.birthDate));
        rootNodes.forEach(person => {
            renderRootOrSkip(person);
        });
    } else if (familyData.length > 0) {
        // Fallback: render everyone as a flat list, but avoid duplicates
        familyData.forEach(person => {
            renderRootOrSkip(person);
        });
    }
}

function createPersonNodeDOM(person, personMap, level) {
    const personElement = document.createElement('div');
    personElement.classList.add('tree-node');
    personElement.id = `tree-node-${person.id}`;
    personElement.style.marginLeft = `${level * 20}px`;
    personElement.style.borderLeftColor = generationColors[level % generationColors.length];

    const nodeContentWrapper = document.createElement('div');
    nodeContentWrapper.classList.add('node-content-wrapper');

    // 1. Add Toggle Button if there are children (moved earlier)
    let toggleButton = null;
    let childrenContainer = null; // Declare here for access in toggle event

    if (person.children && person.children.length > 0) {
        toggleButton = document.createElement('span');
        toggleButton.classList.add('toggle-button');
        toggleButton.textContent = '[-]'; // Start expanded
        nodeContentWrapper.appendChild(toggleButton);
    }

    // 2. Thumbnail (with default)
    const thumbImg = document.createElement('img');
    thumbImg.src = person.profilePic || defaultProfilePic;
    thumbImg.alt = person.nickname || person.name;
    thumbImg.classList.add('profile-pic-tree-thumbnail');
    thumbImg.addEventListener('click', (e) => {
        e.stopPropagation();
        displayPersonDetails(person.id);
    });
    nodeContentWrapper.appendChild(thumbImg);

    // 3. Name (nickname if present)
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('node-name');
    let displayName = person.nickname || person.name;
    if (person.deathDate) {
        displayName += ' ⚰️';
        nameSpan.classList.add('node-deceased');
    }
    const ageDisplayInTree = calculateAgeDisplay(person);
    nameSpan.textContent = displayName;
    nameSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        displayPersonDetails(person.id);
    });
    nodeContentWrapper.appendChild(nameSpan);
    if (ageDisplayInTree) {
        const ageLabel = ageDisplayInTree
            .replace(/[()]/g, '')
            .replace('Age at death:', 'Age at death')
            .replace('Age:', 'Age')
            .trim();
        if (ageLabel) {
            const ageSpan = document.createElement('span');
            ageSpan.classList.add('node-meta');
            ageSpan.textContent = ageLabel;
            nodeContentWrapper.appendChild(ageSpan);
        }
    }
    // Pronouns in tree (optional, small)
    if (person.pronouns) {
        const pronounsSpan = document.createElement('span');
        pronounsSpan.classList.add('pronouns-tree');
        pronounsSpan.textContent = ` (${person.pronouns})`;
        pronounsSpan.style.fontSize = '0.85em';
        pronounsSpan.style.color = '#888';
        nodeContentWrapper.appendChild(pronounsSpan);
    }
    personElement.appendChild(nodeContentWrapper);

    // 4. Spouses
    if (person.marriages && person.marriages.length > 0) {
        person.marriages.forEach(marriage => {
            const spouse = personMap.get(marriage.spouseId);
            if (spouse) {
                const spouseSpan = document.createElement('span');
                spouseSpan.classList.add('spouse-node');
                let spouseDisplay = spouse.nickname || spouse.name;
                if (spouse.deathDate) spouseDisplay += ' ⚰️';
                const spouseAgeDisplay = calculateAgeDisplay(spouse);
                spouseSpan.textContent = ` & ${spouseDisplay}${spouseAgeDisplay}`;
                spouseSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    displayPersonDetails(spouse.id);
                });
                nodeContentWrapper.appendChild(spouseSpan);
            }
        });
    }

    // 5. Children Container and Toggle Logic
    if (person.children && person.children.length > 0) {
        childrenContainer = document.createElement('div'); // Assign to declared variable
        childrenContainer.classList.add('children-container');

        const childrenObjects = person.children
            .map(childId => personMap.get(childId))
            .filter(child => child)
            .sort((a, b) => new Date(a.birthDate) - new Date(b.birthDate));

        const renderedChildIds = new Set();
        childrenObjects.forEach(child => {
            if (renderedChildIds.has(child.id)) {
                return;
            }
            renderedChildIds.add(child.id);
            const childNode = createPersonNodeDOM(child, personMap, level + 1);
            childrenContainer.appendChild(childNode);
        });
        personElement.appendChild(childrenContainer);

        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = childrenContainer.style.display === 'none';
                childrenContainer.style.display = isCollapsed ? 'block' : 'none';
                toggleButton.textContent = isCollapsed ? '[-]' : '[+]';
            });
        }
    }
    return personElement;
}

function expandAncestorsOfNode(element) {
    if (!element) return;
    let parentScope = element.parentElement;

    while (parentScope) {
        // Check if the direct parent is a children-container that is hidden
        if (parentScope.classList.contains('children-container') && parentScope.style.display === 'none') {
            parentScope.style.display = 'block';
            // Find the tree-node that owns this children-container to update its toggle
            const ownerNode = parentScope.closest('.tree-node');
            if (ownerNode) {
                const toggleButton = ownerNode.querySelector('.node-content-wrapper .toggle-button');
                if (toggleButton) {
                    toggleButton.textContent = '[-]';
                }
            }
        }
        // Stop if we've reached the main tree container or body
        if (parentScope.classList.contains('tree') || parentScope.tagName === 'BODY') {
            break;
        }
        parentScope = parentScope.parentElement;
    }
}

function displayPersonDetails(personId) {
    // Remove previous highlight
    const previouslyHighlighted = document.querySelector('.tree-node-highlighted');
    if (previouslyHighlighted) {
        previouslyHighlighted.classList.remove('tree-node-highlighted');
    }

    // Add visual feedback to details container
    const detailsContainer = document.getElementById('details-container');
    detailsContainer.classList.add('person-selected');
    
    // Scroll details container into view on mobile/smaller screens
    detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    const person = familyData.find(p => p.id === personId);
    const personInfoDiv = document.getElementById('person-info');

    if (person) {
        const relativeMap = new Map(familyData.map(p => [p.id, p]));
        const legalName = person.name || 'Unnamed Family Member';
        const preferredName = person.nickname || legalName;
        const heroSubtitle = preferredName !== legalName ? `<p class="hero-subtitle">${legalName}</p>` : '';

        const badges = [];
        if (person.pronouns) {
            badges.push(`<span class="badge">${person.pronouns}</span>`);
        }
        const smsStatus = (person.can_receive_sms || '').toLowerCase();
        if (smsStatus === 'yes') {
            badges.push('<span class="badge success">SMS ready</span>');
        } else if (smsStatus === 'no') {
            badges.push('<span class="badge neutral">No SMS</span>');
        }
        if (person.deathDate) {
            badges.push('<span class="badge neutral">Deceased</span>');
        }
        const badgesHtml = badges.length ? `<div class="person-badges">${badges.join('')}</div>` : '';

        const birthValue = formatDateLong(person.birthDate);
        const deathValue = person.deathDate ? formatDateLong(person.deathDate) : null;
        const ageSummary = getAgeSummary(person);

        const heroMetaParts = [];
        if (birthValue && birthValue !== 'N/A') {
            heroMetaParts.push(birthValue);
        }
        if (person.placeOfBirth) {
            heroMetaParts.push(person.placeOfBirth);
        }
        const heroMetaLine = heroMetaParts.length ? `<div class="hero-meta-line">${heroMetaParts.map(text => `<span>${text}</span>`).join('')}</div>` : '';

        const metaCards = [
            `<div class="meta-card">
                <span class="meta-label">Born</span>
                <span class="meta-value">${birthValue}</span>
                ${person.placeOfBirth ? `<span class="meta-hint">${person.placeOfBirth}</span>` : ''}
            </div>`
        ];
        if (ageSummary) {
            metaCards.push(`
            <div class="meta-card">
                <span class="meta-label">${ageSummary.label}</span>
                <span class="meta-value">${ageSummary.value}</span>
            </div>`);
        }
        if (deathValue) {
            metaCards.push(`
            <div class="meta-card">
                <span class="meta-label">Died</span>
                <span class="meta-value">${deathValue}</span>
                ${person.placeOfDeath ? `<span class="meta-hint">${person.placeOfDeath}</span>` : ''}
            </div>`);
        }
        const metaGridHtml = `<div class="person-meta-grid">${metaCards.join('')}</div>`;

        const renderRelationChips = (people, emptyText) => {
            if (!people.length) {
                return `<span class="empty-pill">${emptyText}</span>`;
            }
            return people.map(relative => 
                `<span class="relation-chip clickable-relation" data-person-id="${relative.id}">${relative.nickname || relative.name}</span>`
            ).join('');
        };

        const parentPeople = Array.from(person.parents || [])
            .map(id => relativeMap.get(id))
            .filter(Boolean);
        const childrenPeople = Array.from(person.children || [])
            .map(id => relativeMap.get(id))
            .filter(Boolean);
        const spouseChipsList = (person.marriages || [])
            .map(marriage => {
                const spouse = relativeMap.get(marriage.spouseId);
                if (!spouse) return null;
                const labels = [spouse.nickname || spouse.name];
                if (marriage.weddingDate) labels.push(`m. ${marriage.weddingDate}`);
                if (marriage.divorceDate) labels.push(`d. ${marriage.divorceDate}`);
                return `<span class="relation-chip">${labels.join(' • ')}</span>`;
            })
            .filter(Boolean);

        const parentsHtml = renderRelationChips(parentPeople, 'Add parents');
        const childrenHtml = renderRelationChips(childrenPeople, 'Add children');
        const spouseHtml = spouseChipsList.length ? spouseChipsList.join('') : `<span class="empty-pill">Add spouse</span>`;

        const contactRows = [];
        const contact = person.contact || {};
        const addressParts = [contact.street, contact.city, contact.state, contact.zip].filter(Boolean);
        if (addressParts.length) {
            contactRows.push(`
                <div class="info-row">
                    <span class="info-label">Address</span>
                    <span class="info-value">${addressParts.join(', ')}</span>
                </div>
            `);
        }
        if (contact.email) {
            contactRows.push(`
                <div class="info-row">
                    <span class="info-label">Email</span>
                    <span class="info-value"><a href="mailto:${contact.email}">${contact.email}</a></span>
                </div>
            `);
        }
        if (contact.phone) {
            const rawPhone = contact.phone.replace(/[^\d+]/g, '');
            contactRows.push(`
                <div class="info-row">
                    <span class="info-label">Phone</span>
                    <span class="info-value">
                        ${contact.phone}
                        <span class="contact-actions">
                            <a href="tel:${rawPhone}">Call</a> · <a href="sms:${rawPhone}">Text</a>
                        </span>
                    </span>
                </div>
            `);
        }
        if (smsStatus && smsStatus !== 'unsure') {
            const smsCopy = smsStatus === 'yes' ? 'OK to text' : 'Do not send texts';
            contactRows.push(`
                <div class="info-row">
                    <span class="info-label">SMS Preference</span>
                    <span class="info-value">${smsCopy}</span>
                </div>
            `);
        }
        const contactHtml = contactRows.length ? contactRows.join('') : `<div class="info-row"><span class="info-value muted">No contact information yet.</span></div>`;

        const storyHtml = `<p>${person.bio || 'Add a biography to capture their story.'}</p>`;
        const notesHtml = person.notes ? `<div class="section-note">${person.notes}</div>` : '';

        const detailsHTML = `
          <div class="person-hero">
            <div class="hero-avatar">
              <img src="${person.profilePic || defaultProfilePic}" alt="Profile picture of ${preferredName}" class="person-avatar clickable-avatar" data-person-id="${person.id}" data-has-pic="${person.profilePic ? 'true' : 'false'}">
            </div>
            <div class="hero-info">
              <h2>${preferredName}</h2>
              ${heroSubtitle}
              ${badgesHtml}
              ${heroMetaLine}
            </div>
            <div class="hero-actions">
              <button type="button" id="edit-relationships-btn" class="primary">Edit Profile</button>
              <button type="button" id="delete-person-btn" class="ghost danger">Delete</button>
            </div>
          </div>
          ${metaGridHtml}
          <section class="person-section">
            <h4 class="section-heading">Story</h4>
            ${storyHtml}
            ${notesHtml}
          </section>
          <section class="person-section">
            <h4 class="section-heading">Family</h4>
            <div class="relation-block">
              <span class="info-label">Parents</span>
              <div class="chip-group">${parentsHtml}</div>
            </div>
            <div class="relation-block">
              <span class="info-label">Children</span>
              <div class="chip-group">${childrenHtml}</div>
            </div>
            <div class="relation-block">
              <span class="info-label">Spouse</span>
              <div class="chip-group">${spouseHtml}</div>
            </div>
          </section>
          <section class="person-section">
            <h4 class="section-heading">Contact</h4>
            ${contactHtml}
          </section>
        `;

        personInfoDiv.innerHTML = detailsHTML;

        // Highlight in tree and scroll
        const nodeToHighlight = document.getElementById(`tree-node-${person.id}`);
        if (nodeToHighlight) {
            expandAncestorsOfNode(nodeToHighlight);
            nodeToHighlight.classList.add('tree-node-highlighted');
            nodeToHighlight.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            console.warn(`Tree node for person ID ${person.id} not found.`);
        }

        // Attach event listener for profile picture click
        const avatarImg = document.querySelector('.clickable-avatar');
        if (avatarImg) {
            avatarImg.style.cursor = 'pointer';
            avatarImg.addEventListener('click', function() {
                const hasPic = this.getAttribute('data-has-pic') === 'true';
                if (hasPic) {
                    // Show image in popup
                    showImagePopup(this.src, preferredName);
                } else {
                    // Open uploader (for now, just show a message - upload functionality can be added later)
                    alert('Photo upload functionality coming soon! For now, you can add photos via the Edit Profile button.');
                }
            });
        }

        // Attach event listeners for clickable relation chips
        document.querySelectorAll('.clickable-relation').forEach(chip => {
            chip.style.cursor = 'pointer';
            chip.addEventListener('click', function() {
                const relatedPersonId = parseInt(this.getAttribute('data-person-id'));
                if (relatedPersonId) {
                    displayPersonDetails(relatedPersonId);
                }
            });
        });

        // Attach event listener for Edit Relationships
        document.getElementById('edit-relationships-btn').onclick = function() {
            showEditRelationshipsModal(personId);
        };
        
        // Attach event listener for Delete Person
        document.getElementById('delete-person-btn').onclick = function() {
            deletePerson(personId);
        };
    } else {
        detailsContainer.classList.remove('person-selected');
        personInfoDiv.innerHTML = getDefaultPersonCardMarkup();
    }
}

// Show image popup modal
function showImagePopup(imageSrc, personName) {
    const overlay = document.createElement('div');
    overlay.className = 'image-popup-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    
    const popup = document.createElement('div');
    popup.style.cssText = 'max-width: 90vw; max-height: 90vh; position: relative;';
    popup.innerHTML = `
        <img src="${imageSrc}" alt="${personName}" style="max-width: 100%; max-height: 90vh; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
        <button class="image-popup-close" style="position: absolute; top: -40px; right: 0; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #333;">&times;</button>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    const closePopup = () => {
        document.body.removeChild(overlay);
    };
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.classList.contains('image-popup-close')) {
            closePopup();
        }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closePopup();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function renderUpcomingBirthdays() {
    const birthdaysList = document.getElementById('birthdays-list');
    if (!familyData || familyData.length === 0) {
        birthdaysList.innerHTML = '<li class="empty-state-text">No family data for birthdays yet.</li>';
        return;
    }

    const upcoming = getUpcomingBirthdays(familyData, 30); // Check for birthdays in the next 30 days

    birthdaysList.innerHTML = ''; // Clear existing items

    if (upcoming.length > 0) {
        upcoming.forEach(person => {
            const listItem = document.createElement('li');
            const birthDate = new Date(person.birthDate);
            const formattedDate = birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            listItem.textContent = `${person.name} - ${formattedDate}`;
            birthdaysList.appendChild(listItem);
        });
    } else {
        birthdaysList.innerHTML = '<li class="empty-state-text">No upcoming birthdays in the next 30 days.</li>';
    }
}

function getUpcomingBirthdays(people, daysInAdvance) {
    const today = new Date();
    today.setHours(0,0,0,0); // Normalize to start of today
    const upcoming = [];

    people.forEach(person => {
        if (!person.birthDate) return;

        const birthDate = new Date(person.birthDate);
        if (isNaN(birthDate.getTime())) return; // Invalid date

        const currentYearBirthDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // If birthday has passed this year, check next year's birthday
        if (currentYearBirthDate < today) {
            currentYearBirthDate.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = currentYearBirthDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= daysInAdvance) {
            upcoming.push({ ...person, daysUntilBirthday: diffDays });
        }
    });

    // Sort by days until birthday
    return upcoming.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
}

let selectedParentIds = [];
let selectedChildrenIds = [];
let selectedSpouseId = null;
let selectedRelFinderPerson1 = null; // For Relationship Finder
let selectedRelFinderPerson2 = null; // For Relationship Finder

function createSuggestionElement(person, suggestionType, targetInputElement, suggestionsContainer, selectedDisplayContainer, hiddenIdField) {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.textContent = `${person.name} `;
    const dobSpan = document.createElement('span');
    dobSpan.classList.add('suggestion-item-dob');
    dobSpan.textContent = `(${(person.birthDate || 'DOB unknown')})`;
    suggestionDiv.appendChild(dobSpan);

    suggestionDiv.addEventListener('click', () => {
        if (suggestionType === 'parent') {
            if (!selectedParentIds.includes(person.id)) {
                selectedParentIds.push(person.id);
                renderSelectedItems(selectedParentIds, familyData, selectedDisplayContainer, hiddenIdField, 'parent');
            }
        } else if (suggestionType === 'child') {
            if (!selectedChildrenIds.includes(person.id)) {
                selectedChildrenIds.push(person.id);
                renderSelectedItems(selectedChildrenIds, familyData, selectedDisplayContainer, hiddenIdField, 'child');
            }
        } else if (suggestionType === 'spouse') {
            selectedSpouseId = person.id;
            renderSelectedItems([selectedSpouseId], familyData, selectedDisplayContainer, hiddenIdField, 'spouse');
        } else if (suggestionType === 'relFinderPerson1') {
            selectedRelFinderPerson1 = person.id;
            renderSelectedItems([selectedRelFinderPerson1], familyData, selectedDisplayContainer, hiddenIdField, 'singleSelectNoRemove');
        } else if (suggestionType === 'relFinderPerson2') {
            selectedRelFinderPerson2 = person.id;
            renderSelectedItems([selectedRelFinderPerson2], familyData, selectedDisplayContainer, hiddenIdField, 'singleSelectNoRemove');
        }
        targetInputElement.value = '';
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    });
    return suggestionDiv;
}

function renderSelectedItems(selectedIds, allData, listContainer, hiddenField, type) {
    listContainer.innerHTML = '';
    const personMap = new Map(allData.map(p => [p.id, p]));

    selectedIds.forEach(id => {
        const person = personMap.get(id);
        if (person) {
            const itemTag = document.createElement('span');
            itemTag.classList.add('selected-item-tag');
            itemTag.textContent = `${person.name} `;
            const dobSpan = document.createElement('span');
            dobSpan.classList.add('suggestion-item-dob');
            dobSpan.textContent = `(${(person.birthDate || 'DOB unknown')})`;
            itemTag.appendChild(dobSpan);

            if (type === 'parent' || type === 'child') { 
                const removeBtn = document.createElement('span');
                removeBtn.classList.add('remove-item');
                removeBtn.textContent = 'x';
                removeBtn.onclick = () => {
                    if (type === 'parent') {
                        selectedParentIds = selectedParentIds.filter(pid => pid !== id);
                        renderSelectedItems(selectedParentIds, allData, listContainer, hiddenField, type);
                    } else if (type === 'child') {
                        selectedChildrenIds = selectedChildrenIds.filter(cid => cid !== id);
                        renderSelectedItems(selectedChildrenIds, allData, listContainer, hiddenField, type);
                    }
                };
                itemTag.appendChild(removeBtn);
            } // No remove button for spouse or relFinder types as it's single select and replaced on new choice
            listContainer.appendChild(itemTag);
        }
    });
    
    if (type === 'spouse' || type === 'singleSelectNoRemove') {
        hiddenField.value = selectedIds.length > 0 ? selectedIds[0] : '';
    } else { // For parent and child which are arrays
        hiddenField.value = selectedIds.join(',');
    }
}

function setupAutocomplete(inputId, suggestionsId, selectedDisplayId, hiddenIdStore, suggestionType) {
    const inputField = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    const selectedDisplayContainer = document.getElementById(selectedDisplayId);
    const hiddenIdField = document.getElementById(hiddenIdStore);

    if (!inputField || !suggestionsContainer || !selectedDisplayContainer || !hiddenIdField) {
        console.error("Autocomplete DOM elements not found for:", inputId, suggestionType);
        return;
    }

    inputField.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        suggestionsContainer.innerHTML = '';
        if (query.length < 1) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        let alreadySelectedId = null;
        if (suggestionType === 'relFinderPerson1') alreadySelectedId = selectedRelFinderPerson1;
        if (suggestionType === 'relFinderPerson2') alreadySelectedId = selectedRelFinderPerson2;
        if (suggestionType === 'spouse') alreadySelectedId = selectedSpouseId;

        const filteredPeople = familyData.filter(person => 
            person.name.toLowerCase().includes(query) &&
            (suggestionType === 'parent' ? !selectedParentIds.includes(person.id) :
            (suggestionType === 'child' ? !selectedChildrenIds.includes(person.id) :
            (suggestionType === 'spouse' || suggestionType === 'relFinderPerson1' || suggestionType === 'relFinderPerson2') ? person.id !== alreadySelectedId : true))
        );

        if (filteredPeople.length > 0) {
            filteredPeople.forEach(person => {
                const suggestionDiv = createSuggestionElement(person, suggestionType, inputField, suggestionsContainer, selectedDisplayContainer, hiddenIdField);
                suggestionsContainer.appendChild(suggestionDiv);
            });
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    });

    document.addEventListener('click', function(event) {
        if (!inputField.contains(event.target) && !suggestionsContainer.contains(event.target)) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    });
}

async function handleAddPersonFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const newPerson = {};

    newPerson.name = formData.get('name');
    newPerson.birthDate = formData.get('birthDate') || null;
    newPerson.placeOfBirth = formData.get('placeOfBirth') || null;
    newPerson.deathDate = formData.get('deathDate') || null;
    newPerson.placeOfDeath = formData.get('placeOfDeath') || null;
    newPerson.bio = formData.get('bio') || null;
    newPerson.notes = formData.get('notes') || null;

    // Pronouns
    let pronouns = formData.get('pronouns');
    if (pronouns === 'custom') {
        pronouns = formData.get('pronounsCustom') || '';
    }
    newPerson.pronouns = pronouns || null;

    newPerson.contact = {
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        canReceiveTexts: formData.get('canReceiveTexts') === 'on',
        street: formData.get('street') || null,
        city: formData.get('city') || null,
        state: formData.get('state') || null,
        zip: formData.get('zip') || null
    };
    if (Object.values(newPerson.contact).every(val => !val)) newPerson.contact = {};

    // Add person to backend
    const newPersonId = await addPersonAPI(newPerson);

    // Add relationships
    const parentIdsString = document.getElementById('add-parents-ids').value;
    const parentIds = parentIdsString ? parentIdsString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    for (const pid of parentIds) {
        await addRelationshipAPI(newPersonId, pid, 'parent');
        await addRelationshipAPI(pid, newPersonId, 'child');
    }
    const childrenIdsString = document.getElementById('add-children-ids').value;
    const childrenIds = childrenIdsString ? childrenIdsString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    for (const cid of childrenIds) {
        await addRelationshipAPI(newPersonId, cid, 'child');
        await addRelationshipAPI(cid, newPersonId, 'parent');
    }
    const spouseIdFromAutocomplete = document.getElementById('add-spouse-id-hidden').value;
    if (spouseIdFromAutocomplete) {
        const spouseNumId = parseInt(spouseIdFromAutocomplete);
        if (!isNaN(spouseNumId)) {
            await addRelationshipAPI(newPersonId, spouseNumId, 'spouse');
            await addRelationshipAPI(spouseNumId, newPersonId, 'spouse');
        }
    }
    // Reload data and UI
    await loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    form.reset();
    selectedParentIds = [];
    selectedChildrenIds = [];
    selectedSpouseId = null;
    document.getElementById('selected-parents-list').innerHTML = '';
    document.getElementById('add-parents-ids').value = '';
    document.getElementById('selected-children-list').innerHTML = '';
    document.getElementById('add-children-ids').value = '';
    document.getElementById('selected-spouse-display').innerHTML = '';
    document.getElementById('add-spouse-id-hidden').value = '';
    alert('Person added successfully! Relationships updated.');
}

// --- Edit Relationships Modal Save ---
async function updatePersonRelationships(personId, newParentIds, newChildIds, newSpouseId) {
    try {
        const relsRes = await fetch(`${API_BASE}/relationships`);
        const allRels = await relsRes.json();
        const toDelete = allRels.filter(rel =>
            ['parent', 'child', 'spouse'].includes(rel.type) &&
            (rel.person_id === personId || rel.related_id === personId)
        );
        for (const rel of toDelete) {
            await deleteRelationshipAPI(rel.id);
        }

        for (const pid of newParentIds) {
            await addRelationshipAPI(personId, pid, 'parent');
            await addRelationshipAPI(pid, personId, 'child');
        }
        for (const cid of newChildIds) {
            await addRelationshipAPI(personId, cid, 'child');
            await addRelationshipAPI(cid, personId, 'parent');
        }
        if (newSpouseId) {
            await addRelationshipAPI(personId, newSpouseId, 'spouse');
            await addRelationshipAPI(newSpouseId, personId, 'spouse');
        }

        await loadFamilyDataFromAPI();
        renderFamilyTree();
        renderUpcomingBirthdays();
    } catch (error) {
        console.error('Failed to update relationships:', error);
        alert(error.message || 'Failed to update relationships. Please try again.');
        throw error;
    }
}

function calculateAgeDisplay(person) {
    if (!person.birthDate) return ''; // No birth date, cannot calculate age

    const birth = new Date(person.birthDate);
    if (isNaN(birth.getTime())) return ''; // Invalid birth date

    const today = new Date();
    let ageLabel = "Age";
    let endDate = today;

    if (person.deathDate) {
        const death = new Date(person.deathDate);
        if (!isNaN(death.getTime())) {
            endDate = death;
            ageLabel = "Age at death";
        } else {
            // Invalid death date, calculate current age if birth date is valid
            // but maybe indicate data issue for death date if needed elsewhere
        }
    }

    let age = endDate.getFullYear() - birth.getFullYear();
    const monthDiff = endDate.getMonth() - birth.getMonth();
    const dayDiff = endDate.getDate() - birth.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }
    
    return age >= 0 ? ` (${ageLabel}: ${age})` : ''; // Don't show negative age if dates are weird
}

function handleFamilySearch() {
    const searchInput = document.getElementById('family-search-input');
    const resultsContainer = document.getElementById('family-search-results');
    const query = searchInput.value.toLowerCase().trim();

    resultsContainer.innerHTML = ''; // Clear previous results

    if (query.length < 1) { // Minimum 1 char, or clear if empty
        resultsContainer.style.display = 'none';
        return;
    }

    const matchingPeople = familyData.filter(person => 
        person.name.toLowerCase().includes(query)
        // Optional: Extend search to other fields like bio, notes, etc.
        // || (person.bio && person.bio.toLowerCase().includes(query))
        // || (person.notes && person.notes.toLowerCase().includes(query))
    );

    if (matchingPeople.length > 0) {
        matchingPeople.forEach(person => {
            const item = document.createElement('div');
            item.classList.add('search-result-item');
            
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('result-name');
            nameSpan.textContent = person.name;
            item.appendChild(nameSpan);

            const detailsSpan = document.createElement('span');
            detailsSpan.classList.add('result-details');
            const ageDisplay = calculateAgeDisplay(person).trim(); // Get age string
            detailsSpan.textContent = `${formatDateLong(person.birthDate) || 'DOB Unknown'}${ageDisplay ? ' ' + ageDisplay : ''}`;
            item.appendChild(detailsSpan);

            item.addEventListener('click', () => {
                displayPersonDetails(person.id);
                resultsContainer.innerHTML = ''; // Clear results after selection
                resultsContainer.style.display = 'none';
                searchInput.value = ''; // Optional: clear search input
            });
            resultsContainer.appendChild(item);
        });
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.innerHTML = '<div class="search-result-item">No matches found.</div>';
        resultsContainer.style.display = 'block'; // Show "No matches found"
    }
}

function getAncestors(personId, personMap) {
    const ancestors = []; // Will store { id: ancestorId, level: generationLevel }
    let queue = [{ id: personId, level: 0 }]; // Start with the person themselves at level 0
    const visited = new Set(); // To avoid reprocessing and loops if data is circular
    visited.add(personId);

    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        const person = personMap.get(current.id);

        if (!person) continue;

        // Add current person to ancestors list if they are not the starting person themselves
        // Or, decide if the starting person should be level 0 in their own ancestor list (useful for distance)
        // For calculating distance to a common ancestor, we want their actual ancestors.
        // So, we only add parents onwards.

        if (person.parents && person.parents.length > 0) {
            for (const parentId of person.parents) {
                if (!visited.has(parentId)) {
                    visited.add(parentId);
                    const ancestorLevel = current.level + 1;
                    ancestors.push({ id: parentId, level: ancestorLevel });
                    queue.push({ id: parentId, level: ancestorLevel });
                }
            }
        }
    }
    return ancestors; // Returns [{id: parentId1, level: 1}, {id: grandparentX, level: 2}, ...]
}

function getDescendants(personId, personMap) {
    const descendants = [];
    let queue = [personId];
    const visited = new Set();
    visited.add(personId);

    while (queue.length > 0) {
        const currentId = queue.shift();
        const person = personMap.get(currentId);

        if (!person) continue;

        if (person.children && person.children.length > 0) {
            for (const childId of person.children) {
                if (!visited.has(childId)) {
                    visited.add(childId);
                    const childPerson = personMap.get(childId);
                    if (childPerson) {
                        descendants.push(childPerson);
                    }
                    queue.push(childId);
                }
            }
        }
    }
    return descendants;
}

function determineRelationship(person1Id, person2Id, personMap) {
    const person1 = personMap.get(person1Id);
    const person2 = personMap.get(person2Id);

    if (!person1 || !person2) return "One or both persons not found in data.";
    if (person1Id === person2Id) return `${person1.name} is the same person.`;

    const ancestors1 = getAncestors(person1Id, personMap); // [{id, level}, ...]
    const ancestors2 = getAncestors(person2Id, personMap); // [{id, level}, ...]

    // Create maps for quick lookup of ancestor levels
    const ancestors1Map = new Map(ancestors1.map(a => [a.id, a.level]));
    const ancestors2Map = new Map(ancestors2.map(a => [a.id, a.level]));

    // --- 1. Check for Direct Lineage ---
    if (ancestors1Map.has(person2Id)) {
        const level = ancestors1Map.get(person2Id);
        return `${person2.name} is ${getDirectRelationshipTerm(level, true)} of ${person1.name}.`;
    }
    if (ancestors2Map.has(person1Id)) {
        const level = ancestors2Map.get(person1Id);
        return `${person1.name} is ${getDirectRelationshipTerm(level, true)} of ${person2.name}.`;
    }
    // Check if person1 is a parent of person2
    if (person1.children && person1.children.includes(person2Id)) {
        return `${person1.name} is Parent of ${person2.name}.`;
    }
    // Check if person2 is a parent of person1
    if (person2.children && person2.children.includes(person1Id)) {
        return `${person2.name} is Parent of ${person1.name}.`;
    }


    // --- 2. Find Common Ancestors & Their Levels ---
    const commonAncestorsDetails = [];
    ancestors1.forEach(a1 => {
        if (ancestors2Map.has(a1.id)) {
            commonAncestorsDetails.push({
                id: a1.id,
                level1: a1.level, // Distance from person1 to common ancestor
                level2: ancestors2Map.get(a1.id) // Distance from person2 to common ancestor
            });
        }
    });

    if (commonAncestorsDetails.length === 0) {
        // Check for marriage if no blood common ancestor
        if (person1.marriages && person1.marriages.some(m => m.spouseId === person2Id)) {
            return `${person1.name} and ${person2.name} are Spouses.`;
        }
        return `${person1.name} and ${person2.name} have no identifiable common blood ancestors in the provided data.`;
    }

    // Sort common ancestors by the sum of their levels (nearest first)
    commonAncestorsDetails.sort((a, b) => (a.level1 + a.level2) - (b.level1 + b.level2));
    const nearestCA = commonAncestorsDetails[0];

    // --- 3. Check for Siblings (common parent is the nearest common ancestor) ---
    if (nearestCA.level1 === 1 && nearestCA.level2 === 1) {
        // To be full siblings, they need to share *two* parents if data allows, or at least one.
        // This simple check confirms they share at least one parent (the nearestCA).
        // A more complex check for full vs half would count how many of nearestCA.level1===1 are shared.
        let sharedParentsCount = 0;
        if (person1.parents && person2.parents) {
            person1.parents.forEach(p1_parent_id => {
                if (person2.parents.includes(p1_parent_id)) {
                    sharedParentsCount++;
                }
            });
        }
        if (sharedParentsCount >= 2) return `${person1.name} and ${person2.name} are Full Siblings.`;
        if (sharedParentsCount === 1) return `${person1.name} and ${person2.name} are Half-Siblings.`;
        // Fallback if parent data is inconsistent but common ancestor logic found a shared parent level CA
        return `${person1.name} and ${person2.name} are Siblings (share a common parent).`; 
    }

    // --- Placeholder for Cousins and Removed Logic (coming next) ---
    let cLevel1 = nearestCA.level1;
    let cLevel2 = nearestCA.level2;
    // Relationship is based on the person further from the common ancestor for "removed"
    let cousinOrder = Math.min(cLevel1, cLevel2) - 1;
    let removedOrder = Math.abs(cLevel1 - cLevel2);

    let relationship = "";
    if (cousinOrder === 0) { // This would be Aunt/Uncle/Niece/Nephew
        if (cLevel1 === 1) { // Person1 is parent of cousin, person2 is child
            relationship = `${person1.name} is Aunt/Uncle to ${person2.name}.`;
        } else { // Person2 is parent of cousin, person1 is child
            relationship = `${person2.name} is Aunt/Uncle to ${person1.name}.`;
        }
    } else {
        relationship = `${ordinal(cousinOrder)} Cousins`;
        if (removedOrder > 0) {
            relationship += `, ${times(removedOrder)} Removed`;
        }
    }
    return `${person1.name} and ${person2.name} are ${relationship}. (Common Ancestor: ${personMap.get(nearestCA.id).name})`;

    // return `Relationship calculation pending for ${person1.name} and ${person2.name}. Nearest Common Ancestor: ${personMap.get(nearestCA.id).name} (P1 level: ${nearestCA.level1}, P2 level: ${nearestCA.level2})`;
}

// Helper for direct relationship terms
function getDirectRelationshipTerm(level, isAncestorPerspective) {
    if (level === 1) return isAncestorPerspective ? "Parent" : "Child";
    if (level === 2) return isAncestorPerspective ? "Grandparent" : "Grandchild";
    if (level === 3) return isAncestorPerspective ? "Great-Grandparent" : "Great-Grandchild";
    const greats = "Great-".repeat(level - 2);
    return isAncestorPerspective ? `${greats}Grandparent` : `${greats}Grandchild`;
}

// Helper for ordinals (1st, 2nd, 3rd)
function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper for times (once, twice)
function times(n) {
    if (n === 1) return "once";
    if (n === 2) return "twice";
    return `${n} times`;
}

function handleCalculateRelationship() {
    const resultDisplay = document.getElementById('relationship-result-display');
    const person1Id = selectedRelFinderPerson1;
    const person2Id = selectedRelFinderPerson2;

    if (!person1Id || !person2Id) {
        resultDisplay.innerHTML = '<p style="color: red;">Please select two people.</p>';
        return;
    }
    if (person1Id === person2Id) {
        resultDisplay.innerHTML = '<p style="color: red;">Please select two different people.</p>';
        return;
    }

    const personMap = new Map(familyData.map(p => [p.id, p]));
    const person1 = personMap.get(person1Id);
    const person2 = personMap.get(person2Id);

    if (!person1 || !person2) {
        resultDisplay.innerHTML = '<p style="color: red;">Could not find one or both selected persons in the data.</p>';
        return;
    }

    const relationshipString = determineRelationship(person1Id, person2Id, personMap);
    resultDisplay.innerHTML = `<p>${relationshipString}</p>`;
}

function generateHolidayCardPDF() {
    console.log("generateHolidayCardPDF called");
    console.log("window.jspdf:", window.jspdf); // Check if jsPDF is loaded

    if (!familyData || familyData.length === 0) {
        console.error("HolidayCardPDF: No familyData or it is empty.");
        alert("No family data available to generate mailing labels.");
        return;
    }
    console.log(`HolidayCardPDF: Total family members loaded: ${familyData.length}`);

    const livingRelatives = familyData.filter(person => 
        !person.deathDate && 
        person.contact && 
        person.contact.street && 
        person.contact.city && 
        person.contact.state && 
        person.contact.zip
    );
    console.log(`HolidayCardPDF: Found ${livingRelatives.length} living relatives with complete addresses.`);
    console.log("HolidayCardPDF: Living relatives list:", JSON.parse(JSON.stringify(livingRelatives))); // Log a deep copy for inspection

    if (livingRelatives.length === 0) {
        alert("No living relatives with complete addresses found to generate mailing labels.");
        return;
    }

    const labels = [];
    const addresses = {};
    livingRelatives.forEach(person => {
        const street = person.contact.street ? person.contact.street.trim() : '';
        const city = person.contact.city ? person.contact.city.trim() : '';
        const state = person.contact.state ? person.contact.state.trim() : '';
        const zip = person.contact.zip ? person.contact.zip.trim() : '';

        if (street && city && state && zip) {
            const addressKey = `${street}_${city}_${state}_${zip}`.toLowerCase().replace(/\s+/g, '-');
            if (!addresses[addressKey]) {
                addresses[addressKey] = {
                    street: street,
                    city: city,
                    state: state,
                    zip: zip,
                    occupants: []
                };
            }
            addresses[addressKey].occupants.push(person);
        } else {
            console.warn(`Person ID ${person.id} (${person.name}) has an incomplete address and will be skipped for grouped labels.`);
        }
    });

    console.log("Grouped addresses:", addresses);
    for (const addressKey in addresses) {
        const addressInfo = addresses[addressKey];
        const formattedName = formatLabelName(addressInfo.occupants);
        labels.push({
            name: formattedName,
            street: addressInfo.street,
            city: addressInfo.city,
            state: addressInfo.state,
            zip: addressInfo.zip
        });
    }

    console.log("Formatted Labels:", labels);

    if (labels.length === 0) {
        alert("No labels to generate after formatting.");
        return;
    }

    try {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error("jsPDF not properly loaded");
        }
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // Avery 5160 label dimensions (approximated in mm)
        // Label width: 2.625 inches = 66.675 mm
        // Label height: 1 inch = 25.4 mm
        // Typically 3 columns, 10 rows.

        const labelWidth = 64; // Slightly less for padding
        const labelHeight = 25.4;
        const PADDING_TOP = 12.7; // Top margin for A4 (approx 0.5 inch)
        const PADDING_LEFT = 7;  // Left margin for A4 (approx 0.275 inch to fit 3 across)
        const GUTTER_HORIZONTAL = (210 - (3 * labelWidth) - (2 * PADDING_LEFT)) / 2; // 210mm is A4 width
        const GUTTER_VERTICAL = 4; // Vertical space between labels

        const LABELS_PER_ROW = 3;
        const ROWS_PER_PAGE = 10;

        let labelCount = 0;
        let pageCount = 1;

        const FONT_SIZE_NAME = 12;
        const FONT_SIZE_ADDRESS = 10;
        const LINE_HEIGHT_FACTOR = 1.2;

        doc.setFontSize(FONT_SIZE_NAME);

        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            const rowIndex = Math.floor((labelCount % (LABELS_PER_ROW * ROWS_PER_PAGE)) / LABELS_PER_ROW);
            const colIndex = labelCount % LABELS_PER_ROW;

            if (labelCount > 0 && labelCount % (LABELS_PER_ROW * ROWS_PER_PAGE) === 0) {
                doc.addPage();
                pageCount++;
                doc.setFontSize(FONT_SIZE_NAME); // Reset font size for new page
            }

            const x = PADDING_LEFT + (colIndex * (labelWidth + GUTTER_HORIZONTAL));
            const y = PADDING_TOP + (rowIndex * (labelHeight + GUTTER_VERTICAL));

            let currentY = y + 5; // Start text a bit inside the label box

            doc.setFontSize(FONT_SIZE_NAME);
            doc.text(label.name, x + 2, currentY);
            currentY += (FONT_SIZE_NAME * LINE_HEIGHT_FACTOR) / 2.5; // Adjust spacing

            doc.setFontSize(FONT_SIZE_ADDRESS);
            doc.text(label.street, x + 2, currentY);
            currentY += (FONT_SIZE_ADDRESS * LINE_HEIGHT_FACTOR) / 2.5;

            doc.text(`${label.city}, ${label.state} ${label.zip}`, x + 2, currentY);

            labelCount++;
        }

        doc.save('holiday_card_mailing_list.pdf');
        console.log("PDF generated successfully.");

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF. Error: " + error.message);
    }
}

function formatLabelName(occupants) {
    if (!occupants || occupants.length === 0) return "";

    // Helper function to clean name (remove née and similar text)
    const cleanName = (name) => {
        return name.replace(/\s*\([^)]*\)/, '').trim();
    };

    let rawNameStr = "";
    if (occupants.length === 1) {
        rawNameStr = cleanName(occupants[0].name);
    } else if (occupants.length === 2) {
        const person1 = occupants[0];
        const person2 = occupants[1];
        const lastName1 = getLastName(cleanName(person1.name));
        const lastName2 = getLastName(cleanName(person2.name));
        if (lastName1 === lastName2) {
            rawNameStr = `${getFirstName(cleanName(person1.name))} & ${getFirstName(cleanName(person2.name))} ${lastName1}`;
        } else {
            rawNameStr = `${cleanName(person1.name)} & ${cleanName(person2.name)}`;
        }
    } else { // More than 2 occupants
        const firstLastName = getLastName(cleanName(occupants[0].name));
        const allSameLastName = occupants.every(person => getLastName(cleanName(person.name)) === firstLastName);

        if (allSameLastName) {
            rawNameStr = `The ${firstLastName} Family`;
        } else {
            // Attempt to name the first two as a couple + "and Family"
            const person1 = occupants[0];
            const person2 = occupants[1]; 
            let coupleAndFamilyName = "";

            if (person1 && person2) {
                const lastName1 = getLastName(cleanName(person1.name));
                const lastName2 = getLastName(cleanName(person2.name));
                let coupleName = "";
                if (lastName1 === lastName2) {
                    coupleName = `${getFirstName(cleanName(person1.name))} & ${getFirstName(cleanName(person2.name))} ${lastName1}`;
                } else {
                    coupleName = `${cleanName(person1.name)} & ${cleanName(person2.name)}`;
                }
                coupleAndFamilyName = `${coupleName} and Family`;
            }
            rawNameStr = coupleAndFamilyName;
        }
    }
    return rawNameStr;
}

// Helper to extract last name from a full name string
function getLastName(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

// Helper to extract first name from a full name string
function getFirstName(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    return parts[0];
}

function generateIndividualMailingLabelsPDF() {
    console.log("generateIndividualMailingLabelsPDF called");

    if (!familyData || familyData.length === 0) {
        console.error("IndividualLabelsPDF: No familyData or it is empty.");
        alert("No family data available to generate mailing labels.");
        return;
    }
    console.log(`IndividualLabelsPDF: Total family members loaded: ${familyData.length}`);

    const livingRelatives = familyData.filter(person => 
        !person.deathDate && 
        person.contact && 
        person.contact.street && 
        person.contact.city && 
        person.contact.state && 
        person.contact.zip
    );

    if (livingRelatives.length === 0) {
        alert("No living relatives with complete addresses found to generate individual mailing labels.");
        return;
    }

    const labels = [];
    livingRelatives.forEach(person => {
        labels.push({
            name: formatLabelName([person]), // formatLabelName expects an array, gets person's full name
            street: person.contact.street.trim(),
            city: person.contact.city.trim(),
            state: person.contact.state.trim(),
            zip: person.contact.zip.trim()
        });
    });

    console.log("Formatted Individual Labels:", labels);

    if (labels.length === 0) {
        alert("No labels to generate after formatting.");
        return;
    }

    try {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error("jsPDF not properly loaded");
        }
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const labelWidth = 64;
        const labelHeight = 25.4;
        const PADDING_TOP = 12.7;
        const PADDING_LEFT = 7;
        const GUTTER_HORIZONTAL = (210 - (3 * labelWidth) - (2 * PADDING_LEFT)) / 2;
        const GUTTER_VERTICAL = 4;
        const LABELS_PER_ROW = 3;
        const ROWS_PER_PAGE = 10;
        const FONT_SIZE_NAME = 12;
        const FONT_SIZE_ADDRESS = 10;
        const LINE_HEIGHT_FACTOR = 1.2;

        let labelCount = 0;
        doc.setFontSize(FONT_SIZE_NAME);

        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            const rowIndex = Math.floor((labelCount % (LABELS_PER_ROW * ROWS_PER_PAGE)) / LABELS_PER_ROW);
            const colIndex = labelCount % LABELS_PER_ROW;

            if (labelCount > 0 && labelCount % (LABELS_PER_ROW * ROWS_PER_PAGE) === 0) {
                doc.addPage();
                doc.setFontSize(FONT_SIZE_NAME);
            }

            const x = PADDING_LEFT + (colIndex * (labelWidth + GUTTER_HORIZONTAL));
            const y = PADDING_TOP + (rowIndex * (labelHeight + GUTTER_VERTICAL));
            let currentY = y + 5;

            doc.setFontSize(FONT_SIZE_NAME);
            doc.text(label.name, x + 2, currentY);
            currentY += (FONT_SIZE_NAME * LINE_HEIGHT_FACTOR) / 2.5;

            doc.setFontSize(FONT_SIZE_ADDRESS);
            doc.text(label.street, x + 2, currentY);
            currentY += (FONT_SIZE_ADDRESS * LINE_HEIGHT_FACTOR) / 2.5;
            doc.text(`${label.city}, ${label.state} ${label.zip}`, x + 2, currentY);

            labelCount++;
        }

        const filename = currentFocusPersonId ? 
            `individual_mailing_labels_${familyData.find(p => p.id === currentFocusPersonId)?.name.replace(/\s+/g, '_')}.pdf` :
            'individual_mailing_labels.pdf';
        doc.save(filename);
        console.log("Individual Mailing Labels PDF generated successfully.");

    } catch (error) {
        console.error("Error generating PDF for individual labels:", error);
        alert("Failed to generate individual labels PDF. Error: " + error.message);
    }
}

function generateBirthdayListPDF() {
    console.log("generateBirthdayListPDF called");

    if (!familyData || familyData.length === 0) {
        console.error("BirthdayListPDF: No familyData or it is empty.");
        alert("No family data available to generate birthday list.");
        return;
    }

    // 1. Filter for people with birthdates
    const peopleWithBirthdays = familyData.filter(person => person.birthDate && !isNaN(new Date(person.birthDate).getTime()));
    
    if (peopleWithBirthdays.length === 0) {
        alert("No family members with valid birth dates found.");
        return;
    }

    // 2. Sort by month and day
    peopleWithBirthdays.sort((a, b) => {
        const dateA = new Date(a.birthDate);
        const dateB = new Date(b.birthDate);
        if (dateA.getMonth() !== dateB.getMonth()) {
            return dateA.getMonth() - dateB.getMonth();
        }
        return dateA.getDate() - dateB.getDate();
    });

    console.log(`BirthdayListPDF: Found ${peopleWithBirthdays.length} people with birth dates. Sorted list:`, JSON.parse(JSON.stringify(peopleWithBirthdays)));

    try {
        // 3. Initialize jsPDF
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error("jsPDF not properly loaded");
        }
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const PADDING_LEFT = 15;
        const PADDING_TOP_INITIAL = 15; // Initial top margin
        const LINE_HEIGHT_FACTOR = 1.2;
        const FONT_SIZE_NAME = 12;
        const FONT_SIZE_DETAILS = 9; // For birthdate and contact info
        const HEADER_FONT_SIZE = 16;
        const HEADER_MARGIN_BOTTOM = 10; // Space after month header

        let currentY = PADDING_TOP_INITIAL;
        let currentMonth = -1; // Use -1 to ensure the first month triggers a new page/header
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // 4. Iterate and Add to PDF
        for (let i = 0; i < peopleWithBirthdays.length; i++) {
            const person = peopleWithBirthdays[i];
            const birthDate = new Date(person.birthDate);
            const personMonth = birthDate.getMonth();

            // Check if month changes (or first person)
            if (personMonth !== currentMonth) {
                currentMonth = personMonth;
                if (i > 0) {
                    doc.addPage();
                    currentY = PADDING_TOP_INITIAL; // Reset Y for new page
                }

                // Add Month Header
                doc.setFontSize(HEADER_FONT_SIZE);
                doc.setFont(undefined, 'bold'); // Make header bold
                doc.text(monthNames[currentMonth], PADDING_LEFT, currentY);
                currentY += HEADER_FONT_SIZE * LINE_HEIGHT_FACTOR;
                doc.setFont(undefined, 'normal'); // Reset font style
                currentY += HEADER_MARGIN_BOTTOM; // Add space after header
            }

            // Add Person Name and Birthdate
            doc.setFontSize(FONT_SIZE_NAME);
            const formattedBirthDate = formatDateLong(person.birthDate);
            doc.text(`${person.name} - ${formattedBirthDate}`, PADDING_LEFT, currentY);
            currentY += FONT_SIZE_NAME * LINE_HEIGHT_FACTOR; // Move down for next line

            // If living, add contact info
            if (!person.deathDate && person.contact) {
                doc.setFontSize(FONT_SIZE_DETAILS);
                
                const contact = person.contact;
                let contactLines = [];

                // Add address if available
                if (contact.street && contact.city && contact.state && contact.zip) {
                     contactLines.push(`Address: ${contact.street}, ${contact.city}, ${contact.state} ${contact.zip}`);
                }

                // Add phone if available
                if (contact.phone) {
                    contactLines.push(`Phone: ${contact.phone}`);
                }

                // Add email if available
                if (contact.email) {
                    contactLines.push(`Email: ${contact.email}`);
                }

                // Add contact lines to PDF
                contactLines.forEach(line => {
                    doc.text(line, PADDING_LEFT + 5, currentY); // Indent contact info slightly
                    currentY += FONT_SIZE_DETAILS * LINE_HEIGHT_FACTOR;
                });
                 currentY += (FONT_SIZE_DETAILS * LINE_HEIGHT_FACTOR) / 2; // Extra space after contact info
            } else {
                currentY += (FONT_SIZE_NAME * LINE_HEIGHT_FACTOR) / 2; // Smaller gap for non-living or no contact
            }

            // Add a small space between entries
            currentY += 2; 
             // Check if we need a new page before drawing the next person
            // This is a simplified check; a more robust check would measure text height
            if (currentY > (doc.internal.pageSize.height - 15) && i < peopleWithBirthdays.length - 1) { // 15mm from bottom as margin
                 doc.addPage();
                 currentY = PADDING_TOP_INITIAL;
                 // Optionally repeat month header on new page if it's a long list for that month
                 doc.setFontSize(HEADER_FONT_SIZE);
                 doc.setFont(undefined, 'bold');
                 doc.text(monthNames[currentMonth], PADDING_LEFT, currentY);
                 currentY += HEADER_FONT_SIZE * LINE_HEIGHT_FACTOR;
                 doc.setFont(undefined, 'normal');
                 currentY += HEADER_MARGIN_BOTTOM;
                 doc.setFontSize(FONT_SIZE_NAME); // Reset to name font size
            }
        }

        // 6. Save PDF
        doc.save('family_birthday_list.pdf');
        console.log("Family Birthday List PDF generated successfully.");

    } catch (error) {
        console.error("Error generating Birthday List PDF:", error);
        alert("Failed to generate Birthday List PDF. Error: " + error.message);
    }
}

// Remove or comment out the old async loadFamilyData if data.js defines familyData globally 

// Family Blast News Functions
function showFamilyBlastModal(mode = 'text') {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'family-blast-modal';
    
    const dialog = document.createElement('div');
    dialog.className = 'family-blast-dialog';
    
    const isTextMode = mode === 'text';
    const title = isTextMode ? '📱 Family Text Blast' : '📧 Family Email Blast';
    const actionButton = isTextMode ? '📱 Copy Numbers for Messages' : '📧 Open Mail';
    
    dialog.innerHTML = `
        <div class="family-blast-header">
            <h3>${title}</h3>
            <button class="family-blast-close">&times;</button>
        </div>
        <div class="family-blast-content">
            <input type="text" class="family-blast-search" placeholder="Search family members...">
            <div class="family-blast-list" id="family-blast-list">
                <!-- Family members will be populated here -->
            </div>
        </div>
        <div class="family-blast-actions">
            <div class="family-blast-quick-select">
                <button id="select-all">Select All</button>
                <button id="clear-all">Clear All</button>
            </div>
            <div class="family-blast-buttons">
                <button class="${isTextMode ? 'family-blast-text' : 'family-blast-email'}" id="blast-action-btn">${actionButton}</button>
                <button class="family-blast-cancel" id="cancel-blast-btn">Cancel</button>
            </div>
        </div>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Populate family list based on mode
    populateFamilyBlastList(mode);
    
    // Add event listeners
    setupFamilyBlastEventListeners(modal, mode);
}

function populateFamilyBlastList(mode) {
    const listContainer = document.getElementById('family-blast-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    const isTextMode = mode === 'text';
    
    familyData.forEach(person => {
        const item = document.createElement('div');
        item.className = 'family-blast-item';
        item.dataset.personId = person.id;
        
        // Determine contact status
        const status = getContactStatus(person);
        const statusClass = status.class;
        const statusText = status.text;
        
        // Check if person is selectable for this mode
        const isSelectable = isTextMode ? 
            (status.available) : // Text mode: only people who can receive texts
            (status.hasEmail);   // Email mode: only people who have emails
        
        item.innerHTML = `
            <input type="checkbox" class="family-blast-checkbox" ${person.deathDate || (!person.contact || (!person.contact.phone && !person.contact.email)) || !isSelectable ? 'disabled' : ''}>
            <span class="contact-status ${statusClass}"></span>
            <div class="family-blast-person-info">
                <div class="family-blast-name">${person.name}</div>
                <div class="family-blast-contact">${statusText}</div>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
}

function getContactStatus(person) {
    if (person.deathDate) {
        return {
            class: 'deceased',
            text: '(deceased)',
            available: false,
            hasEmail: false
        };
    }
    
    const hasPhone = person.contact && person.contact.phone;
    const hasEmail = person.contact && person.contact.email;
    const canText = hasPhone && person.contact.canReceiveTexts;
    
    if (!hasPhone && !hasEmail) {
        return {
            class: 'no-contact',
            text: '(no contact info)',
            available: false,
            hasEmail: false
        };
    }
    
    if (canText) {
        return {
            class: 'available',
            text: `${person.contact.phone}${hasEmail ? ' • ' + person.contact.email : ''}`,
            available: true,
            hasEmail: hasEmail
        };
    } else if (hasPhone) {
        return {
            class: 'phone-only',
            text: `${person.contact.phone} (no texts)${hasEmail ? ' • ' + person.contact.email : ''}`,
            available: false,
            hasEmail: hasEmail
        };
    } else if (hasEmail) {
        return {
            class: 'email-only',
            text: person.contact.email,
            available: false,
            hasEmail: true
        };
    }
    
    return {
        class: 'no-contact',
        text: '(no contact info)',
        available: false,
        hasEmail: false
    };
}

function setupFamilyBlastEventListeners(modal, mode) {
    const closeBtn = modal.querySelector('.family-blast-close');
    const cancelBtn = modal.querySelector('#cancel-blast-btn');
    const actionBtn = modal.querySelector(`#blast-action-btn`);
    const searchInput = modal.querySelector('.family-blast-search');
    const listContainer = modal.querySelector('#family-blast-list');
    
    // Close modal
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    cancelBtn.addEventListener('click', () => document.body.removeChild(modal));
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = listContainer.querySelectorAll('.family-blast-item');
        
        items.forEach(item => {
            const name = item.querySelector('.family-blast-name').textContent.toLowerCase();
            if (name.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // Quick select buttons
    const selectAll = modal.querySelector('#select-all');
    const clearAll = modal.querySelector('#clear-all');
    
    selectAll.addEventListener('click', () => selectAllAvailable(mode));
    clearAll.addEventListener('click', () => clearAllSelections());
    
    // Blast buttons
    actionBtn.addEventListener('click', () => generateBlast(mode));
}

function selectAllAvailable(mode) {
    const checkboxes = document.querySelectorAll('.family-blast-checkbox');
    const isTextMode = mode === 'text';
    
    checkboxes.forEach(checkbox => {
        const personId = parseInt(checkbox.closest('.family-blast-item').dataset.personId);
        const person = familyData.find(p => p.id === personId);
        const status = getContactStatus(person);
        
        if (isTextMode) {
            // Text mode: only select people who can receive texts (green dots)
            checkbox.checked = status.available;
        } else {
            // Email mode: select people who have emails (green, orange, blue dots)
            checkbox.checked = status.hasEmail;
        }
    });
}

function clearAllSelections() {
    const checkboxes = document.querySelectorAll('.family-blast-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
}

function generateBlast(mode) {
    const selectedPeople = getSelectedPeople();
    const isTextMode = mode === 'text';
    
    if (isTextMode) {
        // Text blast logic
        const textablePeople = selectedPeople.filter(person => 
            person.contact && 
            person.contact.phone && 
            person.contact.canReceiveTexts
        );
        
        // Check if any selected people can't receive texts
        const nonTextablePeople = selectedPeople.filter(person => 
            !person.contact || 
            !person.contact.phone || 
            !person.contact.canReceiveTexts
        );
        
        if (textablePeople.length === 0) {
            let errorMessage = 'No selected people can receive text messages.\n\n';
            if (nonTextablePeople.length > 0) {
                errorMessage += 'The following people cannot receive texts:\n';
                nonTextablePeople.forEach(person => {
                    if (!person.contact || !person.contact.phone) {
                        errorMessage += `• ${person.name} (no phone number)\n`;
                    } else if (!person.contact.canReceiveTexts) {
                        errorMessage += `• ${person.name} (landline only)\n`;
                    }
                });
            }
            alert(errorMessage);
            return;
        }
        
        const phoneNumbers = textablePeople
            .map(person => person.contact.phone.replace(/[^\d+]/g, ''))
            .filter(phone => phone.length > 0);
        
        if (phoneNumbers.length > 0) {
            // Copy numbers (one per line) to clipboard for Messages
            const numbersText = phoneNumbers.join('\n');

            // Show confirmation with names before copying
            let confirmMessage = `Ready to copy ${phoneNumbers.length} phone numbers for Messages:\n\n`;
            textablePeople.forEach(person => {
                confirmMessage += `• ${person.name} (${person.contact.phone})\n`;
            });
            confirmMessage += '\nClick OK to copy numbers to clipboard.';

            if (confirm(confirmMessage)) {
                navigator.clipboard.writeText(numbersText).then(() => {
                    let successMessage = `Copied ${phoneNumbers.length} phone numbers to clipboard!\n\nNow open Messages and paste into the To: field.\n`;
                    // Add info about filtered out people
                    if (nonTextablePeople.length > 0) {
                        successMessage += '\nThe following people were not included (cannot receive texts):\n';
                        nonTextablePeople.forEach(person => {
                            if (!person.contact || !person.contact.phone) {
                                successMessage += `• ${person.name} (no phone number)\n`;
                            } else if (!person.contact.canReceiveTexts) {
                                successMessage += `• ${person.name} (landline only)\n`;
                            }
                        });
                    }
                    alert(successMessage);
                }).catch(err => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = numbersText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Numbers copied! Open Messages and paste into the To: field.');
                });
            }
            console.log(`Copied ${phoneNumbers.length} phone numbers to clipboard:`, phoneNumbers);
        }
    } else {
        // Email blast logic
        const emailPeople = selectedPeople.filter(person => 
            person.contact && 
            person.contact.email
        );
        
        // Check if any selected people don't have emails
        const nonEmailPeople = selectedPeople.filter(person => 
            !person.contact || 
            !person.contact.email
        );
        
        if (emailPeople.length === 0) {
            let errorMessage = 'No selected people have email addresses.\n\n';
            if (nonEmailPeople.length > 0) {
                errorMessage += 'The following people do not have email addresses:\n';
                nonEmailPeople.forEach(person => {
                    if (!person.contact) {
                        errorMessage += `• ${person.name} (no contact info)\n`;
                    } else if (!person.contact.email) {
                        errorMessage += `• ${person.name} (no email address)\n`;
                    }
                });
            }
            alert(errorMessage);
            return;
        }
        
        const emails = emailPeople
            .map(person => person.contact.email)
            .filter(email => email && email.includes('@'));
        
        if (emails.length > 0) {
            const mailUrl = `mailto:${emails.join(',')}`;
            
            // Show confirmation before opening Mail
            let confirmMessage = `Ready to open Mail with ${emails.length} email addresses:\n\n`;
            emailPeople.forEach(person => {
                confirmMessage += `• ${person.name} (${person.contact.email})\n`;
            });
            confirmMessage += '\nClick OK to open Mail app.';
            
            if (confirm(confirmMessage)) {
                window.open(mailUrl);
                
                // Show info about filtered out people
                if (nonEmailPeople.length > 0) {
                    let infoMessage = `Opened Mail with ${emails.length} email addresses.\n\nThe following people were not included (no email addresses):\n`;
                    nonEmailPeople.forEach(person => {
                        if (!person.contact) {
                            infoMessage += `• ${person.name} (no contact info)\n`;
                        } else if (!person.contact.email) {
                            infoMessage += `• ${person.name} (no email address)\n`;
                        }
                    });
                    alert(infoMessage);
                }
            }
            
            console.log(`Opening Mail with ${emails.length} email addresses:`, emails);
        }
    }
}

function getSelectedPeople() {
    const selectedCheckboxes = document.querySelectorAll('.family-blast-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(checkbox => 
        parseInt(checkbox.closest('.family-blast-item').dataset.personId)
    );
    
    return familyData.filter(person => selectedIds.includes(person.id));
} 

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getAgeSummary(person) {
    if (!person || !person.birthDate) {
        return null;
    }
    const birthDate = new Date(person.birthDate);
    if (isNaN(birthDate.getTime())) {
        return null;
    }

    const referenceDate = person.deathDate ? new Date(person.deathDate) : new Date();
    if (isNaN(referenceDate.getTime())) {
        return null;
    }

    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    const dayDiff = referenceDate.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }

    if (age < 0) {
        return null;
    }

    return {
        label: person.deathDate ? 'Age at death' : 'Age',
        value: `${age}`
    };
}

// Modal for editing relationships
const enhancedShowEditRelationshipsModal = function(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) {
        return;
    }

    const personMap = new Map(familyData.map(p => [p.id, p]));
    const parentIds = new Set((person.parents || []).filter(id => id !== personId));
    const childIds = new Set((person.children || []).filter(id => id !== personId));
    let spouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    if (spouseId === personId) spouseId = null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-dialog relationship-modal">
        <button type="button" class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div class="modal-section">
          <label>Full Name:<br/><input type="text" id="edit-fullName" value="${person.name || ''}" placeholder="Full legal name"></label><br/>
          <label>Nickname:<br/><input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name:<br/><input type="text" id="edit-middleName" value="${person.middle_name || person.middleName || ''}"></label><br/>
          <label>Pronouns:<br/>
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date:<br/><input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label>
        </div>
        <div class="modal-section">
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search..." />
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div class="modal-section">
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search..." />
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div class="modal-section">
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search..." />
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div class="modal-section">
          <label>Wedding Date:<br/><input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && (person.marriages[0].weddingDate || '')) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date:<br/><input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && (person.marriages[0].divorceDate || '')) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label>
        </div>
        <div class="modal-actions">
          <button type="button" id="save-relationships-btn" class="primary">Save</button>
          <button type="button" id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    const parentsListEl = overlay.querySelector('#edit-selected-parents-list');
    const childrenListEl = overlay.querySelector('#edit-selected-children-list');
    const spouseDisplayEl = overlay.querySelector('#edit-selected-spouse-display');

    const pronounsSelect = overlay.querySelector('#edit-pronouns');
    const pronounsCustomInput = overlay.querySelector('#edit-pronouns-custom');
    if (pronounsSelect && pronounsCustomInput) {
        const presetPronouns = ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"];
        if (person.pronouns && presetPronouns.includes(person.pronouns)) {
            pronounsSelect.value = person.pronouns;
        } else if (person.pronouns) {
            pronounsSelect.value = 'custom';
            pronounsCustomInput.style.display = 'inline-block';
            pronounsCustomInput.value = person.pronouns;
        }
        pronounsSelect.addEventListener('change', () => {
            if (pronounsSelect.value === 'custom') {
                pronounsCustomInput.style.display = 'inline-block';
                pronounsCustomInput.focus();
            } else {
                pronounsCustomInput.style.display = 'none';
                pronounsCustomInput.value = '';
            }
        });
    }

    const deceasedCheckbox = overlay.querySelector('#edit-deceased');
    const deathDateInput = overlay.querySelector('#edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deathDateInput.disabled = !deceasedCheckbox.checked;
        deceasedCheckbox.addEventListener('change', () => {
            deathDateInput.disabled = !deceasedCheckbox.checked;
            if (!deceasedCheckbox.checked) deathDateInput.value = '';
        });
    }

    const divorcedCheckbox = overlay.querySelector('#edit-divorced');
    const divorceDateInput = overlay.querySelector('#edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorceDateInput.disabled = !divorcedCheckbox.checked;
        divorcedCheckbox.addEventListener('change', () => {
            divorceDateInput.disabled = !divorcedCheckbox.checked;
            if (!divorcedCheckbox.checked) divorceDateInput.value = '';
        });
    }

    const renderSelectedList = (idsArray, container, type) => {
        container.innerHTML = '';
        if (!idsArray.length) {
            const empty = document.createElement('span');
            empty.classList.add('empty-selected');
            empty.textContent = type === 'spouse' ? 'No spouse selected yet.' : 'No selections yet.';
            container.appendChild(empty);
            return;
        }

        idsArray.forEach(id => {
            const relative = personMap.get(id);
            if (!relative) return;
            const tag = document.createElement('span');
            tag.classList.add('selected-item-tag');
            tag.innerHTML = `${relative.name} <span class="suggestion-item-dob">(${relative.birthDate || 'DOB unknown'})</span>`;
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('remove-item');
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => {
                if (type === 'parent') {
                    parentIds.delete(id);
                    renderParents();
                } else if (type === 'child') {
                    childIds.delete(id);
                    renderChildren();
                } else if (type === 'spouse') {
                    spouseId = null;
                    renderSpouse();
                }
            });
            tag.appendChild(removeBtn);
            container.appendChild(tag);
        });
    };

    const renderParents = () => renderSelectedList(Array.from(parentIds), parentsListEl, 'parent');
    const renderChildren = () => renderSelectedList(Array.from(childIds), childrenListEl, 'child');
    const renderSpouse = () => {
        if (!spouseId) {
            renderSelectedList([], spouseDisplayEl, 'spouse');
        } else {
            renderSelectedList([spouseId], spouseDisplayEl, 'spouse');
        }
    };

    renderParents();
    renderChildren();
    renderSpouse();

    const attachAutocomplete = (inputSelector, suggestionsSelector, type) => {
        const inputEl = overlay.querySelector(inputSelector);
        const suggestionsEl = overlay.querySelector(suggestionsSelector);
        if (!inputEl || !suggestionsEl) return;

        const hideSuggestions = () => {
            suggestionsEl.innerHTML = '';
            suggestionsEl.style.display = 'none';
        };

        inputEl.addEventListener('input', () => {
            const query = inputEl.value.trim().toLowerCase();
            suggestionsEl.innerHTML = '';

            if (!query) {
                hideSuggestions();
                return;
            }

            const matches = familyData.filter(candidate => {
                if (candidate.id === personId) return false;
                if (!candidate.name || !candidate.name.toLowerCase().includes(query)) return false;
                if (type === 'parent' && parentIds.has(candidate.id)) return false;
                if (type === 'child' && childIds.has(candidate.id)) return false;
                if (type === 'spouse' && spouseId === candidate.id) return false;
                return true;
            }).slice(0, 8);

            if (!matches.length) {
                hideSuggestions();
                return;
            }

            matches.forEach(candidate => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                  <span>${candidate.name}</span>
                  <span class="suggestion-item-dob">${candidate.birthDate || 'DOB unknown'}</span>
                `;
                item.addEventListener('mousedown', event => {
                    event.preventDefault();
                    if (type === 'parent') {
                        parentIds.add(candidate.id);
                        renderParents();
                    } else if (type === 'child') {
                        childIds.add(candidate.id);
                        renderChildren();
                    } else if (type === 'spouse') {
                        spouseId = candidate.id;
                        renderSpouse();
                    }
                    inputEl.value = '';
                    hideSuggestions();
                });
                suggestionsEl.appendChild(item);
            });

            suggestionsEl.style.display = 'block';
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 150);
        });
    };

    attachAutocomplete('#edit-parents-input', '#edit-parents-suggestions', 'parent');
    attachAutocomplete('#edit-children-input', '#edit-children-suggestions', 'child');
    attachAutocomplete('#edit-spouse-input', '#edit-spouse-suggestions', 'spouse');

    const closeModal = () => {
        overlay.remove();
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    };

    overlay.querySelector('#cancel-relationships-btn').addEventListener('click', closeModal);
    overlay.querySelector('#close-modal-x').addEventListener('click', closeModal);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    const escListener = event => {
        if (event.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', escListener);

    overlay.querySelector('#save-relationships-btn').addEventListener('click', async () => {
        try {
            const fullNameValue = overlay.querySelector('#edit-fullName').value.trim();
            if (!fullNameValue) {
                alert('Please enter the full name before saving.');
                return;
            }
            const nickname = overlay.querySelector('#edit-nickname').value.trim();
            const middleNameValue = overlay.querySelector('#edit-middleName').value.trim();
            const pronounValue = pronounsSelect ? pronounsSelect.value : '';
            const pronounCustom = pronounsCustomInput ? pronounsCustomInput.value.trim() : '';
            const finalPronouns = pronounValue === 'custom' ? pronounCustom : pronounValue;
            const isDeceased = deceasedCheckbox ? deceasedCheckbox.checked : false;
            const deathDateValue = isDeceased && deathDateInput ? deathDateInput.value.trim() : '';
            const weddingDateValue = overlay.querySelector('#edit-weddingDate').value.trim();
            const isDivorced = divorcedCheckbox ? divorcedCheckbox.checked : false;
            const divorceDateValue = isDivorced && divorceDateInput ? divorceDateInput.value.trim() : '';

            const updatedPayload = {
                ...person,
                name: fullNameValue,
                nickname,
                middle_name: middleNameValue,
                middleName: middleNameValue,
                pronouns: finalPronouns,
                deathDate: deathDateValue,
                marriages: spouseId ? [{
                    spouseId,
                    weddingDate: weddingDateValue,
                    divorceDate: isDivorced ? divorceDateValue : undefined
                }] : []
            };

            await updatePersonAPI(personId, updatedPayload);
            await updatePersonRelationships(
                personId,
                Array.from(parentIds),
                Array.from(childIds),
                spouseId || null
            );

            await loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            displayPersonDetails(personId);
            closeModal();
        } catch (error) {
            console.error('Failed to save relationships:', error);
            alert(error.message || 'Failed to save changes. Please try again.');
        }
    });
};

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Ensure the enhanced modal implementation is used everywhere
showEditRelationshipsModal = enhancedShowEditRelationshipsModal;

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark onboarding as completed when user finishes
function completeOnboarding() {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Hide onboarding overlay
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'none';
    } else {
      console.warn('onboarding-overlay element is missing from the HTML.');
    }
    
    // Show the main family tree app
    document.getElementById('family-tree-app').style.display = 'block';
    
    // Set the auth token for the main app
    authToken = onboardingAuthToken;
    localStorage.setItem('authToken', authToken);
    
    // Initialize the main app
    updateUIForAuth();
    loadFamilyDataFromAPI();
    renderFamilyTree();
    renderUpcomingBirthdays();
    setupAppEventListeners();
}

// Add this helper near the top of the file
function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Modal for editing relationships
function showEditRelationshipsModal(personId) {
    const person = familyData.find(p => p.id === personId);
    if (!person) return;
    document.body.classList.add('modal-open');
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" id="close-modal-x" title="Close">&times;</button>
        <h3>Edit Relationships for ${person.nickname || person.name}</h3>
        <div style="margin-bottom:10px;">
          <strong>Name:</strong> ${person.name}<br/>
          <label>Nickname: <input type="text" id="edit-nickname" value="${person.nickname || ''}" placeholder="Preferred name (used in tree)"></label><br/>
          <label>Middle Name: <input type="text" id="edit-middleName" value="${person.middleName || ''}"></label><br/>
          <label>Pronouns:
            <select id="edit-pronouns">
              <option value="">-- Select --</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="ze/zir">ze/zir</option>
              <option value="xe/xem">xe/xem</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="text" id="edit-pronouns-custom" placeholder="Enter custom pronouns" style="display:none; margin-top:5px;">
          </label><br/>
          <label><input type="checkbox" id="edit-deceased" ${person.deathDate ? 'checked' : ''}> Deceased</label><br/>
          <label>Death Date: <input type="text" id="edit-deathDate" value="${person.deathDate || ''}" ${person.deathDate ? '' : 'disabled'}></label><br/>
        </div>
        <div>
          <label>Parents:</label>
          <input type="text" id="edit-parents-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-parents-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-parents-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Children:</label>
          <input type="text" id="edit-children-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-children-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-children-list" class="selected-items-list"></div>
        </div>
        <div>
          <label>Spouse:</label>
          <input type="text" id="edit-spouse-input" autocomplete="off" placeholder="Type to search...">
          <div id="edit-spouse-suggestions" class="autocomplete-suggestions"></div>
          <div id="edit-selected-spouse-display" class="selected-items-list"></div>
        </div>
        <div>
          <label>Wedding Date: <input type="text" id="edit-weddingDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].weddingDate) || ''}" placeholder="YYYY-MM-DD or free text"></label><br/>
          <label><input type="checkbox" id="edit-divorced" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? 'checked' : ''}> Divorced</label><br/>
          <label>Divorce Date: <input type="text" id="edit-divorceDate" value="${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) || ''}" ${(person.marriages && person.marriages[0] && person.marriages[0].divorceDate) ? '' : 'disabled'} placeholder="YYYY-MM-DD or free text"></label><br/>
        </div>
        <div style="margin-top:10px;">
          <button id="save-relationships-btn">Save</button>
          <button id="cancel-relationships-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // Pre-fill selected relationships
    let editSelectedParentIds = person.parents ? [...person.parents] : [];
    let editSelectedChildrenIds = person.children ? [...person.children] : [];
    let editSelectedSpouseId = (person.marriages && person.marriages[0]) ? person.marriages[0].spouseId : null;
    renderSelectedItems(editSelectedParentIds, familyData, document.getElementById('edit-selected-parents-list'), { value: '' }, 'parent');
    renderSelectedItems(editSelectedChildrenIds, familyData, document.getElementById('edit-selected-children-list'), { value: '' }, 'child');
    renderSelectedItems(editSelectedSpouseId ? [editSelectedSpouseId] : [], familyData, document.getElementById('edit-selected-spouse-display'), { value: '' }, 'spouse');
    setupEditAutocomplete('edit-parents-input', 'edit-parents-suggestions', 'edit-selected-parents-list', 'parent');
    setupEditAutocomplete('edit-children-input', 'edit-children-suggestions', 'edit-selected-children-list', 'child');
    setupEditAutocomplete('edit-spouse-input', 'edit-spouse-suggestions', 'edit-selected-spouse-display', 'spouse');
    // Pronouns dropdown logic
    const pronounsSelect = document.getElementById('edit-pronouns');
    const pronounsCustom = document.getElementById('edit-pronouns-custom');
    if (pronounsSelect && pronounsCustom) {
        pronounsSelect.value = person.pronouns && ["he/him","she/her","they/them","he/they","she/they","ze/zir","xe/xem"].includes(person.pronouns) ? person.pronouns : (person.pronouns ? 'custom' : '');
        pronounsCustom.style.display = pronounsSelect.value === 'custom' ? 'inline-block' : 'none';
        if (pronounsSelect.value === 'custom') pronounsCustom.value = person.pronouns || '';
        pronounsSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                pronounsCustom.style.display = 'inline-block';
            } else {
                pronounsCustom.style.display = 'none';
                pronounsCustom.value = '';
            }
        });
    }
    // Deceased/death date logic
    const deceasedCheckbox = document.getElementById('edit-deceased');
    const deathDateInput = document.getElementById('edit-deathDate');
    if (deceasedCheckbox && deathDateInput) {
        deceasedCheckbox.addEventListener('change', function() {
            deathDateInput.disabled = !this.checked;
            if (!this.checked) deathDateInput.value = '';
        });
    }
    // Divorced/divorce date logic
    const divorcedCheckbox = document.getElementById('edit-divorced');
    const divorceDateInput = document.getElementById('edit-divorceDate');
    if (divorcedCheckbox && divorceDateInput) {
        divorcedCheckbox.addEventListener('change', function() {
            divorceDateInput.disabled = !this.checked;
            if (!this.checked) divorceDateInput.value = '';
        });
    }
    // Save/cancel/close handlers
    function closeModal() {
        document.body.removeChild(modal);
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escListener);
    }
    document.getElementById('save-relationships-btn').onclick = async function() {
        // Save all fields to backend
        const nickname = document.getElementById('edit-nickname').value.trim();
        const middleName = document.getElementById('edit-middleName').value.trim();
        let pronouns = document.getElementById('edit-pronouns').value;
        if (pronouns === 'custom') pronouns = document.getElementById('edit-pronouns-custom').value.trim();
        const deceased = document.getElementById('edit-deceased').checked;
        const deathDate = deceased ? document.getElementById('edit-deathDate').value.trim() : '';
        // Wedding/divorce
        const weddingDate = document.getElementById('edit-weddingDate').value.trim();
        const divorced = document.getElementById('edit-divorced').checked;
        const divorceDate = divorced ? document.getElementById('edit-divorceDate').value.trim() : '';
        // Update person in backend
        await updatePersonAPI(personId, {
            ...person,
            nickname,
            middleName,
            pronouns,
            deathDate,
            marriages: [{
                spouseId: editSelectedSpouseId,
                weddingDate,
                divorceDate: divorced ? divorceDate : undefined
            }]
        });
        await updatePersonRelationships(personId, editSelectedParentIds, editSelectedChildrenIds, editSelectedSpouseId);
        closeModal();
        displayPersonDetails(personId);
    };
    document.getElementById('cancel-relationships-btn').onclick = closeModal;
    document.getElementById('close-modal-x').onclick = closeModal;
    function escListener(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', escListener);
}

// Update tree and details display logic to use nickname if present, and show all new fields
// ... existing code ...

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has completed onboarding or is already logged in
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const existingAuthToken = localStorage.getItem('authToken');
    
    if (hasCompletedOnboarding || existingAuthToken) {
        // Skip onboarding, show main app
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'none';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        if (existingAuthToken) {
            authToken = existingAuthToken;
            updateUIForAuth();
            loadFamilyDataFromAPI();
            renderFamilyTree();
            renderUpcomingBirthdays();
            setupAppEventListeners();
        } else {
            showAuthModal();
        }
    } else {
        // Show onboarding for new users
        const onboardingOverlay = document.getElementById('onboarding-overlay');
        if (onboardingOverlay) {
          onboardingOverlay.style.display = 'flex';
        } else {
          console.warn('onboarding-overlay element is missing from the HTML.');
        }
        
        document.getElementById('family-tree-app').style.display = 'none';
    }
    
    // Setup auth event listeners for the main app
    setupAuthEventListeners();
});

// Mark