import fs from 'fs';
import path from 'path';

const replacements = [
  { regex: /\bbg-white\b/g, replacement: 'bg-card' },
  { regex: /\btext-slate-900\b/g, replacement: 'text-ink' },
  { regex: /\btext-slate-800\b/g, replacement: 'text-ink' },
  { regex: /\btext-slate-700\b/g, replacement: 'text-ink-soft' },
  { regex: /\btext-slate-600\b/g, replacement: 'text-ink-soft' },
  { regex: /\btext-slate-500\b/g, replacement: 'text-ink-soft' },
  { regex: /\btext-slate-400\b/g, replacement: 'text-ink-soft\/80' },
  { regex: /\bborder-slate-100\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-200\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-300\b/g, replacement: 'border-border' },
  { regex: /\bbg-slate-50\b/g, replacement: 'bg-bg-soft' },
  { regex: /\bbg-slate-100\b/g, replacement: 'bg-bg-soft' },
  { regex: /\btext-black\b/g, replacement: 'text-ink' },
  { regex: /\bhover:bg-slate-50\b/g, replacement: 'hover:bg-bg-soft' },
  { regex: /\bhover:bg-slate-100\b/g, replacement: 'hover:bg-bg-soft' },
  { regex: /\bhover:text-slate-900\b/g, replacement: 'hover:text-ink' },
  { regex: /\bhover:text-slate-700\b/g, replacement: 'hover:text-ink-soft' },
  { regex: /\btext-gray-900\b/g, replacement: 'text-ink' },
  { regex: /\btext-gray-600\b/g, replacement: 'text-ink-soft' },
  { regex: /\bbg-gray-50\b/g, replacement: 'bg-bg-soft' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'app'));
processDirectory(path.join(__dirname, 'components'));
console.log('Done refactoring colors.');
