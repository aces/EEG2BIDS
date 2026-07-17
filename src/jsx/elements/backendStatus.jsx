import React, {useEffect, useState} from 'react';
import {useSocketStatus} from '../socket.io';

const TONE_COLOR = {
  ok: '#3fae6b',
  warn: '#e0a000',
  error: '#d64545',
};

/**
 * Combine the main-process backend state (from Electron) with the renderer
 * socket state into one of the user-facing states required by the workflow:
 * starting, connected, unavailable, disconnected, reconnecting.
 * @param {string} socketState - connecting|connected|disconnected|
 *   reconnecting|error
 * @param {string} backendState - stopped|external|starting|running|failed
 * @return {object} {key, label, tone, restart}
 */
const resolveStatus = (socketState, backendState) => {
  if (socketState === 'connected') {
    return {key: 'connected', label: 'Backend connected', tone: 'ok'};
  }
  if (backendState === 'failed') {
    return {
      key: 'unavailable', label: 'Backend unavailable',
      tone: 'error', restart: true,
    };
  }
  if (backendState === 'stopped') {
    return {
      key: 'unavailable', label: 'Backend stopped',
      tone: 'error', restart: true,
    };
  }
  if (backendState === 'starting' || socketState === 'connecting') {
    return {key: 'starting', label: 'Backend starting…', tone: 'warn'};
  }
  if (socketState === 'reconnecting') {
    return {key: 'reconnecting', label: 'Reconnecting…', tone: 'warn'};
  }
  // The socket is disconnected or erroring while the main process still
  // considers the backend up (running, or externally managed).
  return {
    key: 'disconnected', label: 'Backend disconnected',
    tone: 'error', restart: backendState !== 'external',
  };
};

/**
 * BackendStatus - a persistent indicator of backend connectivity, with a
 * restart control when the owned backend is down.
 * @return {JSX.Element}
 */
const BackendStatus = () => {
  const socketStatus = useSocketStatus();
  const [backend, setBackend] = useState({state: 'starting', error: null});
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    const api = window.eeg2bids;
    if (!api) {
      return;
    }
    let active = true;
    api.getBackendStatus()
        .then((status) => {
          if (active && status) {
            setBackend(status);
          }
        })
        .catch(() => {});
    api.onBackendStatusChange((status) => {
      if (status) {
        setBackend(status);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const status = resolveStatus(socketStatus, backend.state);

  const handleRestart = async () => {
    if (!window.eeg2bids || !window.eeg2bids.restartBackend) {
      return;
    }
    setRestarting(true);
    try {
      await window.eeg2bids.restartBackend();
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div
      className='backend-status'
      title={backend.error || status.label}
      style={{
        position: 'fixed',
        top: 8,
        right: 12,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 12,
        background: 'rgba(0, 0, 0, 0.55)',
        color: '#fff',
        font: '12px/1.2 sans-serif',
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: TONE_COLOR[status.tone],
          flex: '0 0 auto',
        }}
      />
      <span>{status.label}</span>
      {status.restart && (
        <button
          type='button'
          onClick={handleRestart}
          disabled={restarting}
          style={{
            marginLeft: 4,
            padding: '2px 8px',
            fontSize: 11,
            cursor: restarting ? 'default' : 'pointer',
          }}
        >
          {restarting ? 'Restarting…' : 'Restart backend'}
        </button>
      )}
    </div>
  );
};

export default BackendStatus;
