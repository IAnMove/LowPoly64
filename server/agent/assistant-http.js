import { getProviderStatus } from './provider-client.js';
import { runAssistantTurn } from './assistant-runner.js';
import { companionErrorBody, readJsonBody, sendJson } from './http-utils.js';
import { isAllowedOrigin } from './config.js';

function assistantCors(origin) {
  return {
    'access-control-allow-origin': origin,
    vary: 'origin',
  };
}

function writeEvent(response, event) {
  response.write(`${JSON.stringify(event)}\n`);
}

export function createAssistantHttpHandler({ config, registry, approvals }) {
  return async function handleAssistant(request, response, url) {
    const origin = request.headers.origin;
    if (!isAllowedOrigin(config, origin)) {
      sendJson(response, 403, { error: 'Origin is not allowed.' });
      return true;
    }

    if (request.method === 'GET' && url.pathname === '/assistant/status') {
      sendJson(response, 200, {
        ok: true,
        connectedEditors: registry.sessions.size,
        providers: getProviderStatus(),
        instructions: 'Set OPENAI_API_KEY and/or XAI_API_KEY in the companion environment, then restart it.',
      }, assistantCors(origin));
      return true;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/assistant/approvals/')) {
      const id = decodeURIComponent(url.pathname.slice('/assistant/approvals/'.length));
      try {
        const body = await readJsonBody(request, 10_000);
        const result = approvals.resolve(id, body.approved === true);
        sendJson(response, 200, { ok: true, ...result }, assistantCors(origin));
      } catch (error) {
        sendJson(response, 404, companionErrorBody(error), assistantCors(origin));
      }
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/assistant/chat') {
      const body = await readJsonBody(request);
      const abortController = new AbortController();
      request.once('aborted', () => abortController.abort());
      response.writeHead(200, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
        connection: 'keep-alive',
        ...assistantCors(origin),
      });
      try {
        const events = runAssistantTurn({
          provider: body.provider || 'openai',
          model: body.model || null,
          messages: body.messages,
          approvals,
          signal: abortController.signal,
          callCommand: (name, args) => registry.routeCommand(name, args, body.sessionId || null),
        });
        for await (const event of events) writeEvent(response, event);
      } catch (error) {
        writeEvent(response, { type: 'error', ...companionErrorBody(error).error });
      } finally {
        response.end();
      }
      return true;
    }
    return false;
  };
}
