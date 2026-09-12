
import { getProviderStatus, probeProvider } from './provider-client.js';
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
  response.write(JSON.stringify(event) + '\n');
}

function boundedProbeInput(body) {
  const provider = typeof body?.provider === 'string' ? body.provider.trim() : '';
  const model = typeof body?.model === 'string' ? body.model.trim().slice(0, 300) : null;
  const checks = Array.isArray(body?.checks)
    ? body.checks.filter((check) => typeof check === 'string').slice(0, 10)
    : undefined;
  const timeoutMs = Number(body?.timeoutMs);
  return {
    provider: provider || 'openai',
    model: model || null,
    checks,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
  };
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
        instructions: 'Set OPENAI_API_KEY and/or XAI_API_KEY in the companion environment. Local Ollama defaults to 127.0.0.1:11434 and LM Studio to 127.0.0.1:1234/v1; run Comprobar before using a local model.',
      }, assistantCors(origin));
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/assistant/probe') {
      const body = await readJsonBody(request, 50_000);
      const probeInput = boundedProbeInput(body);
      const abortController = new AbortController();
      request.once('aborted', () => abortController.abort());
      response.once('close', () => {
        if (!response.writableEnded) abortController.abort();
      });
      try {
        const result = await probeProvider(probeInput.provider, probeInput.model, {
          checks: probeInput.checks,
          timeoutMs: probeInput.timeoutMs,
          signal: abortController.signal,
        });
        if (!response.destroyed) sendJson(response, 200, result, assistantCors(origin));
      } catch (error) {
        const status = error?.code === 'PROVIDER_NOT_SUPPORTED'
          || error?.code === 'PROVIDER_NOT_CONFIGURED'
          || error?.code === 'PROVIDER_MODEL_REQUIRED'
          ? 400
          : 503;
        if (!response.destroyed) sendJson(response, status, companionErrorBody(error), assistantCors(origin));
      }
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
      response.once('close', () => {
        if (!response.writableEnded) abortController.abort();
      });
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
