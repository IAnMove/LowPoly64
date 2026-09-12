import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const VERSION = '1.14.0';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.platform === 'win32'
  ? { id: 'windows', asset: `Rhubarb-Lip-Sync-${VERSION}-Windows.zip`, executable: 'rhubarb.exe' }
  : process.platform === 'darwin'
    ? { id: 'macos', asset: `Rhubarb-Lip-Sync-${VERSION}-macOS.zip`, executable: 'rhubarb' }
    : process.platform === 'linux'
      ? { id: 'linux', asset: `Rhubarb-Lip-Sync-${VERSION}-Linux.zip`, executable: 'rhubarb' }
      : null;
if (!platform) throw new Error(`Plataforma no soportada: ${process.platform}`);

const source = `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${VERSION}/${platform.asset}`;
const installRoot = path.join(root, 'tools', 'rhubarb-lip-sync', `v${VERSION}`);
const destination = path.join(installRoot, platform.id);
const manifestPath = path.join(installRoot, 'manifest.json');
const force = process.argv.includes('--force');

async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function safeZipTarget(base, name) {
  const relative = name.replaceAll('\\', '/').replace(/^\/+/, '');
  const target = path.resolve(base, relative);
  const normalizedBase = `${path.resolve(base)}${path.sep}`;
  if (!target.startsWith(normalizedBase)) throw new Error(`Entrada ZIP insegura: ${name}`);
  return target;
}

const expectedExecutablePath = path.join(destination, platform.executable);
if (!force && await exists(manifestPath)) {
  try {
    const existing = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const relative = existing.executableRelative || path.relative(installRoot, expectedExecutablePath);
    const executable = path.resolve(installRoot, relative);
    const installBase = path.resolve(installRoot) + path.sep;
    if (executable.startsWith(installBase) && await exists(executable)) {
      console.log('Rhubarb ' + VERSION + ' ya está instalado en ' + executable);
      process.exit(0);
    }
  } catch {
    // A partial or invalid manifest is repaired by the installer below.
  }
}
console.log(`Descargando ${source}`);
const response = await fetch(source, { headers: { 'User-Agent': 'retrovisor-rhubarb-installer' } });
if (!response.ok) throw new Error(`Descarga fallida (${response.status} ${response.statusText})`);
const archive = Buffer.from(await response.arrayBuffer());
const archiveSha256 = await sha256(archive);
const zip = await JSZip.loadAsync(archive);
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });

let executablePath = null;
let extractedLicense = false;
for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  const target = safeZipTarget(destination, name);
  const data = await entry.async('nodebuffer');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  if (path.basename(target).toLowerCase() === platform.executable.toLowerCase() && !executablePath) executablePath = target;
  if (path.basename(target).toLowerCase() === 'license.md') extractedLicense = true;
}
if (!executablePath) throw new Error(`El ZIP oficial no contiene ${platform.executable}`);
if (process.platform !== 'win32') await fs.chmod(executablePath, 0o755);
const binarySha256 = await sha256(await fs.readFile(executablePath));
const manifest = {
  engine: 'Rhubarb Lip Sync',
  version: VERSION,
  platform: platform.id,
  source,
  license: 'MIT',
  licenseFileExtracted: extractedLicense,
  executableRelative: path.relative(installRoot, executablePath).replaceAll('\\', '/'),
  archiveSha256,
  binarySha256,
  installedAt: new Date().toISOString(),
};
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ...manifest, executable: executablePath }, null, 2));

