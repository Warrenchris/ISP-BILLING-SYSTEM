const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      // Match `<Grid item xs={12} sm={6} md={3}>`
      content = content.replace(/<Grid\s+item\s+xs={(\d+)}(?:\s+sm={(\d+)})?(?:\s+md={(\d+)})?/g, (match, xs, sm, md) => {
        changed = true;
        let sizeObj = "xs: " + xs;
        if (sm) sizeObj += ", sm: " + sm;
        if (md) sizeObj += ", md: " + md;
        return "<Grid size={{ " + sizeObj + " }}";
      });

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDir('./src');
