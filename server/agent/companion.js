import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  bearerToken,
  isAllowedOrigin,
  loadAgentConfig,
  MAX_WS_PAYLOAD_BYTES,
  tokenMatches,
} from './config.js';
import {
  companionErrorBody,
  readJsonBody,
  sendJson,
} from './http-utils.js';
import { EditorSessionRegistry } from './session-registry.js';
import { createRetrovisorMcpServer } from './mcp-server.js';
import { validateToolArguments } from '../../src/modules/agent/tool-validation.js';
import { ApprovalManager } from './approval-manager.js';
import { createAssistantHttpHandler } from './assistant-http.js';

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    vary: 'origin',
  };
}

function rejectUpgrade(socket, status, message) {
  const body = JSON.stringify({ error: message });
  socket.write(
    `HTTP/1.1 ${status} ${status === 401 ? 'Unauthorized' : 'Forbidden'}\r\n`
    + 'Content-Type: application/json\r\n'
    + `Content-Length: ${Buffer.byteLength(body)}\r\n`
    + 'Connection: close\r\n\r\n'
    + body,
  );
  socket.destroy();
}

export function createCompanionServer(overrides = {}) {
  const config = loadAgentConfig(overrides);
  const registry = new EditorSessionRegistry(config);
  const approvals = new ApprovalManager();
  const handleAssistant = createAssistantHttpHandler({ config, registry, approvals });
  const wsServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_WS_PAYLOAD_BYTES,
  });
  let cleanupTimer = null;

  const routeCommand = async (name, rawArgs, sessionId = null) => {
    const args = validateToolArguments(name, rawArgs || {});
    return registry.routeCommand(name, args, sessionId);
  };

  const handleMcp = async (request, response) => {
    if (!tokenMatches(config.token, bearerToken(request))) {
      sendJson(response, 401, { error: 'Unauthorized' });
      return;
    }
    if (request.method !== 'POST') {
      sendJson(response, 405, {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }, { allow: 'POST' });
      return;
    }
    const body = await readJsonBody(request);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const mcpServer = createRetrovisorMcpServer(routeCommand);
    await mcpServer.connect(transport);
    response.on('close', () => {
      void transport.close();
      void mcpServer.close();
    });
    await transport.handleRequest(request, response, body);
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${config.host}`);
    try {
      if (request.method === 'OPTIONS' && isAllowedOrigin(config, request.headers.origin)) {
        response.writeHead(204, {
          ...corsHeaders(request.headers.origin),
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-max-age': '600',
        });
        response.end();
        return;
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, {
          ok: true,
          service: 'retrovisor-agent-companion',
          connectedEditors: registry.sessions.size,
          providers: {
            openai: Boolean(process.env.OPENAI_API_KEY),
            xai: Boolean(process.env.XAI_API_KEY),
          },
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/agent/config') {
        const origin = request.headers.origin;
        if (!isAllowedOrigin(config, origin)) {
          sendJson(response, 403, { error: 'Origin is not allowed.' });
          return;
        }
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : config.port;
        sendJson(response, 200, {
          webSocketUrl: `ws://${config.host}:${port}/agent/browser?token=${encodeURIComponent(config.token)}`,
          assistantUrl: `http://${config.host}:${port}/assistant`,
        }, corsHeaders(origin));
        return;
      }

      if (url.pathname === '/mcp') {
        await handleMcp(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/agent/command') {
        if (!tokenMatches(config.token, bearerToken(request))) {
          sendJson(response, 401, { error: { code: 'UNAUTHORIZED', message: 'Invalid local companion token.' } });
          return;
        }
        const body = await readJsonBody(request);
        const result = await routeCommand(body.name, body.args || {}, body.sessionId || null);
        sendJson(response, 200, result);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/agent/sessions') {
        if (!tokenMatches(config.token, bearerToken(request))) {
          sendJson(response, 401, { error: { code: 'UNAUTHORIZED', message: 'Invalid local companion token.' } });
          return;
        }
        sendJson(response, 200, { sessions: registry.listPublic() });
        return;
      }

      if (url.pathname.startsWith('/assistant/')) {
        const handled = await handleAssistant(request, response, url);
        if (handled) return;
      }

      sendJson(response, 404, { error: 'Not found.' });
    } catch (error) {
      const status = error?.code === 'PAYLOAD_TOO_LARGE' ? 413
        : error instanceof SyntaxError ? 400
          : error?.code === 'VALIDATION_ERROR' || error?.code === 'UNKNOWN_COMMAND' ? 400
            : 503;
      sendJson(response, status, companionErrorBody(error));
    }
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${config.host}`);
    if (url.pathname !== '/agent/browser') {
      rejectUpgrade(socket, 403, 'Unknown WebSocket endpoint.');
      return;
    }
    if (!isAllowedOrigin(config, request.headers.origin)) {
      rejectUpgrade(socket, 403, 'Origin is not allowed.');
      return;
    }
    if (!tokenMatches(config.token, url.searchParams.get('token'))) {
      rejectUpgrade(socket, 401, 'Invalid local companion token.');
      return;
    }
    wsServer.handleUpgrade(request, socket, head, (webSocket) => {
      wsServer.emit('connection', webSocket, request);
    });
  });

  wsServer.on('connection', (socket) => {
    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        socket.close(1003, 'Invalid JSON');
        return;
      }
      if (message.type === 'hello') {
        const session = registry.register(socket, message);
        socket.sessionId = session.id;
        socket.send(JSON.stringify({ type: 'hello_ack', sessionId: session.id }));
        return;
      }
      if (!socket.sessionId) {
        socket.close(1008, 'hello required');
        return;
      }
      if (message.type === 'heartbeat' || message.type === 'activity') {
        registry.touch(socket.sessionId, message);
      } else if (message.type === 'command_result') {
        registry.touch(socket.sessionId);
        registry.resolveResponse(socket.sessionId, message);
      }
    });
    socket.on('close', () => {
      if (socket.sessionId) registry.unregister(socket.sessionId);
    });
  });

  return {
    config,
    registry,
    approvals,
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(config.port, config.host, () => {
          server.off('error', reject);
          resolve();
        });
      });
      cleanupTimer = setInterval(() => registry.removeStale(), 5_000);
      cleanupTimer.unref?.();
      return server.address();
    },
    async close() {
      clearInterval(cleanupTimer);
      for (const session of registry.sessions.values()) session.socket.terminate();
      await new Promise((resolve) => wsServer.close(() => resolve()));
      if (server.listening) {
        const closed = new Promise((resolve) => server.close(() => resolve()));
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
        await closed;
      }
    },
  };
}

async function main() {
  const companion = createCompanionServer();
  const address = await companion.listen();
  const port = typeof address === 'object' && address ? address.port : companion.config.port;
  process.stderr.write(`[retrovisor-agent] listening on http://${companion.config.host}:${port}\n`);
  process.stderr.write('[retrovisor-agent] provider keys remain server-side; command payloads are not logged\n');
  const stop = async () => {
    await companion.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`[retrovisor-agent] ${error?.message || error}\n`);
    process.exitCode = 1;
  });
}
