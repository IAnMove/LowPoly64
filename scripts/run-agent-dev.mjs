import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configuredToken = process.env.RETROVISOR_AGENT_TOKEN;
if (configuredToken && configuredToken.length < 20) {
  process.stderr.write(
    '[retrovisor-agent] RETROVISOR_AGENT_TOKEN must contain at least 20 characters.\n',
  );
  process.exit(1);
}
const token = configuredToken || crypto.randomBytes(32).toString('base64url');
if (!configuredToken) {
  process.stderr.write(
    '[retrovisor-agent] using a generated in-memory token; set RETROVISOR_AGENT_TOKEN before launch to connect an external MCP client\n',
  );
}

const environment = {
  ...process.env,
  RETROVISOR_AGENT_TOKEN: token,
  RETROVISOR_AGENT_HOST: process.env.RETROVISOR_AGENT_HOST || '127.0.0.1',
  RETROVISOR_AGENT_PORT: process.env.RETROVISOR_AGENT_PORT || '47831',
  RETROVISOR_AGENT_ALLOWED_ORIGINS: process.env.RETROVISOR_AGENT_ALLOWED_ORIGINS
    || 'http://127.0.0.1:5173,http://localhost:5173',
};
const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const companionEntry = path.join(root, 'server', 'agent', 'companion.js');
const children = [
  spawn(process.execPath, [companionEntry], { cwd: root, env: environment, stdio: 'inherit' }),
  spawn(process.execPath, [viteEntry, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
  }),
];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.killed) child.kill('SIGTERM');
  });
  process.exitCode = exitCode;
}

children.forEach((child) => {
  child.once('exit', (code, signal) => {
    if (!stopping) {
      process.stderr.write(`[retrovisor-agent] child exited (${signal || code}); stopping local stack\n`);
      stop(code || 1);
    }
  });
  child.once('error', (error) => {
    process.stderr.write(`[retrovisor-agent] ${error.message}\n`);
    stop(1);
  });
});
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
