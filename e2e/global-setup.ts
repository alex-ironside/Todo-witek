import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CONTAINER_NAME = 'todo_e2e_pg';
export const PG_PORT = 5433;
export const API_PORT = 8080;
export const DATABASE_URL = `postgres://postgres:e2e@localhost:${PG_PORT}/todo_e2e?sslmode=disable`;
export const TEST_EMAIL = 'test@example.com';
export const TEST_PASSWORD = 'Test-password-123';

const TMP_DIR = resolve(__dirname, '.tmp');
const STATE_FILE = resolve(TMP_DIR, 'state.json');
const SERVER_DIR = resolve(__dirname, '..', 'server');

interface SetupState {
  servePid: number;
  containerName: string;
}

const runOrThrow = (
  label: string,
  cmd: string,
  args: string[],
  opts: Parameters<typeof spawnSync>[2] = {}
): void => {
  const res = spawnSync(cmd, args, { shell: true, stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    throw new Error(`${label} failed: ${cmd} ${args.join(' ')} (exit ${res.status})`);
  }
};

const waitUntil = async (
  label: string,
  check: () => Promise<boolean> | boolean,
  timeoutMs: number
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timed out waiting for: ${label}`);
};

const stopContainer = (): void => {
  spawnSync('docker', ['rm', '-f', CONTAINER_NAME], { shell: true, stdio: 'inherit' });
};

const killServe = (proc: ChildProcess | null): void => {
  if (!proc || proc.pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { shell: true });
  } else {
    proc.kill('SIGKILL');
  }
};

export default async function globalSetup(): Promise<void> {
  mkdirSync(TMP_DIR, { recursive: true });

  let serveProc: ChildProcess | null = null;

  try {
    stopContainer();
    runOrThrow('start postgres container', 'docker', [
      'run',
      '-d',
      '--rm',
      '--name',
      CONTAINER_NAME,
      '-e',
      'POSTGRES_PASSWORD=e2e',
      '-e',
      'POSTGRES_DB=todo_e2e',
      '-p',
      `${PG_PORT}:5432`,
      'postgres:17-alpine',
    ]);

    await waitUntil(
      'postgres ready',
      () =>
        spawnSync('docker', ['exec', CONTAINER_NAME, 'pg_isready', '-U', 'postgres'], {
          shell: true,
        }).status === 0,
      30000
    );

    const serveEnv = {
      ...process.env,
      DATABASE_URL,
      PORT: String(API_PORT),
      COOKIE_SECURE: 'false',
    };
    serveProc = spawn('go', ['run', './cmd/serve'], {
      cwd: SERVER_DIR,
      env: serveEnv,
      shell: true,
      stdio: 'inherit',
    });

    await waitUntil(
      'go server healthy',
      async () => {
        try {
          const res = await fetch(`http://localhost:${API_PORT}/health`);
          return res.ok;
        } catch {
          return false;
        }
      },
      60000
    );

    runOrThrow('seed test user', 'go', ['run', './cmd/seed-user', '-email', TEST_EMAIL], {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL, SEED_PASSWORD: TEST_PASSWORD },
    });

    const state: SetupState = {
      servePid: serveProc.pid ?? -1,
      containerName: CONTAINER_NAME,
    };
    writeFileSync(STATE_FILE, JSON.stringify(state), 'utf-8');
  } catch (err) {
    killServe(serveProc);
    stopContainer();
    throw err;
  }
}
