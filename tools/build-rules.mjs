// Builds firestore.rules from firestore.rules.template and the private organiser list.
// Usage (from repo/): node tools/build-rules.mjs [path-to-organisers.txt]
// The list file is "email,name" per line; lines starting with # are ignored. Never commit it.
import { readFileSync, writeFileSync } from 'node:fs';

const listPath = process.argv[2] || 'handoff/private/organisers.txt';
const emails = readFileSync(listPath, 'utf8').split(/\r?\n/)
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(l => l.split(',')[0].trim().toLowerCase())
  .filter(e => /^[^@\s"']+@[^@\s"']+\.[a-z]{2,}$/.test(e));
if (!emails.length) throw new Error('No organiser emails found in ' + listPath);

const tpl = readFileSync('firestore.rules.template', 'utf8');
if (tpl.split('__OWNERS__').length !== 2) throw new Error('Template must contain __OWNERS__ exactly once');
writeFileSync('firestore.rules', tpl.replace('__OWNERS__', emails.map(e => `'${e}'`).join(', ')));
console.log(`firestore.rules written with ${emails.length} organiser(s).`);
