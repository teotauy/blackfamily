// Test script to check date parsing for Carey and his kids
function parseFamilyDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    let [month, day, year] = parts.map(part => part.trim());
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    let yearNum = parseInt(year, 10);

    if (!isNaN(monthNum) && !isNaN(dayNum)) {
      if (!isNaN(yearNum)) {
        if (year.length === 2) {
          yearNum += yearNum >= 50 ? 1900 : 2000;
        }
        const reconstructed = new Date(yearNum, monthNum - 1, dayNum);
        if (!isNaN(reconstructed.getTime())) {
          return reconstructed;
        }
      }
    }
  }

  return null;
}

// Test various date formats
console.log('Testing date parsing:');
console.log('');

const testDates = [
  '1955',
  '1955-01-01',
  '1955/01/01',
  '01/01/1955',
  '1/1/1955',
  '10/10/83',
  '2/18/87',
  '1983-10-10',
  '1987-02-18'
];

testDates.forEach(dateStr => {
  const parsed = parseFamilyDate(dateStr);
  if (parsed) {
    console.log(`✅ "${dateStr}" -> ${parsed.toISOString()} (${parsed.getFullYear()})`);
  } else {
    console.log(`❌ "${dateStr}" -> Failed to parse`);
  }
});

console.log('');
console.log('Testing comparison:');
const careyDate = parseFamilyDate('1955');
const laciDate = parseFamilyDate('10/10/83');
const tannerDate = parseFamilyDate('2/18/87');

if (careyDate && laciDate) {
  console.log(`Carey (1955) >= Laci (1983): ${careyDate >= laciDate} (should be false)`);
}
if (careyDate && tannerDate) {
  console.log(`Carey (1955) >= Tanner (1987): ${careyDate >= tannerDate} (should be false)`);
}

