const fs = require('fs');
const path = require('path');

const srcPath = path.join(process.cwd(), 'src');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    const basename = path.basename(filePath);

    // ── All pages fixes ──
    
    // Remove inline fontFamily (unless it's in AuditLogs explicitly inside Typography)
    if (basename !== 'AuditLogs.js' && basename !== 'theme.js') {
        content = content.replace(/fontFamily:\s*['"][^'"]+['"],?/g, '');
        content = content.replace(/,\s*fontFamily:\s*['"][^'"]+['"]/g, '');
    }

    // Replace color hexes with theme references (safely where possible, or delete if inherited)
    // Actually, it's safer to just remove `color: '#...'` or replace with theme.palette where it makes sense.
    // For now, let's remove arbitrary text colors that should be inherited.
    content = content.replace(/color:\s*['"]#ffffff['"]/gi, "color: 'text.primary'");
    content = content.replace(/color:\s*['"]black['"]/gi, "color: 'primary.contrastText'");
    content = content.replace(/color:\s*['"]white['"]/gi, "color: 'text.primary'");
    
    // Replace p: 2 and p: 4 on Card components to p: 3
    // We already mostly did p: 2 and p: 4 to p: 3 on CardContent and Box.
    // Let's explicitly do `<Card ` to have no padding or default padding.
    // The prompt says: "Cards: p: 3 (24px) — everywhere, no exceptions"
    // Since MuiCard override in theme.js has `padding: theme.spacing(3)`, we can remove explicit `sx={{ p: 3 }}` or replace `p: 2` to `p: 3`.
    content = content.replace(/p:\s*2(?!.)/g, 'p: 3');
    content = content.replace(/p:\s*4(?!.)/g, 'p: 3');

    // Replace pixel borderRadius
    content = content.replace(/borderRadius:\s*['"]?(12px|16px|20px|24px|8px|6|1|2|3|4)['"]?/g, "borderRadius: 2");

    // ── src/pages/Login.js & ResetPassword.js ──
    if (basename === 'Login.js' || basename === 'ResetPassword.js') {
        // Use theme.palette.background.default for container, background.paper for card
        content = content.replace(/background:\s*['"]rgba\(15, 15, 15, 0.75\)['"]/gi, "bgcolor: 'background.paper'");
        content = content.replace(/background:\s*['"]var\(--primary-bg\)['"]/gi, "bgcolor: 'background.default'");
        content = content.replace(/bgcolor:\s*['"]rgba\(15, 15, 15, 0.75\)['"]/gi, "bgcolor: 'background.paper'");
    }

    // ── src/pages/AuditLogs.js ──
    if (basename === 'AuditLogs.js') {
        // Wrap text in Typography with monospace instead of TableCell sx.
        // E.g. `<TableCell sx={{ color: 'text.secondary' }}>{log.id}</TableCell>`
        // Actually, this is too complex for a simple regex, might need manual edit.
    }

    // ── src/components/Sidebar.js ──
    if (basename === 'Sidebar.js' || basename === 'Sidebar.jsx') {
        content = content.replace(/background:\s*`linear-gradient[^`]+`/g, "bgcolor: 'primary.main', color: 'primary.contrastText'");
        content = content.replace(/color:\s*['"]#FFD300['"]/g, "color: 'primary.main'");
        content = content.replace(/color:\s*T\.yellow/g, "color: 'primary.main'");
        content = content.replace(/T\.displayFont/g, "theme.typography.h1.fontFamily");
    }

    // ── src/components/Header.js ──
    if (basename === 'Header.js' || basename === 'Header.jsx') {
        content = content.replace(/background:\s*`linear-gradient[^`]+`/g, "bgcolor: 'primary.main', color: 'primary.contrastText'");
        content = content.replace(/var\(--display-font\)/g, "theme.typography.h1.fontFamily");
    }

    // ── src/pages/SupportTickets.js ──
    if (basename === 'SupportTickets.js') {
        // Just add the import for AppBadge if it's used.
        if (!content.includes('AppBadge')) {
            content = content.replace(/(import React[^;]+;)/, "$1\nimport AppBadge from '../components/AppBadge';");
        }
        // Replace Chip with AppBadge
        content = content.replace(/<Chip\s+([^>]*label=\{ticket.status\}[^>]*)>/g, '<AppBadge type="status" value={ticket.status} />');
        content = content.replace(/<Chip\s+([^>]*label=\{ticket.priority\}[^>]*)>/g, '<AppBadge type="priority" value={ticket.priority} />');
        content = content.replace(/<Chip\s+([^>]*label=\{ticket.category\}[^>]*)>/g, '<AppBadge type="category" value={ticket.category} />');
    }

    // Replace background color overrides
    content = content.replace(/bgcolor:\s*['"]rgba\(15, 15, 15, 0.85\)['"]/gi, "bgcolor: 'background.paper'");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
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
console.log('Done automated replacements.');
