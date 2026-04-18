const fs = require('fs');
let content = fs.readFileSync('import-schedules.js', 'utf8');

// Replace the broken Atam Tazian line with correct trailing-space key
content = content.replace(
  "'Mr Atam Tazian ':          'Mr. Atam Tazian',\n  'Mr Atam Tazian':           'Mr. Atam Tazian',",
  "'Mr Atam Tazian ':          'Mr. Atam Tazian',"
);

// Also handle case where only one line exists without trailing space
content = content.replace(
  "'Mr Atam Tazian':           'Mr. Atam Tazian',",
  "'Mr Atam Tazian ':          'Mr. Atam Tazian',"
);

fs.writeFileSync('import-schedules.js', content);
console.log('✓ Fixed. Run: node import-schedules.js "C:\\Users\\Yeghia\\whatsapp-ai-bot\\knowledge\\Schedules"');
