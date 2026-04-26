const fs = require('fs');
const path = require('path');

const srcPath = path.join(process.cwd(), 'src');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    const basename = path.basename(filePath);

    if (basename !== 'AppBadge.jsx' && basename !== 'theme.js') {
        // Remove borderRadius definitions completely from sx
        content = content.replace(/borderRadius:\s*[^,}]*,?/g, '');
        // Clean up trailing commas from objects due to above regex
        content = content.replace(/,\s*}/g, ' }');
    }

    // Replace #fff, #ffffff, #FF...
    content = content.replace(/['"]#fff['"]/gi, "'text.primary'");
    content = content.replace(/['"]#ffffff['"]/gi, "'text.primary'");
    content = content.replace(/['"]#ff8080['"]/gi, "'error.light'");
    
    // Replace rgba(255,255,255...
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, "theme.palette.action.hover");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, "theme.palette.action.hover");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.12\)/g, "theme.palette.action.selected");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.5\)/g, "theme.palette.text.secondary");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Cleaned ${filePath}`);
    }
};

const walkSync = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkSync(filePath);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            replaceInFile(filePath);
        }
    }
};

walkSync(srcPath);
console.log('Cleanup complete.');
