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
const BACKEND_PORT = 7301;
const STDERR_TAIL_LINES = 20;
const SIGKILL_TIMEOUT_MS = 3000;

let child = null;
let stopping = false;
let stderrTail = [];
let status = {state: 'stopped', error: null};

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
  setStatus('starting');
  child = spawn('uv', ['run', '--frozen', 'python', '-m', 'eeg2bids'], {
    cwd: REPO_ROOT,
    detached: true, // own process group, so stop() reaches python too
    stdio: ['ignore', 'pipe', 'pipe'],
    // The backend watches this pid and exits when it disappears, so it is
    // never orphaned even when Electron dies without running will-quit
    // (e.g. a terminal Ctrl+C killing the whole foreground process group).
    env: {...process.env, EEG2BIDS_OWNER_PID: String(process.pid)},
  });
  logOutput(child.stdout, 'stdout');
  logOutput(child.stderr, 'stderr');
  child.on('spawn', () => setStatus('running'));
  child.on('error', (error) => {
    child = null;
    const message = `could not launch the backend through uv: ` +
      `${error.message}. Is uv installed and on PATH?`;
    console.error(`[backend] ${message}`);
    setStatus('failed', message);
  });
  child.on('exit', (code, signal) => {
    child = null;
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

module.exports = {start, stop, getStatus, isRunning};
