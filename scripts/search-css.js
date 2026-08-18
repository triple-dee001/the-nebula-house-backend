const fs = require('fs');
const css = fs.readFileSync('C:\\Users\\Triple D\\Desktop\\The Nebula House\\css\\styles.css', 'utf8');

const lines = css.split('\n');
console.log('=== CSS matches ===');
lines.forEach((line, idx) => {
  if (line.includes('ql-') || line.includes('editor') || line.includes('quill')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
