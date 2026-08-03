/**
 * Second pass: Clean up remaining gradients that the first pass missed.
 * Focus on gradients used for backgrounds on page containers, progress bars, and buttons.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function collectFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(collectFiles(full));
    else if (/\.(js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const allFiles = [
  ...collectFiles(path.join(SRC, 'pages')),
  ...collectFiles(path.join(SRC, 'components')),
];

let totalChanges = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1. Replace `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
  content = content.replace(
    /`linear-gradient\(135deg,\s*\$\{theme\.palette\.primary\.light\}\s*0%,\s*\$\{theme\.palette\.primary\.main\}\s*100%\)`/g,
    "theme.palette.primary.light"
  );

  // 2. Replace `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
  content = content.replace(
    /`linear-gradient\(135deg,\s*\$\{theme\.palette\.primary\.main\},\s*\$\{theme\.palette\.primary\.dark\}\)`/g,
    "theme.palette.primary.main"
  );

  // 3. Replace `linear-gradient(90deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`
  content = content.replace(
    /`linear-gradient\(90deg,\s*\$\{theme\.palette\.success\.light\}\s*0%,\s*\$\{theme\.palette\.success\.main\}\s*100%\)`/g,
    "theme.palette.success.main"
  );

  // 4. Replace `linear-gradient(135deg, ${alpha(X.main, Y)} 0%, ${alpha(X.dark, Z)} 100%)`
  //    More flexible pattern
  content = content.replace(
    /`linear-gradient\(\d+deg,\s*\$\{alpha\(([^,]+),\s*([\d.]+)\)\}\s*\d+%,\s*\$\{alpha\([^,]+,\s*[\d.]+\)\}\s*\d+%\)`/g,
    (match, palette, opacity) => `alpha(${palette}, ${opacity})`
  );

  // 5. Replace page background gradients
  content = content.replace(
    /`linear-gradient\(135deg,\s*\$\{theme\.palette\.background\.\w+\}\s*0%,\s*\$\{theme\.palette\.background\.\w+\}\s*100%\)`/g,
    "theme.palette.background.default"
  );

  content = content.replace(
    /`linear-gradient\(135deg,\s*\$\{theme\.palette\.grey\[\d+\]\}\s*0%,\s*\$\{theme\.palette\.grey\[\d+\]\}\s*100%\)`/g,
    "theme.palette.background.default"
  );

  // 6. Replace remaining inline `linear-gradient(135deg, ${...primary.main} 0%, ${...primary.dark} 100%)`
  content = content.replace(
    /`linear-gradient\(135deg,\s*\$\{[^}]*primary\.main[^}]*\}\s*0%,\s*\$\{[^}]*primary\.dark[^}]*\}\s*100%\)`/g,
    "theme.palette.primary.main"
  );

  // 7. Remove shimmer-related animations (the 'linear-gradient(90deg, transparent, rgba..., transparent)' 
  //    patterns are for loading effects — keep those but simplify
  // Actually skip these — they are functional loading state indicators

  // 8. Replace any remaining gradient background references for health colors etc.
  content = content.replace(
    /`linear-gradient\(\d+deg,\s*\$\{alpha\(theme\.palette\[([^\]]+)\]\.main,\s*([\d.]+)\)\}\s*0%,\s*\$\{alpha\(theme\.palette\[\1\]\.\w+,\s*[\d.]+\)\}\s*100%\)`/g,
    (match, palette, opacity) => `alpha(theme.palette[${palette}].main, ${opacity})`
  );

  // 9. Replace button fontWeight: 600 with 500 in sx props for buttons
  //    (the theme already sets buttons to 500, but inline sx overrides need fixing)
  content = content.replace(
    /(<Button[^>]*sx=\{\{[^}]*?)fontWeight:\s*600/g,
    '$1fontWeight: 500'
  );

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ ${path.relative(SRC, file)}`);
    totalChanges++;
  }
}

console.log(`\nDone. ${totalChanges} files modified.`);
