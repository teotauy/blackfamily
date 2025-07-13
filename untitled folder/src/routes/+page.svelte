<script lang="ts">
import { onMount } from 'svelte';
import parseGedcom from 'parse-gedcom';

let step = 1; // 1: GEDCOM, 2: CSV, 3: Matching
let gedcomResult: any = null;
let gedcomError: string = '';
let csvResult: any[] = [];
let csvError: string = '';

// Normalized data for matching
let normalizedIndividuals: any[] = [];
let matchResults: any[] = [];
let confirmedMatches: any[] = [];
let highlightedIndividualId: string | null = null;

function handleGEDCOMUpload(event: Event) {
    gedcomError = '';
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            gedcomResult = parseGedcom(text);
            step = 2;
        } catch (err) {
            gedcomError = 'Error parsing GEDCOM: ' + err;
            gedcomResult = null;
        }
    };
    reader.readAsText(file);
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
            step = 3;
            normalizeGedcomIndividuals();
            runSmartMatching();
            confirmedMatches = matchResults.map(() => ({ status: 'pending', match: null }));
        } catch (err) {
            csvError = 'Error parsing CSV: ' + err;
            csvResult = [];
        }
    };
    reader.readAsText(file);
}

function resetOnboarding() {
    step = 1;
    gedcomResult = null;
    gedcomError = '';
    csvResult = [];
    csvError = '';
    normalizedIndividuals = [];
    matchResults = [];
    confirmedMatches = [];
}

// --- GEDCOM Normalization Logic ---
function getTag(tree: any[], tag: string) {
    return tree?.find((n: any) => n.tag === tag);
}

function getTags(tree: any[], tag: string) {
    return tree?.filter((n: any) => n.tag === tag) || [];
}

function normalizeGedcomIndividuals() {
    if (!gedcomResult || !Array.isArray(gedcomResult)) {
        normalizedIndividuals = [];
        return;
    }
    // Extract all individuals and families
    const individuals = gedcomResult.filter((n: any) => n.tag === 'INDI');
    const families = gedcomResult.filter((n: any) => n.tag === 'FAM');
    // Build a map of families for relationship lookup
    const famMap = new Map(families.map((fam: any) => [fam.pointer, fam]));
    // Build a map of individual pointers to index
    const indiMap = new Map(individuals.map((indi: any) => [indi.pointer, indi]));

    normalizedIndividuals = individuals.map((indi: any) => {
        const nameNode = getTag(indi.tree, 'NAME');
        let given = '', surname = '', fullName = '';
        if (nameNode) {
            fullName = nameNode.data || '';
            const givnNode = getTag(nameNode.tree, 'GIVN');
            const surnNode = getTag(nameNode.tree, 'SURN');
            given = givnNode?.data || '';
            surname = surnNode?.data || '';
        }
        const sexNode = getTag(indi.tree, 'SEX');
        const birthNode = getTag(indi.tree, 'BIRT');
        const birthDate = birthNode ? getTag(birthNode.tree, 'DATE')?.data || '' : '';
        const deathNode = getTag(indi.tree, 'DEAT');
        const deathDate = deathNode ? getTag(deathNode.tree, 'DATE')?.data || '' : '';
        // Find family relationships
        const famc = getTag(indi.tree, 'FAMC')?.data || null; // Child in family
        const fams = getTags(indi.tree, 'FAMS').map((n: any) => n.data); // Spouse in families
        // Find parents (from FAMC)
        let parentPointers: string[] = [];
        if (famc && famMap.has(famc)) {
            const fam = famMap.get(famc);
            const husb = getTag(fam.tree, 'HUSB')?.data;
            const wife = getTag(fam.tree, 'WIFE')?.data;
            parentPointers = [husb, wife].filter(Boolean);
        }
        // Find children (from FAMS)
        let childrenPointers: string[] = [];
        fams.forEach(famPtr => {
            if (famPtr && famMap.has(famPtr)) {
                const fam = famMap.get(famPtr);
                const children = getTags(fam.tree, 'CHIL').map((n: any) => n.data);
                childrenPointers.push(...children);
            }
        });
        // Find spouses (from FAMS)
        let spousePointers: string[] = [];
        fams.forEach(famPtr => {
            if (famPtr && famMap.has(famPtr)) {
                const fam = famMap.get(famPtr);
                const husb = getTag(fam.tree, 'HUSB')?.data;
                const wife = getTag(fam.tree, 'WIFE')?.data;
                // Exclude self
                [husb, wife].forEach(ptr => {
                    if (ptr && ptr !== indi.pointer) spousePointers.push(ptr);
                });
            }
        });
        return {
            id: indi.pointer,
            given,
            surname,
            fullName,
            birthDate,
            deathDate,
            gender: sexNode?.data || '',
            parents: parentPointers,
            children: childrenPointers,
            spouses: spousePointers
        };
    });
}

