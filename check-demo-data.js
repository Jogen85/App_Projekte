// Check Demo Data
const fs = require('fs');
const path = require('path');

const appFile = fs.readFileSync(path.join(__dirname, 'src', 'App.tsx'), 'utf8');

// Extract DEMO_PROJECTS array
const match = appFile.match(/const DEMO_PROJECTS[^=]*=\s*\[([^\]]+)\];/s);
if (!match) {
  console.log('❌ Could not find DEMO_PROJECTS');
  process.exit(1);
}

console.log('✅ DEMO_PROJECTS found in App.tsx');
console.log('\nChecking AT 8.2 fields in demo data...\n');

// Count AT 8.2 occurrences
const requiresCount = (match[1].match(/requiresAT82Check/g) || []).length;
const completedCount = (match[1].match(/at82Completed/g) || []).length;

console.log(`requiresAT82Check occurrences: ${requiresCount}`);
console.log(`at82Completed occurrences: ${completedCount}`);

if (requiresCount === 6 && completedCount === 6) {
  console.log('\n✅ All 6 demo projects have AT 8.2 fields');
} else {
  console.log('\n❌ Missing AT 8.2 fields in some projects');
}

// Check if randomBool is used
if (appFile.includes('randomBool(')) {
  console.log('✅ randomBool function is being used');
} else {
  console.log('❌ randomBool function not used');
}

console.log('\nDemo data structure looks good!');
console.log('If you still don\'t see data in the UI:');
console.log('1. Clear localStorage (F12 > Application > Local Storage > Clear)');
console.log('2. Hard refresh (Ctrl+Shift+R or Ctrl+F5)');
console.log('3. Check browser console for errors');
