const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

console.log('=== Searching for email sender calls ===');
walkDir('C:\\Users\\Triple D\\Desktop\\backend\\src', (filePath) => {
  if (filePath.endsWith('.js')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('sendSubscriptionWelcomeEmail') || content.includes('sendWriterWelcomeEmail')) {
      console.log(`File: ${filePath}`);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('sendSubscriptionWelcomeEmail') || line.includes('sendWriterWelcomeEmail')) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
