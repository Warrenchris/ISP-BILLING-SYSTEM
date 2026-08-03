/**
 * Batch visual cleanup for the ISP Billing System redesign.
 * This script performs safe, regex-based text replacements across all page files
 * to align with the new enterprise design system.
 *
 * Only changes visual properties — never touches business logic.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const PAGES = path.join(SRC, 'pages');
const COMPS = path.join(SRC, 'components');

// Collect all .js and .jsx files from pages and components directories
function collectFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectFiles(full));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = [
  ...collectFiles(PAGES),
  ...collectFiles(path.join(COMPS, 'dashboard')),
  ...collectFiles(path.join(COMPS, 'payments')),
  ...collectFiles(path.join(COMPS, 'users')),
  ...collectFiles(path.join(COMPS, 'ai')),
];

let totalChanges = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1. Replace fontWeight: 800 with 600 (only in sx props, not CSS class strings)
  content = content.replace(/fontWeight:\s*800/g, 'fontWeight: 600');

  // 2. Replace fontWeight: 700 with 500 in table cells and body text
  //    Keep 600 for headings (h1-h6, variant="h*", DialogTitle)
  //    For TableCell, Chip, inline fontWeight: replace 700 -> 500
  content = content.replace(
    /(<TableCell[^>]*sx=\{\{[^}]*?)fontWeight:\s*700/g,
    '$1fontWeight: 500'
  );

  // 3. Replace gradient text effects (WebkitBackgroundClip text) with solid color
  content = content.replace(
    /background:\s*`linear-gradient\([^`]*\)`,\s*WebkitBackgroundClip:\s*'text',\s*WebkitTextFillColor:\s*'transparent',?/g,
    "color: 'text.primary',"
  );

  // 4. Replace standalone linear-gradient backgrounds on buttons/chips with solid colors
  //    Pattern: background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
  content = content.replace(
    /background:\s*`linear-gradient\(135deg,\s*\$\{theme\.palette\.primary\.main\}\s*0%,\s*\$\{theme\.palette\.primary\.(dark|light)\}\s*100%\)`/g,
    "background: theme.palette.primary.main"
  );

  // 5. Replace gradient backgrounds with alpha (stat card icon backgrounds)
  //    Pattern: background: `linear-gradient(135deg, ${alpha(theme.palette.X.main, 0.1)} 0%, ${alpha(theme.palette.X.dark, 0.1)} 100%)`
  content = content.replace(
    /background:\s*`linear-gradient\(135deg,\s*\$\{alpha\(theme\.palette\.(\w+)\.main,\s*([\d.]+)\)\}\s*0%,\s*\$\{alpha\(theme\.palette\.\1\.(dark|light),\s*([\d.]+)\)\}\s*100%\)`/g,
    (match, palette, opacity) => `background: alpha(theme.palette.${palette}.main, ${opacity})`
  );

  // 6. Replace remaining gradient backgrounds on page-level containers
  content = content.replace(
    /background:\s*`linear-gradient\(135deg,\s*\$\{theme\.palette\.background\.default\}\s*0%,\s*\$\{theme\.palette\.background\.paper\}\s*100%\)`/g,
    "background: theme.palette.background.default"
  );
  content = content.replace(
    /background:\s*`linear-gradient\(135deg,\s*\$\{theme\.palette\.grey\[50\]\}\s*0%,\s*\$\{theme\.palette\.grey\[200\]\}\s*100%\)`/g,
    "background: theme.palette.background.default"
  );

  // 7. Replace shimmer gradient overlays (keep these as they're loading states)
  // -- skip these, they serve a functional purpose

  // 8. Replace boxShadow with glow effects
  content = content.replace(
    /boxShadow:\s*`0\s+\d+px\s+\d+px\s+-?\d*px\s+rgba\(221,\s*161,\s*94,\s*[\d.]+\)`/g,
    "boxShadow: 'none'"
  );
  content = content.replace(
    /boxShadow:\s*'0\s+\d+px\s+\d+px\s+rgba\(221,\s*161,\s*94,\s*[\d.]+\)'/g,
    "boxShadow: 'none'"
  );
  content = content.replace(
    /boxShadow:\s*`0 0 6px rgba\(239,68,68,0\.3\)`/g,
    "boxShadow: 'none'"
  );

  // 9. Remove transform: 'translateY(-2px)' hover effects
  content = content.replace(/transform:\s*'translateY\(-2px\)',?\s*/g, '');

  // 10. Remove transform: 'scale(1.05)' hover effects
  content = content.replace(/transform:\s*'scale\(1\.05\)',?\s*/g, '');

  // 11. Replace old border colors
  content = content.replace(/rgba\(43,\s*43,\s*43,\s*0\.08\)/g, 'rgba(28, 25, 23, 0.06)');
  content = content.replace(/rgba\(43,\s*43,\s*43,\s*0\.06\)/g, 'rgba(28, 25, 23, 0.06)');
  content = content.replace(/rgba\(43,\s*43,\s*43,\s*0\.04\)/g, 'rgba(28, 25, 23, 0.04)');
  content = content.replace(/rgba\(43,\s*43,\s*43,\s*0\.02\)/g, 'rgba(28, 25, 23, 0.02)');
  content = content.replace(/rgba\(43,\s*43,\s*43,\s*0\.1\)/g, 'rgba(28, 25, 23, 0.08)');
  content = content.replace(/rgba\(43,\s*43,\s*43,\s*0\.15\)/g, 'rgba(28, 25, 23, 0.12)');

  // 12. Replace old text colors in sx props (hardcoded)
  content = content.replace(/'#2B2B2B'/g, "'#1C1917'");
  content = content.replace(/"#2B2B2B"/g, '"#1C1917"');
  content = content.replace(/'#5C5852'/g, "'#78716C'");
  content = content.replace(/"#5C5852"/g, '"#78716C"');
  content = content.replace(/'#8E877E'/g, "'#A8A29E'");
  content = content.replace(/"#8E877E"/g, '"#A8A29E"');

  // 13. Replace old background color
  content = content.replace(/'#FAF7F2'/g, "'#F5F5F4'");
  content = content.replace(/"#FAF7F2"/g, '"#F5F5F4"');

  // 14. Replace old error color
  content = content.replace(/'#EF4444'/g, "'#DC2626'");
  content = content.replace(/"#EF4444"/g, '"#DC2626"');

  // 15. Update transition durations: 0.3s -> 0.15s for subtle motion
  content = content.replace(/transition:\s*'all 0\.3s/g, "transition: 'all 0.15s");
  content = content.replace(/transition:\s*`all 0\.3s/g, "transition: `all 0.15s");

  // 16. Replace remaining fontWeight: 700 in non-heading contexts to 600
  //     (headings already get 600 from theme, so 700 in other places becomes 500)
  //     Be selective: DialogTitle, variant="h*" should keep 600
  //     Other places (Chip fontWeight, inline text fontWeight) -> 500
  content = content.replace(
    /(<Chip[^>]*?)fontWeight:\s*700/g,
    '$1fontWeight: 500'
  );

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    const changes = original.split('\n').filter((line, i) => line !== content.split('\n')[i]).length;
    console.log(`✓ ${path.relative(SRC, file)} — ${changes} lines changed`);
    totalChanges++;
  }
}

console.log(`\nDone. ${totalChanges} files modified.`);
