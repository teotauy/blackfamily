<script lang="ts">
import { onMount } from 'svelte';

let step = 1; // 1: Welcome, 2: Login, 3: CSV, 4: Demo, 5: View Data
let csvResult: any[] = [];
let csvError: string = '';
let uploadStatus: string = '';
let isUploading: boolean = false;

// Login state
let email: string = '';
let password: string = '';
let authToken: string = '';
let isLoggedIn: boolean = false;
let loginError: string = '';

// Data viewing state
let uploadedPeople: any[] = [];
let isLoadingData: boolean = false;
let dataError: string = '';

const BACKEND_URL = 'https://blackfamily-production.up.railway.app';

async function handleLogin() {
    loginError = '';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            isLoggedIn = true;
            step = 3; // Go to CSV upload
        } else {
            loginError = data.error || 'Login failed';
        }
    } catch (error) {
        loginError = 'Network error: ' + error.message;
    }
}

function handleCSVUpload(event: Event) {
    csvError = '';
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) throw new Error('CSV must have header and at least one row');
            const headers = lines[0].split(',').map(h => h.trim());
            csvResult = lines.slice(1).map(line => {
                const values = line.split(',');
                const obj: Record<string, string> = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i] || '';
                });
                return obj;
            });
            step = 4; // Go to demo
        } catch (err) {
            csvError = 'Error parsing CSV: ' + err;
            csvResult = [];
        }
    };
    reader.readAsText(file);
}



