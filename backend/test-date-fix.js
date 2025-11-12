// Test the date parsing fix for two-digit years
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
          // Only treat very recent years (00-20) as 2000s
          if (yearNum <= 20) {
            yearNum += 2000; // 00-20 → 2000-2020
          } else {
            yearNum += 1900; // 21-99 → 1921-1999
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

console.log('Testing two-digit year parsing:');
console.log('');

const testDates = [
  '12/13/35',  // Should be 1935, not 2035
  '8/8/55',    // Should be 1955
  '10/10/83',  // Should be 1983
  '2/18/87',   // Should be 1987
  '1/1/05',    // Should be 2005 (recent)
  '12/25/20',  // Should be 2020 (recent)
  '6/15/25',   // Should be 1925 (not 2025)
];

testDates.forEach(dateStr => {
  const parsed = parseFamilyDate(dateStr);
  if (parsed) {
    const year = parsed.getFullYear();
    console.log(`✅ "${dateStr}" → ${parsed.toISOString().split('T')[0]} (Year: ${year})`);
  } else {
    console.log(`❌ "${dateStr}" → Failed to parse`);
  }
});

console.log('');
console.log('Testing Ruth (1935) vs Carey (1955):');
const ruthDate = parseFamilyDate('12/13/35');
const careyDate = parseFamilyDate('8/8/55');

if (ruthDate && careyDate) {
  const ruthYear = ruthDate.getFullYear();
  const careyYear = careyDate.getFullYear();
  console.log(`Ruth: ${ruthYear}, Carey: ${careyYear}`);
  console.log(`Ruth < Carey: ${ruthYear < careyYear} (should be true - Ruth is parent)`);
}

