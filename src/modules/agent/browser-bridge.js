import { executeAgentCommand } from './agent-command-api.js';

const CONFIG_URL = import.meta.env.VITE_RETROVISOR_AGENT_URL
  || 'http://127.0.0.1:47831/agent/config';
const HEARTBEAT_MS = 5_000;
const MAX_RECONNECT_MS = 15_000;

function getSessionId() {
  const key = 'retrovisor-agent-session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = globalThis.crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function emitStatus(detail) {
  window.dispatchEvent(new CustomEvent('retrovisor:agent-status', { detail }));
}

export function startAgentBrowserBridge(options = {}) {
  let socket = null;
  let stopped = false;
  let reconnectDelay = 500;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let lastActivityAt = Date.now();
  const configUrl = options.configUrl || CONFIG_URL;
  const sessionId = getSessionId();

  const markActive = () => {
    lastActivityAt = Date.now();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'activity',
        active: true,
        visible: document.visibilityState === 'visible',
      }));
    }
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(MAX_RECONNECT_MS, reconnectDelay * 2);
  };

  const connect = async () => {
    if (stopped) return;
    try {
      emitStatus({ connected: false, connecting: true });
      const response = await fetch(configUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Local companion returned HTTP ${response.status}.`);
      const config = await response.json();
      socket = new WebSocket(config.webSocketUrl);
      socket.addEventListener('open', () => {
        reconnectDelay = 500;
        socket.send(JSON.stringify({
          type: 'hello',
          sessionId,
          title: document.title,
          url: location.href,
          visible: document.visibilityState === 'visible',
          lastActivityAt,
        }));
        heartbeatTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'heartbeat',
              visible: document.visibilityState === 'visible',
            }));
          }
        }, HEARTBEAT_MS);
        emitStatus({ connected: true, connecting: false, sessionId });
      });
      socket.addEventListener('message', async (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type !== 'command' || !message.requestId) return;
        const result = await executeAgentCommand(message.name, message.args || {});
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'command_result', requestId: message.requestId, result }));
        }
      });
      socket.addEventListener('close', () => {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        emitStatus({ connected: false, connecting: false, sessionId });
        scheduleReconnect();
      });
      socket.addEventListener('error', () => socket?.close());
    } catch (error) {
      emitStatus({
        connected: false,
        connecting: false,
        error: error?.message || 'Local companion is unavailable.',
      });
      scheduleReconnect();
    }
  };

  ['pointerdown', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, markActive, { passive: true });
  });
  document.addEventListener('visibilitychange', markActive);
  void connect();

  return () => {
    stopped = true;
    clearTimeout(reconnectTimer);
    clearInterval(heartbeatTimer);
    socket?.close(1000, 'Bridge stopped');
    ['pointerdown', 'keydown'].forEach((eventName) => window.removeEventListener(eventName, markActive));
    document.removeEventListener('visibilitychange', markActive);
  };
}