async function uploadToBackend() {
    if (csvResult.length === 0) {
        uploadStatus = 'No data to upload';
        return;
    }
    
    isUploading = true;
    uploadStatus = 'Uploading...';
    
    try {
        // Convert CSV data to the format your backend expects
        const peopleData = csvResult.map(row => ({
            name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
            birthDate: row['DOB'] || row['Birth Date'] || '',
            contact_email: row['Email'] || '',
            contact_phone: row['Phone'] || '',
            bio: `Imported from CSV: ${row['Notes'] || ''}`
        }));
        
        // Upload each person to the backend
        for (const person of peopleData) {
            const response = await fetch(`${BACKEND_URL}/api/people`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(person)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to upload: ${response.statusText}`);
            }
        }
        
        uploadStatus = `Successfully uploaded ${peopleData.length} people!`;
    } catch (error) {
        uploadStatus = `Upload failed: ${error.message}`;
        console.error('Upload error:', error);
    } finally {
        isUploading = false;
    }
}

async function loadUploadedData() {
    isLoadingData = true;
    dataError = '';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/people`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            uploadedPeople = await response.json();
        } else {
            dataError = 'Failed to load data: ' + response.statusText;
        }
    } catch (error) {
        dataError = 'Network error: ' + error.message;
    } finally {
        isLoadingData = false;
    }
}

function resetOnboarding() {
    step = 1;
    csvResult = [];
    csvError = '';
    uploadStatus = '';
    email = '';
    password = '';
    authToken = '';
    isLoggedIn = false;
    loginError = '';
    uploadedPeople = [];
    isLoadingData = false;
    dataError = '';
}
</script>

<h1>Family Tree App</h1>

<nav style="margin-bottom:2em;">
    <ol style="display:flex;gap:2em;list-style:none;padding:0;">
        <li style="font-weight:{step===1?'bold':'normal'};color:{step===1?'#1976d2':'#888'}">1. Welcome</li>
        <li style="font-weight:{step===2?'bold':'normal'};color:{step===2?'#1976d2':'#888'}">2. Login</li>
        <li style="font-weight:{step===3?'bold':'normal'};color:{step===3?'#1976d2':'#888'}">3. CSV Upload</li>
        <li style="font-weight:{step===4?'bold':'normal'};color:{step===4?'#1976d2':'#888'}">4. Demo</li>
        <li style="font-weight:{step===5?'bold':'normal'};color:{step===5?'#1976d2':'#888'}">5. View Data</li>
    </ol>
    <button on:click={resetOnboarding} style="margin-top:1em;">Restart</button>
</nav>

{#if step === 1}
    <section>
        <h2>Welcome to Family Tree App</h2>
        <p>This app can upload CSV data to your family tree database.</p>
        <button on:click={() => step = 2} style="background:#1976d2;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;">
            Get Started
        </button>
    </section>
{/if}

{#if step === 2}
    <section>
        <h2>Step 2: Login to Your Database</h2>
        <p>You need to login to upload data to your family tree database.</p>
        
        <div style="max-width:400px;margin:2em 0;">
            <div style="margin-bottom:1em;">
                <label for="email" style="display:block;margin-bottom:0.5em;">Email:</label>
                <input 
                    type="email" 
                    id="email"
                    bind:value={email}
                    style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"
                    placeholder="admin@familytree.com"
                />
            </div>
            
            <div style="margin-bottom:1em;">
                <label for="password" style="display:block;margin-bottom:0.5em;">Password:</label>
                <input 
                    type="password" 
                    id="password"
                    bind:value={password}
                    style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"
                    placeholder="adminpassword"
                />
            </div>
            
            <button 
                on:click={handleLogin}
                style="background:#1976d2;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;width:100%;"
            >
                Login
            </button>
            
            {#if loginError}
                <p style="color:red;margin-top:1em;">{loginError}</p>
            {/if}
        </div>
        
        <p style="color:#888;font-size:0.9em;">
            <strong>Default credentials:</strong><br>
            Email: admin@familytree.com<br>
            Password: adminpassword
        </p>
    </section>
{/if}

{#if step === 3}
    <section>
        <h2>Step 3: Upload Your Contact CSV</h2>
        <p>Now you can upload CSV files to your database.</p>
        <input type="file" accept=".csv,text/csv" on:change={handleCSVUpload} />
        {#if csvError}
            <p style="color:red;">{csvError}</p>
        {/if}
        {#if csvResult.length > 0}
            <h3>CSV Parsed Successfully!</h3>
            <p>Found {csvResult.length} contacts</p>
            <button on:click={() => step = 4} style="background:#1976d2;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;">
                Continue to Demo
            </button>
        {/if}
    </section>
{/if}

{#if step === 4}
    <section>
        <h2>Demo: CSV Data</h2>
        {#if csvResult.length > 0}
            <h3>Your CSV Data:</h3>
            <div style="max-height:400px;overflow-y:auto;border:1px solid #ccc;padding:1em;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f5f5f5;">
                            {#each Object.keys(csvResult[0]) as header}
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">{header}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each csvResult as row}
                            <tr>
                                {#each Object.values(row) as value}
                                    <td style="padding:8px;border:1px solid #ddd;">{value}</td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            
            <!-- Upload Section -->
            <div style="margin-top:2em;padding:1em;background:#f9f9f9;border-radius:8px;">
                <h4>Upload to Database</h4>
                <p>Upload these {csvResult.length} contacts to your family tree database:</p>
                
                <button 
                    on:click={uploadToBackend}
                    disabled={isUploading}
                    style="background:#1976d2;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;font-size:16px;margin-right:1em;"
                >
                    {isUploading ? 'Uploading...' : 'Upload to Database'}
                </button>
                
                {#if uploadStatus}
                    <p style="margin-top:1em;color:{uploadStatus.includes('Successfully') ? 'green' : uploadStatus.includes('failed') ? 'red' : '#666'};">
                        {uploadStatus}
                    </p>
                {/if}
            </div>
        {/if}
        
        <p style="margin-top:2em;color:#888;">
            This app can now upload CSV data to your Railway backend database!
        </p>
        
        <!-- View Data Button -->
        <div style="margin-top:2em;padding:1em;background:#f0f8ff;border-radius:8px;">
            <h4>View Your Uploaded Data</h4>
            <p>See all the people you've uploaded to your database:</p>
            <button 
                on:click={() => { loadUploadedData(); step = 5; }}
                style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;font-size:16px;"
            >
                View All People
            </button>
        </div>
    </section>
{/if}

{#if step === 5}
    <section>
        <h2>Your Family Tree Database</h2>
        <p>Here are all the people in your database:</p>
        
        {#if isLoadingData}
            <p>Loading your data...</p>
        {:else if dataError}
            <p style="color:red;">{dataError}</p>
            <button on:click={loadUploadedData} style="background:#1976d2;color:white;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;">
                Try Again
            </button>
        {:else if uploadedPeople.length > 0}
            <div style="margin-top:1em;">
                <h3>Total People: {uploadedPeople.length}</h3>
                <div style="max-height:600px;overflow-y:auto;border:1px solid #ccc;padding:1em;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f5f5f5;">
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">ID</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Birth Date</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Phone</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Bio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each uploadedPeople as person}
                                <tr>
                                    <td style="padding:8px;border:1px solid #ddd;">{person.id}</td>
                                    <td style="padding:8px;border:1px solid #ddd;">{person.name}</td>
                                    <td style="padding:8px;border:1px solid #ddd;">{person.birthDate || '-'}</td>
                                    <td style="padding:8px;border:1px solid #ddd;">{person.contact_email || '-'}</td>
                                    <td style="padding:8px;border:1px solid #ddd;">{person.contact_phone || '-'}</td>
                                    <td style="padding:8px;border:1px solid #ddd;max-width:200px;overflow:hidden;text-overflow:ellipsis;">{person.bio || '-'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {:else}
            <p>No people found in your database. Try uploading some CSV data first!</p>
        {/if}
        
        <div style="margin-top:2em;">
            <button on:click={() => step = 3} style="background:#1976d2;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;margin-right:1em;">
                Upload More Data
            </button>
            <button on:click={() => step = 4} style="background:#6c757d;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;margin-right:1em;">
                Back to Demo
            </button>
            <button on:click={() => window.location.href = '/'} style="background:#28a745;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">
                🌳 Enter Full Family Tree App
            </button>
        </div>
    </section>
{/if}
