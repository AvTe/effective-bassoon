const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');
const oldNextDir = path.join(outDir, '_next');
const newNextDir = path.join(outDir, 'next-assets');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Replace /_next/ with /next-assets/
  let newContent = content.replace(/\/_next\//g, '/next-assets/');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else {
      // Only process common text files
      if (/\.(html|js|css|json|txt|xml)$/.test(file)) {
        replaceInFile(fullPath);
      }
    }
  }
}

async function main() {
  if (!fs.existsSync(outDir)) {
    console.error('out directory not found');
    return;
  }

  // 1. Rename _next to next-assets if it exists
  if (fs.existsSync(oldNextDir)) {
    if (fs.existsSync(newNextDir)) {
      fs.rmSync(newNextDir, { recursive: true, force: true });
    }
    fs.cpSync(oldNextDir, newNextDir, { recursive: true });
    try {
      fs.rmSync(oldNextDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Could not fully delete _next, but copy succeeded.');
    }
    console.log('Copied _next to next-assets');
  }

  // 1.5. Remove any leftover files/directories starting with '_' (except _locales)
  const filesToRemove = fs.readdirSync(outDir);
  for (const file of filesToRemove) {
    if (file.startsWith('_') && file !== '_locales') {
      const fullPath = path.join(outDir, file);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`Deleted reserved file/folder: ${file}`);
    }
  }

  // 2. Process all files in outDir to replace paths
  processDirectory(outDir);
  console.log('Updated paths in all exported files');
  
  // 3. Extract inline scripts for MV3 CSP (merged from extract-inline.js)
  const indexPath = path.join(outDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf-8');
    let inlineScriptCount = 0;
    
    html = html.replace(/<script(?![^>]*src=)(.*?)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
      if (!content.trim()) return match;
      
      inlineScriptCount++;
      const filename = `inline-${inlineScriptCount}.js`;
      const filepath = path.join(outDir, filename);
      
      fs.writeFileSync(filepath, content);
      
      return `<script src="/${filename}"${attrs}></script>`;
    });
    
    fs.writeFileSync(indexPath, html);
    console.log(`Successfully extracted ${inlineScriptCount} inline scripts from index.html`);
  }
}

main();