// --- Smart Matching Logic ---
function normalizeDate(dateStr: string) {
    // Normalize to YYYY-MM-DD if possible, else fallback to original
    if (!dateStr) return '';
    const m = dateStr.match(/(\d{4})[- \/]?(\d{1,2})?[- \/]?(\d{1,2})?/);
    if (!m) return dateStr;
    const [_, y, mo, d] = m;
    return [y, mo?.padStart(2, '0'), d?.padStart(2, '0')].filter(Boolean).join('-');
}

function runSmartMatching() {
    if (!csvResult || !normalizedIndividuals) {
        matchResults = [];
        return;
    }
    // Build lookup maps for individuals
    const byFullNameDOB = new Map();
    const byDOB = new Map();
    const byName = new Map();
    normalizedIndividuals.forEach(ind => {
        const dob = normalizeDate(ind.birthDate);
        const name = (ind.fullName || `${ind.given} ${ind.surname}`).trim().toLowerCase();
        if (dob && name) {
            byFullNameDOB.set(name + '|' + dob, ind);
        }
        if (dob) {
            if (!byDOB.has(dob)) byDOB.set(dob, []);
            byDOB.get(dob).push(ind);
        }
        if (name) {
            if (!byName.has(name)) byName.set(name, []);
            byName.get(name).push(ind);
        }
    });
    // Try to match each contact
    matchResults = csvResult.map(contact => {
        const contactName = (contact['First Name'] + ' ' + (contact['Last Name'] || '')).trim().toLowerCase();
        const contactDOB = normalizeDate(contact['DOB'] || contact['Birth Date'] || '');
        let match = null;
        let status = 'unmatched';
        let candidates = [];
        // 1. Exact name + DOB
        if (contactName && contactDOB) {
            const key = contactName + '|' + contactDOB;
            if (byFullNameDOB.has(key)) {
                match = byFullNameDOB.get(key);
                status = 'auto';
            }
        }
        // 2. Unique DOB
        if (!match && contactDOB && byDOB.has(contactDOB)) {
            const inds = byDOB.get(contactDOB);
            if (inds.length === 1) {
                match = inds[0];
                status = 'confirm-dob';
            } else if (inds.length > 1) {
                candidates = inds;
                status = 'ambiguous-dob';
            }
        }
        // 3. Unique name
        if (!match && contactName && byName.has(contactName)) {
            const inds = byName.get(contactName);
            if (inds.length === 1) {
                match = inds[0];
                status = 'confirm-name';
            } else if (inds.length > 1) {
                candidates = inds;
                status = 'ambiguous-name';
            }
        }
        return {
            contact,
            match,
            status,
            candidates
        };
    });
}

function confirmMatch(idx: number, match: any) {
    confirmedMatches[idx] = { status: 'confirmed', match };
}
function rejectMatch(idx: number) {
    confirmedMatches[idx] = { status: 'rejected', match: null };
}
function skipMatch(idx: number) {
    confirmedMatches[idx] = { status: 'skipped', match: null };
}

// Helper to find root individuals (no parents)
function findRootIndividuals() {
    if (!normalizedIndividuals.length) return [];
    const allIds = new Set(normalizedIndividuals.map(p => p.id));
    const childIds = new Set(normalizedIndividuals.flatMap(p => p.parents || []));
    return normalizedIndividuals.filter(p => !childIds.has(p.id));
}

// Helper to get children for a person
function getChildren(personId: string) {
    return normalizedIndividuals.filter(p => (p.parents || []).includes(personId));
}

// Helper to get spouse objects for a person
function getSpouses(person: any) {
    if (!person.spouses || !person.spouses.length) return [];
    return normalizedIndividuals.filter(p => person.spouses.includes(p.id));
}

