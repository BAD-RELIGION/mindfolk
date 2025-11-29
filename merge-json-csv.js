import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join('E:\\Tralha\\Stuff\\crypto design\\MY MINDFOLK\\Json and Data', 'Mindfolk-images.csv');
const JSON_PATH = path.join('E:\\Tralha\\Stuff\\crypto design\\MY MINDFOLK\\Json and Data', 'arweave_image_mapping.json');
const OUTPUT_PATH = path.join('E:\\Tralha\\Stuff\\crypto design\\MY MINDFOLK\\mindfolkgallery', 'merged_mindfolk_data.json');

// Read the Arweave mapping JSON
console.log('📖 Reading Arweave image mapping...');
const arweaveMapping = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
console.log(`   Found ${Object.keys(arweaveMapping).length} image mappings`);

// Read the CSV file
console.log('📖 Reading CSV file...');
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const csvLines = csvContent.split('\n').filter(line => line.trim());
console.log(`   Found ${csvLines.length - 1} data rows (excluding header)`);

// Parse CSV
const header = csvLines[0].split(',');
const mintAddressIndex = 0; // Column A
const nameIndex = 1; // Column B

// Helper function to normalize names for matching
function normalizeName(csvName) {
  // Remove leading/trailing whitespace
  let normalized = csvName.trim();
  
  // Handle "Mindfolk Founder #N" -> "Mindfolk_Founder_000N"
  if (normalized.startsWith('Mindfolk Founder #')) {
    const number = normalized.replace('Mindfolk Founder #', '').trim();
    const paddedNumber = number.padStart(4, '0');
    return `Mindfolk_Founder_${paddedNumber}`;
  }
  
  // Handle "Mindfolk Elder #N" -> "Mindfolk_Mushroom_00NN" (Mushroom Heads)
  if (normalized.startsWith('Mindfolk Elder #')) {
    const number = normalized.replace('Mindfolk Elder #', '').trim();
    const paddedNumber = number.padStart(4, '0');
    return `Mindfolk_Mushroom_${paddedNumber}`;
  }
  
  // For other names, just return as-is (will try to match with .png, .gif extensions)
  return normalized;
}

// Build a map of normalized names to possible filenames
const nameToFiles = {};
for (const filename of Object.keys(arweaveMapping)) {
  const baseName = filename.replace(/\.(png|gif)$/i, '');
  if (!nameToFiles[baseName]) {
    nameToFiles[baseName] = [];
  }
  nameToFiles[baseName].push(filename);
}

// Process CSV rows
const result = [];
let matched = 0;
let unmatched = 0;
const unmatchedNames = [];

console.log('\n🔄 Processing CSV rows...');

for (let i = 1; i < csvLines.length; i++) {
  const line = csvLines[i];
  if (!line.trim()) continue;
  
  // Parse CSV line (handle quoted values)
  const columns = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  columns.push(current.trim()); // Add last column
  
  if (columns.length < 2) continue;
  
  const mintAddress = columns[mintAddressIndex].trim();
  const csvName = columns[nameIndex].trim();
  
  if (!mintAddress || !csvName) continue;
  
  // Normalize the name
  const normalizedName = normalizeName(csvName);
  
  // Find matching files in the Arweave mapping
  let matchedUrl = null;
  
  // First, try exact match with normalized name
  if (nameToFiles[normalizedName]) {
    const files = nameToFiles[normalizedName];
    
    // If there are multiple files, prefer .gif
    if (files.length > 1) {
      const gifFile = files.find(f => f.toLowerCase().endsWith('.gif'));
      if (gifFile) {
        matchedUrl = arweaveMapping[gifFile];
      } else {
        // No .gif, use the first one
        matchedUrl = arweaveMapping[files[0]];
      }
    } else {
      matchedUrl = arweaveMapping[files[0]];
    }
  } else {
    // Try with .png extension
    const pngKey = `${normalizedName}.png`;
    if (arweaveMapping[pngKey]) {
      matchedUrl = arweaveMapping[pngKey];
    } else {
      // Try with .gif extension
      const gifKey = `${normalizedName}.gif`;
      if (arweaveMapping[gifKey]) {
        matchedUrl = arweaveMapping[gifKey];
      } else {
        // Try case-insensitive search
        const lowerNormalized = normalizedName.toLowerCase();
        for (const [key, url] of Object.entries(arweaveMapping)) {
          const keyBase = key.replace(/\.(png|gif)$/i, '').toLowerCase();
          if (keyBase === lowerNormalized) {
            matchedUrl = url;
            break;
          }
        }
      }
    }
  }
  
  if (matchedUrl) {
    result.push({
      mintid: mintAddress,
      metadata: matchedUrl
    });
    matched++;
  } else {
    unmatched++;
    unmatchedNames.push(csvName);
    // Still add it with null metadata so we can see what's missing
    result.push({
      mintid: mintAddress,
      metadata: null
    });
  }
  
  if ((i % 1000) === 0) {
    console.log(`   Processed ${i} rows...`);
  }
}

console.log(`\n✅ Processing complete!`);
console.log(`   Matched: ${matched}`);
console.log(`   Unmatched: ${unmatched}`);

if (unmatched > 0) {
  console.log(`\n⚠️  First 20 unmatched names:`);
  unmatchedNames.slice(0, 20).forEach(name => console.log(`   - ${name}`));
}

// Write output in JavaScript object notation format
console.log(`\n💾 Writing output to ${OUTPUT_PATH}...`);

// Custom formatter for JavaScript object notation
function formatAsJSObject(arr) {
  const lines = arr.map(item => {
    const mintid = item.mintid ? `'${item.mintid}'` : 'null';
    const metadata = item.metadata ? `'${item.metadata}'` : 'null';
    return `{ \n    mintid: ${mintid},\n    metadata: ${metadata}\n  }`;
  });
  return '[\n  ' + lines.join(',\n  ') + '\n]';
}

fs.writeFileSync(OUTPUT_PATH, formatAsJSObject(result), 'utf8');
console.log(`✅ Done! Output written to: ${OUTPUT_PATH}`);
console.log(`   Total entries: ${result.length}`);

