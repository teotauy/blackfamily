<script lang="ts">
import { onMount } from 'svelte';

let step = 1; // 1: Welcome, 2: CSV, 3: Demo
let csvResult: any[] = [];
let csvError: string = '';
let uploadStatus: string = '';
let isUploading: boolean = false;

const BACKEND_URL = 'https://blackfamily-production.up.railway.app';

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
            step = 3;
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
                    'Authorization': 'Bearer your-token-here' // You'll need to add authentication
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

function resetOnboarding() {
    step = 1;
    csvResult = [];
    csvError = '';
    uploadStatus = '';
}
</script>

<h1>Family Tree App</h1>

<nav style="margin-bottom:2em;">
    <ol style="display:flex;gap:2em;list-style:none;padding:0;">
        <li style="font-weight:{step===1?'bold':'normal'};color:{step===1?'#1976d2':'#888'}">1. Welcome</li>
        <li style="font-weight:{step===2?'bold':'normal'};color:{step===2?'#1976d2':'#888'}">2. CSV Upload</li>
        <li style="font-weight:{step===3?'bold':'normal'};color:{step===3?'#1976d2':'#888'}">3. Demo</li>
    </ol>
    <button on:click={resetOnboarding} style="margin-top:1em;">Restart</button>
</nav>

{#if step === 1}
    <section>
        <h2>Welcome to Family Tree App</h2>
        <p>This is a simple demo app that can parse CSV files.</p>
        <button on:click={() => step = 2} style="background:#1976d2;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;">
            Get Started
        </button>
    </section>
{/if}

{#if step === 2}
    <section>
        <h2>Step 2: Upload Your Contact CSV</h2>
        <input type="file" accept=".csv,text/csv" on:change={handleCSVUpload} />
        {#if csvError}
            <p style="color:red;">{csvError}</p>
        {/if}
        {#if csvResult.length > 0}
            <h3>CSV Parsed Successfully!</h3>
            <p>Found {csvResult.length} contacts</p>
            <button on:click={() => step = 3} style="background:#1976d2;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;">
                Continue to Demo
            </button>
        {/if}
    </section>
{/if}

{#if step === 3}
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
    </section>
{/if}
