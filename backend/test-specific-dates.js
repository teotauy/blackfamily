// Test the specific dates from the error
function parseFamilyDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  // Handle year-only format (e.g., "1955")
  const yearOnly = /^\d{4}$/.test(trimmed);
  if (yearOnly) {
    const year = parseInt(trimmed, 10);
    if (!isNaN(year) && year >= 1000 && year <= 9999) {
      return new Date(year, 0, 1);
    }
  }

  // Try parsing MM/DD/YY or MM/DD/YYYY format first (before direct Date parsing)
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    let [month, day, year] = parts.map(part => part.trim());
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    let yearNum = parseInt(year, 10);

    if (!isNaN(monthNum) && !isNaN(dayNum) && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      if (!isNaN(yearNum)) {
        if (year.length === 2) {
          // For family tree data, assume two-digit years are from 1900s
          // Treat recent years (00-30) as 2000s to handle recent births
          // This handles cases like "21" → 2021, "35" → 1935
          if (yearNum <= 30) {
            yearNum += 2000; // 00-30 → 2000-2030
          } else {
            yearNum += 1900; // 31-99 → 1931-1999
          }
        }
        const reconstructed = new Date(yearNum, monthNum - 1, dayNum);
        if (!isNaN(reconstructed.getTime())) {
          return reconstructed;
        }
      }
    }
  }

  // Fall back to direct Date parsing for other formats
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  return null;
}

console.log('Testing the specific dates from the error:');
console.log('');

const colbyDate = parseFamilyDate('3/19/76');
const lylaDate = parseFamilyDate('9/1/21');

if (colbyDate) {
  console.log(`Colby: 3/19/76 → ${colbyDate.toISOString().split('T')[0]} (Year: ${colbyDate.getFullYear()})`);
} else {
  console.log('❌ Colby date failed to parse');
}

if (lylaDate) {
  console.log(`Lyla: 9/1/21 → ${lylaDate.toISOString().split('T')[0]} (Year: ${lylaDate.getFullYear()})`);
} else {
  console.log('❌ Lyla date failed to parse');
}

if (colbyDate && lylaDate) {
  const colbyYear = colbyDate.getFullYear();
  const lylaYear = lylaDate.getFullYear();
  console.log('');
  console.log(`Colby year: ${colbyYear}, Lyla year: ${lylaYear}`);
  console.log(`Colby < Lyla: ${colbyYear < lylaYear} (should be true)`);
  console.log(`Colby >= Lyla: ${colbyYear >= lylaYear} (should be false)`);
  
  if (colbyYear >= lylaYear) {
    console.log('❌ ERROR: Validation would fail!');
  } else {
    console.log('✅ Validation would pass!');
  }
}

