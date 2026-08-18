const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'C:\\Users\\Triple D\\Desktop\\The Nebula House\\post';
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));

console.log('=== Finding all image tags in static HTML files ===');
for (const file of files) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const imgMatches = content.match(/<img[^>]+>/g) || [];
  const otherImages = imgMatches.filter(img => !img.includes('room-icon.png'));
  if (otherImages.length > 0) {
    console.log(`File: ${file}`);
    console.log('Other Images:', otherImages);
    console.log('---');
  }
}
