const {BrowserWindow} = require('electron');
const {spawn} = require('child_process');
const net = require('net');
const path = require('path');

// Ownership of the Python Socket.IO backend. Electron spawns it through
// uv, captures its output, reports availability to the renderer, and kills
// the whole process group on shutdown so no python process is orphaned.
// If something already listens on the backend port (a manually started
// backend), Electron uses it and owns nothing.

const REPO_ROOT = path.join(__dirname, '../..');
const BACKEND_HOST = '127.0.0.1';
// The backend port is configurable so tests can reserve a free port rather
// than assuming 7301 is available; normal use defaults to 7301. The same
// value is propagated to the spawned Python server and to the renderer.
const BACKEND_PORT = Number(process.env.EEG2BIDS_BACKEND_PORT) || 7301;
const STDERR_TAIL_LINES = 20;
const SIGKILL_TIMEOUT_MS = 3000;
// The backend is only 'running' once the port actually accepts connections,
// not merely when the python child has spawned. Poll until it does. The
// timeout is generous because the first `uv run` may build the environment.
const READINESS_POLL_INTERVAL_MS = 250;
const READINESS_TIMEOUT_MS = 120000;

let child = null;
let stopping = false;
let timedOut = false;
let stderrTail = [];
let status = {state: 'stopped', error: null};

/**
 * Resolve after the given delay.
 * @param {number} ms - milliseconds to wait
 * @return {Promise<void>} resolves when the timer fires
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Record the new backend state and push it to every window.
 * @param {string} state - stopped|external|starting|running|failed
 * @param {?string} error - human-readable failure description
 */
const setStatus = (state, error = null) => {
  status = {state, error};
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('backend:status', status);
  }
};

/**
 * The current backend status.
 * @return {object} state and error
 */
const getStatus = () => status;

/**
 * Whether this process owns a running backend.
 * @return {boolean} true when a child process exists
 */
const isRunning = () => child !== null;

/**
 * The pid of the owned backend process, which (because the child is spawned
 * detached) is also its process-group id. Tests use this to assert the whole
 * group is gone after a clean shutdown, without inspecting unrelated
 * processes.
 * @return {?number} the owned pid, or null when nothing is owned
 */
const getOwnedPid = () => (child ? child.pid : null);

/**
 * Probe whether something already listens on the backend port.
 * @return {Promise<boolean>} true when a connection succeeds
 */
const isPortInUse = () => new Promise((resolve) => {
  const socket = net.connect({host: BACKEND_HOST, port: BACKEND_PORT});
  socket.once('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.once('error', () => resolve(false));
});

/**
 * Forward a child stream to the main-process log line by line, keeping a
 * tail of stderr for failure reporting.
 * @param {stream.Readable} stream - the child's stdout or stderr
 * @param {string} name - 'stdout' or 'stderr'
 */
const logOutput = (stream, name) => {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    for (const line of chunk.split('\n')) {
      if (!line.trim()) {
        continue;
      }
      console.info(`[backend ${name}] ${line}`);
      if (name === 'stderr') {
        stderrTail.push(line);
        if (stderrTail.length > STDERR_TAIL_LINES) {
          stderrTail.shift();
        }
      }
    }
  });
};

/**
 * Wait for the owned backend to actually accept connections, then mark it
 * running. The port opening — not the child merely spawning — is what
 * 'running' means. Give up and terminate the group if the port never opens
 * within the generous startup window; a child that exits or errors first is
 * handled by its own listeners.
 * @param {ChildProcess} owned - the child this wait belongs to
 */
const waitForReady = async (owned) => {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  while (child === owned && !stopping) {
    if (await isPortInUse()) {
      if (child === owned && !stopping) {
        setStatus('running');
      }
      return;
    }
    if (Date.now() >= deadline) {
      timedOut = true;
      const message = `the backend did not open ${BACKEND_HOST}:` +
        `${BACKEND_PORT} within ${READINESS_TIMEOUT_MS / 1000}s of starting.`;
      console.error(`[backend] ${message}`);
      setStatus('failed', message);
      try {
        process.kill(-owned.pid, 'SIGTERM');
      } catch (error) {
        // already gone
      }
      return;
    }
    await delay(READINESS_POLL_INTERVAL_MS);
  }
};

/**
 * Start the backend unless one is already owned or externally running.
 */
const start = async () => {
  if (child) {
    return;
  }
  if (await isPortInUse()) {
    console.info(
        `[backend] ${BACKEND_HOST}:${BACKEND_PORT} is already in use; ` +
        `assuming an externally managed backend`,
    );
    setStatus('external');
    return;
  }
  stderrTail = [];
  stopping = false;
  timedOut = false;
  setStatus('starting');
  child = spawn('uv', ['run', '--frozen', 'python', '-m', 'eeg2bids'], {
    cwd: REPO_ROOT,
    detached: true, // own process group, so stop() reaches python too
    stdio: ['ignore', 'pipe', 'pipe'],
    // The backend watches this pid and exits when it disappears, so it is
    // never orphaned even when Electron dies without running will-quit
    // (e.g. a terminal Ctrl+C killing the whole foreground process group).
    env: {
      ...process.env,
      EEG2BIDS_OWNER_PID: String(process.pid),
      EEG2BIDS_BACKEND_PORT: String(BACKEND_PORT),
    },
  });
  logOutput(child.stdout, 'stdout');
  logOutput(child.stderr, 'stderr');
  child.on('spawn', () => {
    console.info(
        '[backend] python process spawned; waiting for the port to accept ' +
        'connections',
    );
    waitForReady(child);
  });
  child.on('error', (error) => {
    child = null;
    const message = `could not launch the backend through uv: ` +
      `${error.message}. Is uv installed and on PATH?`;
    console.error(`[backend] ${message}`);
    setStatus('failed', message);
  });
  child.on('exit', (code, signal) => {
    child = null;
    if (timedOut) {
      // waitForReady already set a clear 'failed' status and killed the group.
      return;
    }
    if (stopping) {
      setStatus('stopped');
      return;
    }
    const tail = stderrTail.length ?
      ` Last stderr: ${stderrTail.join(' | ')}` : '';
    const message = `the backend exited unexpectedly ` +
      `(code ${code}, signal ${signal}).${tail}`;
    console.error(`[backend] ${message}`);
    setStatus('failed', message);
  });
};

/**
 * Terminate the owned backend process group, escalating to SIGKILL when
 * it ignores SIGTERM.
 * @return {Promise<void>} resolves once the child has exited
 */
const stop = () => new Promise((resolve) => {
  if (!child) {
    resolve();
    return;
  }
  stopping = true;
  const pid = child.pid;
  let killTimer = null;
  child.once('exit', () => {
    clearTimeout(killTimer);
    resolve();
  });
  killTimer = setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (error) {
      // already gone
    }
  }, SIGKILL_TIMEOUT_MS);
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    clearTimeout(killTimer);
    resolve();
  }
});

/**
 * Restart the owned backend: stop the current process (if any) and start a
 * fresh one. Does nothing when the backend is externally managed, since this
 * process does not own it.
 * @return {Promise<object>} {restarted, reason?}
 */
const restart = async () => {
  if (status.state === 'external') {
    console.info(
        '[backend] restart ignored: the backend is externally managed',
    );
    return {restarted: false, reason: 'external'};
  }
  console.info('[backend] restart requested');
  await stop();
  await start();
  return {restarted: true};
};

module.exports = {
  start, stop, restart, getStatus, isRunning, getOwnedPid, BACKEND_PORT,
};
