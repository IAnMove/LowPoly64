import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const HOST = '127.0.0.1';
const PORT = 41733;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const playwrightArgs = ['test', ...process.argv.slice(2)];

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      resolve({
        code: Number.isInteger(code) ? code : 1,
        signal,
      });
    });
  });
}

const vite = await createServer({
  root: projectRoot,
  logLevel: 'warn',
  server: {
    host: HOST,
    port: PORT,
    strictPort: true,
  },
});

let child = null;
let interrupted = false;

async function shutdown(signal) {
  if (interrupted) return;
  interrupted = true;
  child?.kill(signal);
  await vite.close().catch(() => {});
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await vite.listen();
  child = spawn(process.execPath, [playwrightCli, ...playwrightArgs], {
    cwd: projectRoot,
    env: {
      ...process.env,
      RETROVISOR_E2E_EXTERNAL_SERVER: '1',
    },
    stdio: 'inherit',
    windowsHide: true,
  });
  const result = await waitForExit(child);
  process.exitCode = result.code;
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
} finally {
  await vite.close().catch(() => {});
}
