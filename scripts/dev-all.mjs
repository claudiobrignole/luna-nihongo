#!/usr/bin/env node
/**
 * Starts dev API + Vite together with clear output.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name, script) {
  const child = spawn(npm, ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

console.log('Starting Luna Nihongo dev stack (Ctrl+C to stop both)…\n');

const api = run('api', 'dev:api');
const vite = run('vite', 'dev:vite');

function shutdown() {
  api.kill('SIGTERM');
  vite.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