function handleHighlight(id: string | null) {
    highlightedIndividualId = id;
}
</script>

<h1>Family Tree Onboarding</h1>

<nav style="margin-bottom:2em;">
    <ol style="display:flex;gap:2em;list-style:none;padding:0;">
        <li style="font-weight:{step===1?'bold':'normal'};color:{step===1?'#1976d2':'#888'}">1. GEDCOM Upload</li>
        <li style="font-weight:{step===2?'bold':'normal'};color:{step===2?'#1976d2':'#888'}">2. Contact CSV Upload</li>
        <li style="font-weight:{step===3?'bold':'normal'};color:{step===3?'#1976d2':'#888'}">3. Smart Matching</li>
    </ol>
    <button on:click={resetOnboarding} style="margin-top:1em;">Restart Onboarding</button>
</nav>

{#if step === 1}
    <section>
        <h2>Step 1: Upload Your GEDCOM File</h2>
        <input type="file" accept=".ged,.gedcom,.txt" on:change={handleGEDCOMUpload} />
        {#if gedcomError}
            <p style="color:red;">{gedcomError}</p>
        {/if}
        {#if gedcomResult}
            <h3>GEDCOM Parsed (summary)</h3>
            <pre>{JSON.stringify(gedcomResult, null, 2).slice(0, 2000)}{gedcomResult && JSON.stringify(gedcomResult, null, 2).length > 2000 ? '\n...truncated...' : ''}</pre>
        {/if}
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
            <h3>CSV Parsed (summary)</h3>
            <pre>{JSON.stringify(csvResult, null, 2).slice(0, 2000)}{csvResult && JSON.stringify(csvResult, null, 2).length > 2000 ? '\n...truncated...' : ''}</pre>
        {/if}
    </section>
{/if}

{#if step === 3}
    <section>
        <!-- Progress Bar -->
        {#if confirmedMatches.length > 0}
            { 
                // Calculate progress
                const processed = confirmedMatches.filter(m => m.status !== 'pending').length;
                const total = confirmedMatches.length;
                const percent = Math.round((processed / total) * 100);
            }
            <div style="margin-bottom:1em; width:100%; max-width:500px;">
                <div style="background:#eee; border-radius:8px; height:24px; overflow:hidden;">
                    <div style="background:#1976d2; height:100%; width:{percent}%; transition:width 0.3s; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                        {percent}%
                    </div>
                </div>
                <div style="font-size:0.9em; color:#555; margin-top:0.2em; text-align:right;">{processed} of {total} contacts processed</div>
            </div>
        {/if}
        <h3>Family Tree Visualization</h3>
        {#if normalizedIndividuals.length > 0}
            <div style="margin-bottom:2em;">
                {#each findRootIndividuals() as root}
                    <TreeNode {root} {highlightedIndividualId} />
                {/each}
            </div>
        {/if}
        <h3>Session Summary</h3>
        <ul>
            <li><strong>Confirmed:</strong> {confirmedMatches.filter(m => m.status === 'confirmed').length}</li>
            <li><strong>Rejected:</strong> {confirmedMatches.filter(m => m.status === 'rejected').length}</li>
            <li><strong>Skipped:</strong> {confirmedMatches.filter(m => m.status === 'skipped').length}</li>
            <li><strong>Pending:</strong> {confirmedMatches.filter(m => m.status === 'pending').length}</li>
        </ul>
        <h3>Contact Matching Results</h3>
        <ul>
            {#each matchResults as result, idx}
                <li style="margin-bottom:1em;">
                    <strong>{result.contact['First Name']} {result.contact['Last Name']}</strong> —
                    {#if confirmedMatches[idx]?.status === 'confirmed'}
                        <span style="color:green;">Confirmed: {confirmedMatches[idx].match.fullName || (confirmedMatches[idx].match.given + ' ' + confirmedMatches[idx].match.surname)} (DOB: {confirmedMatches[idx].match.birthDate})</span>
                    {:else if confirmedMatches[idx]?.status === 'rejected'}
                        <span style="color:red;">Rejected</span>
                    {:else if confirmedMatches[idx]?.status === 'skipped'}
                        <span style="color:gray;">Skipped</span>
                    {:else}
                        {#if result.status === 'auto' || result.status === 'confirm-dob' || result.status === 'confirm-name'}
                            <span style="color:orange;">Suggested match: {result.match.fullName || (result.match.given + ' ' + result.match.surname)} (DOB: {result.match.birthDate}) — <em>Needs confirmation</em></span>
                            <button on:click={() => confirmMatch(idx, result.match)}>Confirm</button>
                            <button on:click={() => rejectMatch(idx)}>Reject</button>
                            <button on:click={() => skipMatch(idx)}>Skip</button>
                            <button on:mouseover={() => handleHighlight(result.match.id)} on:mouseleave={() => handleHighlight(null)}>Highlight in Tree</button>
                        {:else if result.status === 'ambiguous-dob' || result.status === 'ambiguous-name'}
                            <span style="color:red;">Ambiguous match: {result.candidates.length} candidates</span>
                            <ul>
                                {#each result.candidates as candidate}
                                    <li>
                                        {candidate.fullName || (candidate.given + ' ' + candidate.surname)} (DOB: {candidate.birthDate})
                                        <button on:click={() => confirmMatch(idx, candidate)}>Select</button>
                                        <button on:mouseover={() => handleHighlight(candidate.id)} on:mouseleave={() => handleHighlight(null)}>Highlight in Tree</button>
                                    </li>
                                {/each}
                            </ul>
                            <button on:click={() => rejectMatch(idx)}>Reject All</button>
                            <button on:click={() => skipMatch(idx)}>Skip</button>
                        {:else}
                            <span style="color:gray;">No match found</span>
                            <button on:click={() => skipMatch(idx)}>Skip</button>
                        {/if}
                    {/if}
                </li>
            {/each}
        </ul>
        <p>Coming soon: This step will visually show the family tree and walk you through matching contacts to tree nodes, using name and DOB for auto-matching and confirmation prompts.</p>
        <ul>
            <li>Auto-match on exact name + DOB, ask for confirmation.</li>
            <li>If DOB is unique, suggest match and ask "is this the same person?"</li>
            <li>Show context in the tree, including nicknames and relatives.</li>
            <li>Allow manual matching for ambiguous cases.</li>
        </ul>
        <p style="color:#888;">(This is a placeholder. The next step is to implement the matching logic and tree visualization.)</p>
    </section>
{/if}

<!-- Family Tree Node Component -->
<script context="module" lang="ts">
    export let root;
    export let highlightedIndividualId;
    // Helper to get children for a person
    function getChildren(personId: string) {
        // This is a shadowed helper for the module context
        // The main getChildren is in the main script
        // @ts-ignore
        return __sveltets_1_instanceOf(__sveltets_1_with_any_event(getChildren)) ? getChildren(personId) : [];
    }
    // Helper to get spouses for a person
    function getSpouses(person: any) {
        // This is a shadowed helper for the module context
        // The main getSpouses is in the main script
        // @ts-ignore
        return __sveltets_1_instanceOf(__sveltets_1_with_any_event(getSpouses)) ? getSpouses(person) : [];
    }
</script>

<ul style="list-style:none; padding-left:1em;">
    <li style="margin-bottom:0.5em;">
        <div style="display:flex; align-items:center; gap:0.5em;">
            <span style="padding:2px 6px; border-radius:4px; {root.id === highlightedIndividualId ? 'background:#1976d2;color:white;' : 'background:#f5f5f5;'}; border:1px solid #ccc; min-width:100px; display:inline-block;">
                {root.fullName || (root.given + ' ' + root.surname)}
                {#if root.birthDate} <span style="color:#888; font-size:0.9em;">({root.birthDate})</span>{/if}
            </span>
            {#each getSpouses(root) as spouse}
                <span style="padding:2px 6px; border-radius:4px; background:#fffbe6; border:1px solid #e0c97f; min-width:100px; display:inline-block;">
                    {spouse.fullName || (spouse.given + ' ' + spouse.surname)}
                    {#if spouse.birthDate} <span style="color:#888; font-size:0.9em;">({spouse.birthDate})</span>{/if}
                </span>
            {/each}
        </div>
        {#if getChildren(root.id).length > 0}
            <ul style="list-style:none; padding-left:1.5em;">
                {#each getChildren(root.id) as child}
                    <TreeNode root={child} highlightedIndividualId={highlightedIndividualId} />
                {/each}
            </ul>
        {/if}
    </li>
</ul>
