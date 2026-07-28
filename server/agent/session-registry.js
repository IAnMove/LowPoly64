import crypto from 'node:crypto';

export class CompanionError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'CompanionError';
    this.code = code;
    this.details = details;
  }
}

export class EditorSessionRegistry {
  constructor(options = {}) {
    this.sessions = new Map();
    this.pending = new Map();
    this.commandTimeoutMs = options.commandTimeoutMs || 15_000;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs || 30_000;
  }

  register(socket, hello = {}) {
    const sessionId = String(hello.sessionId || crypto.randomUUID()).slice(0, 120);
    const existing = this.sessions.get(sessionId);
    if (existing && existing.socket !== socket) existing.socket.close(4001, 'Session replaced');
    const now = Date.now();
    const session = {
      id: sessionId,
      socket,
      title: String(hello.title || 'Retrovisor').slice(0, 160),
      url: String(hello.url || '').slice(0, 500),
      visible: hello.visible !== false,
      connectedAt: now,
      lastSeenAt: now,
      lastActivityAt: Number(hello.lastActivityAt) || now,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  touch(sessionId, message = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastSeenAt = Date.now();
    if (typeof message.visible === 'boolean') session.visible = message.visible;
    if (message.active) session.lastActivityAt = Date.now();
  }

  unregister(sessionId, reason = 'Editor disconnected') {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    for (const [requestId, pending] of this.pending) {
      if (pending.sessionId !== sessionId) continue;
      clearTimeout(pending.timer);
      pending.reject(new CompanionError('EDITOR_DISCONNECTED', reason, { sessionId }));
      this.pending.delete(requestId);
    }
  }

  removeStale(now = Date.now()) {
    for (const session of this.sessions.values()) {
      if (now - session.lastSeenAt > this.heartbeatTimeoutMs) {
        session.socket.close(4000, 'Heartbeat timeout');
        this.unregister(session.id, 'Editor heartbeat timed out');
      }
    }
  }

  listPublic() {
    return [...this.sessions.values()].map((session) => ({
      id: session.id,
      title: session.title,
      visible: session.visible,
      connectedAt: session.connectedAt,
      lastActivityAt: session.lastActivityAt,
    }));
  }

  select(sessionId = null) {
    if (sessionId) {
      const selected = this.sessions.get(sessionId);
      if (!selected) {
        throw new CompanionError('EDITOR_SESSION_NOT_FOUND', 'The requested Retrovisor session is not connected.', { sessionId });
      }
      return selected;
    }
    const connected = [...this.sessions.values()]
      .filter((session) => session.socket.readyState === 1)
      .sort((a, b) => Number(b.visible) - Number(a.visible) || b.lastActivityAt - a.lastActivityAt);
    if (!connected.length) {
      throw new CompanionError('NO_ACTIVE_EDITOR', 'No active Retrovisor tab is connected to the local companion.');
    }
    return connected[0];
  }

  routeCommand(name, args, sessionId = null) {
    const session = this.select(sessionId);
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new CompanionError(
          'EDITOR_TIMEOUT',
          `Retrovisor did not answer ${name} within ${this.commandTimeoutMs} ms.`,
          { sessionId: session.id },
        ));
      }, this.commandTimeoutMs);
      this.pending.set(requestId, { sessionId: session.id, resolve, reject, timer });
      try {
        session.socket.send(JSON.stringify({ type: 'command', requestId, name, args }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(new CompanionError('EDITOR_DISCONNECTED', error.message, { sessionId: session.id }));
      }
    });
  }

  resolveResponse(sessionId, message) {
    const pending = this.pending.get(message.requestId);
    if (!pending || pending.sessionId !== sessionId) return false;
    clearTimeout(pending.timer);
    this.pending.delete(message.requestId);
    pending.resolve(message.result);
    return true;
  }
}
