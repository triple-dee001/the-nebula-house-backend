const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'C:\\Users\\Triple D\\Desktop\\The Nebula House\\post';
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));

console.log('=== Checking body images in static HTML files ===');
for (const file of files) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const bodyMatch = content.match(/<div class="article-body[^"]*">([\s\S]*?)<\/div>\s*<div class="article-tags/);
  if (bodyMatch) {
    const body = bodyMatch[1];
    const imgMatches = body.match(/<img[^>]+>/g);
    if (imgMatches) {
      console.log(`File: ${file}`);
      console.log('Images:', imgMatches);
      console.log('---');
    }
  }
}
