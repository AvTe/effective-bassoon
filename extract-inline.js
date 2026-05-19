const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const outDir = path.join(__dirname, 'out');
const indexPath = path.join(outDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  let inlineScriptCount = 0;
  
  // Replace inline scripts with external ones
  html = html.replace(/<script(?![^>]*src=)(.*?)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
    if (!content.trim()) return match;
    
    inlineScriptCount++;
    const filename = `inline-${inlineScriptCount}.js`;
    const filepath = path.join(outDir, filename);
    
    fs.writeFileSync(filepath, content);
    console.log(`Extracted ${filename}`);
    
    return `<script src="/${filename}"${attrs}></script>`;
  });
  
  fs.writeFileSync(indexPath, html);
  console.log('Successfully extracted inline scripts from index.html');
} else {
  console.log('index.html not found in out directory');
}
