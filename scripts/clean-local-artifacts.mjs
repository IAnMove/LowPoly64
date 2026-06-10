import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const apply = process.argv.includes('--apply');

const ALLOWED_DIRECTORIES = Object.freeze([
  'artifacts',
  '.tmp-chrome-svg',
  'tmp',
  'dist',
  'playwright-report',
  'test-results',
]);

const ALLOWED_TMP_LOG_PATTERN = /^\.tmp.*\.log$/;

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function ensureInsideRepo(targetPath) {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(repoRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing path outside repository: ${targetPath}`);
  }
  return resolved;
}

function collectStats(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return { files: 0, bytes: 0 };
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return { files: 1, bytes: stat.size };
  }

  let files = 0;
  let bytes = 0;
  const stack = [targetPath];

  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files += 1;
        bytes += fs.statSync(fullPath).size;
      }
    }
  }

  return { files, bytes };
}

function candidatePaths() {
  const candidates = [];

  for (const relativePath of ALLOWED_DIRECTORIES) {
    const fullPath = ensureInsideRepo(path.join(repoRoot, relativePath));
    if (fs.existsSync(fullPath)) {
      candidates.push({ relativePath, fullPath });
    }
  }

  for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !ALLOWED_TMP_LOG_PATTERN.test(entry.name)) continue;
    const fullPath = ensureInsideRepo(path.join(repoRoot, entry.name));
    candidates.push({ relativePath: entry.name, fullPath });
  }

  return candidates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

const candidates = candidatePaths().map((candidate) => ({
  ...candidate,
  ...collectStats(candidate.fullPath),
}));

if (!candidates.length) {
  console.log('No local artifact cleanup candidates found.');
  process.exit(0);
}

console.log(apply ? 'Cleaning local artifacts:' : 'Local artifact cleanup dry-run:');

let totalFiles = 0;
let totalBytes = 0;

for (const candidate of candidates) {
  totalFiles += candidate.files;
  totalBytes += candidate.bytes;
  console.log(`- ${candidate.relativePath}: ${candidate.files} files, ${formatBytes(candidate.bytes)}`);
}

console.log(`Total: ${totalFiles} files, ${formatBytes(totalBytes)}`);

if (!apply) {
  console.log('No files deleted. Re-run with --apply to remove these ignored artifacts.');
  process.exit(0);
}

for (const candidate of candidates) {
  fs.rmSync(candidate.fullPath, { recursive: true, force: true });
}

console.log('Cleanup complete.');
