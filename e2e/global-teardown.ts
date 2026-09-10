import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTAINER_NAME } from './global-setup';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = resolve(__dirname, '.tmp', 'state.json');

interface SetupState {
  servePid: number;
  containerName: string;
}

const killServe = (pid: number): void => {
  if (!Number.isFinite(pid) || pid <= 0) return;
  console.log(`[e2e teardown] killing go serve process tree pid=${pid}`);
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { shell: true, stdio: 'inherit' });
  } else {
    spawnSync('kill', ['-9', String(pid)], { stdio: 'inherit' });
  }
};

const stopContainer = (name: string): void => {
  console.log(`[e2e teardown] removing container ${name}`);
  spawnSync('docker', ['rm', '-f', name], { shell: true, stdio: 'inherit' });
};

export default async function globalTeardown(): Promise<void> {
  let state: SetupState | null = null;
  if (existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as SetupState;
    } catch (err) {
      console.warn('[e2e teardown] could not read state file', err);
    }
  }

  killServe(state?.servePid ?? -1);
  stopContainer(state?.containerName ?? CONTAINER_NAME);
}
