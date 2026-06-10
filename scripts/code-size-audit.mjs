import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const THRESHOLDS = Object.freeze({
  warning: 1000,
  high: 1500,
  critical: 2000,
});

const SKIP_DIRS = new Set([
  '.git',
  '.tmp-chrome-svg',
  'artifacts',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
  'tmp',
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isGeneratedPath(relativePath) {
  const normalized = toPosix(relativePath).toLowerCase();
  return normalized.includes('/generated/') || /(^|\/)generated[-_]/.test(normalized);
}

function walkSourceFiles(root) {
  const files = [];
  const stack = [root];

  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!/\.(m?js|cjs)$/i.test(entry.name)) continue;

      const relativePath = path.relative(repoRoot, fullPath);
      if (isGeneratedPath(relativePath)) continue;
      files.push(relativePath);
    }
  }

  return files.sort();
}

function countLines(file) {
  const content = fs.readFileSync(path.join(repoRoot, file), 'utf8');
  if (!content.length) return 0;
  return content.split(/\r\n|\r|\n/).length;
}

function classify(lines) {
  if (lines >= THRESHOLDS.critical) return 'critical';
  if (lines >= THRESHOLDS.high) return 'high';
  if (lines >= THRESHOLDS.warning) return 'warning';
  return 'ok';
}

const rows = walkSourceFiles(repoRoot)
  .map((file) => ({ file: toPosix(file), lines: countLines(file) }))
  .map((row) => ({ ...row, level: classify(row.lines) }))
  .filter((row) => row.level !== 'ok')
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));

console.log('Code size audit');
console.log(`Thresholds: warning >= ${THRESHOLDS.warning}, high >= ${THRESHOLDS.high}, critical >= ${THRESHOLDS.critical}`);

if (!rows.length) {
  console.log('No oversized JS/MJS files found.');
  process.exit(0);
}

for (const row of rows) {
  const label = row.level.toUpperCase().padEnd(8, ' ');
  console.log(`${label} ${String(row.lines).padStart(5, ' ')} ${row.file}`);
}

const criticalCount = rows.filter((row) => row.level === 'critical').length;
const highCount = rows.filter((row) => row.level === 'high').length;
const warningCount = rows.filter((row) => row.level === 'warning').length;

console.log('');
console.log(`Summary: ${criticalCount} critical, ${highCount} high, ${warningCount} warning.`);
console.log('Audit is informational and does not fail the command.');
