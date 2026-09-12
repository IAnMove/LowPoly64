
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProviderCapabilities,
  getProviderConfig,
  getProviderStatus,
  probeProvider,
  streamProviderResponse,
} from '../server/agent/provider-client.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function ndjsonResponse(values) {
  return new Response(values.map((value) => JSON.stringify(value)).join('\n') + '\n', {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

function sseResponse(values) {
  return new Response(values.map((value) => 'data: ' + JSON.stringify(value) + '\n\n').join('') + 'data: [DONE]\n\n', {
    headers: { 'content-type': 'text/event-stream' },
  });
}

function saveEnv(names) {
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  return () => names.forEach((name) => {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  });
}

test('local provider defaults stay on loopback and status exposes no secrets', () => {
  const names = [
    'RETROVISOR_OLLAMA_URL',
    'RETROVISOR_OLLAMA_MODEL',
    'RETROVISOR_LMSTUDIO_URL',
    'RETROVISOR_LMSTUDIO_MODEL',
  ];
  const restore = saveEnv(names);
  try {
    delete process.env.RETROVISOR_OLLAMA_URL;
    delete process.env.RETROVISOR_OLLAMA_MODEL;
    delete process.env.RETROVISOR_LMSTUDIO_URL;
    delete process.env.RETROVISOR_LMSTUDIO_MODEL;
    const status = getProviderStatus();
    assert.equal(status.ollama.local, true);
    assert.equal(status.ollama.configured, true);
    assert.equal(status.ollama.baseUrl, 'http://127.0.0.1:11434');
    assert.equal(status.lmstudio.baseUrl, 'http://127.0.0.1:1234/v1');
    assert.deepEqual(status.ollama.capabilities.tools, null);
    assert.equal(Object.hasOwn(status.ollama, 'apiKey'), false);
    assert.equal(getProviderCapabilities('ollama', 'unprobed-model').tools, null);
    assert.equal(getProviderConfig('ollama', 'qwen3').apiKey, null);
    assert.equal(getProviderConfig('lmstudio').model, null);
  } finally {
    restore();
  }
});

test('Ollama adapter normalizes NDJSON text and tool calls to the runner contract', async () => {
  const originalFetch = globalThis.fetch;
  const restoreContext = saveEnv(['RETROVISOR_OLLAMA_CONTEXT']);
  delete process.env.RETROVISOR_OLLAMA_CONTEXT;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    return ndjsonResponse([
      { model: 'qwen3', message: { role: 'assistant', content: 'Voy a inspeccionar.' }, done: false },
      {
        model: 'qwen3',
        message: {
          role: 'assistant',
          tool_calls: [{
            type: 'function',
            function: { name: 'get_scene_summary', arguments: { include_bounds: true } },
          }],
        },
        done: true,
      },
    ]);
  };
  try {
    const events = [];
    for await (const event of streamProviderResponse('ollama', 'qwen3', [
      { role: 'system', content: 'Usa herramientas.' },
      { role: 'user', content: 'Inspecciona.' },
    ])) events.push(event);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(requests[0].body.model, 'qwen3');
    assert.equal(requests[0].body.stream, true);
    assert.equal(requests[0].body.tools[0].type, 'function');
    assert.equal(requests[0].body.tools[0].function.name, 'get_application_status');
    assert.equal(requests[0].body.options.num_ctx, 16384);
    assert.deepEqual(requests[0].body.messages, [
      { role: 'system', content: 'Usa herramientas.' },
      { role: 'user', content: 'Inspecciona.' },
    ]);
    assert.ok(events.some((event) => event.type === 'response.output_text.delta' && event.delta.includes('inspeccionar')));
    const completed = events.find((event) => event.type === 'response.completed');
    assert.equal(completed.response.output[0].type, 'function_call');
    assert.equal(completed.response.output[0].name, 'get_scene_summary');
    assert.deepEqual(JSON.parse(completed.response.output[0].arguments), { include_bounds: true });
  } finally {
    globalThis.fetch = originalFetch;
    restoreContext();
  }
});

test('Ollama adapter preserves mixed Responses messages across tool turns', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  let turn = 0;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url: String(url), body });
    turn += 1;
    if (turn === 1) {
      return ndjsonResponse([{
        model: 'qwen3',
        message: {
          role: 'assistant',
          content: 'Voy a revisar el cuerpo.',
          tool_calls: [{
            id: 'mixed-call-1',
            type: 'function',
            function: { name: 'get_scene_summary', arguments: { include_bounds: true } },
          }],
        },
        done: true,
      }]);
    }
    return ndjsonResponse([{
      model: 'qwen3',
      message: { role: 'assistant', content: 'Listo.' },
      done: true,
    }]);
  };
  try {
    const seed = [
      { role: 'system', content: 'Usa herramientas.' },
      { role: 'user', content: 'Inspecciona.' },
    ];
    const firstEvents = [];
    for await (const event of streamProviderResponse('ollama', 'qwen3', seed)) firstEvents.push(event);
    const first = firstEvents.find((event) => event.type === 'response.completed')?.response;
    assert.deepEqual(first.output.map((item) => item.type), ['function_call', 'message']);
    const call = first.output.find((item) => item.type === 'function_call');
    const secondInput = [
      ...seed,
      ...first.output,
      { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ ok: true }) },
    ];
    for await (const _event of streamProviderResponse('ollama', 'qwen3', secondInput)) {
      // Consume the second response so its request is captured.
    }
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].body.messages, [
      ...seed,
      {
        role: 'assistant',
        content: 'Voy a revisar el cuerpo.',
        tool_calls: [{
          id: 'mixed-call-1',
          type: 'function',
          function: { name: 'get_scene_summary', arguments: { include_bounds: true } },
        }],
      },
      { role: 'tool', tool_name: 'get_scene_summary', content: '{"ok":true}' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test('LM Studio adapter uses OpenAI-compatible messages and normalizes streamed calls', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return sseResponse([
      {
        choices: [{
          delta: {
            role: 'assistant',
            tool_calls: [{
              index: 0,
              id: 'call-1',
              function: { name: 'get_scene_summary', arguments: '{\"include_' },
            }],
          },
        }],
      },
      {
        choices: [{
          delta: {
            tool_calls: [{ index: 0, function: { arguments: 'bounds\":true}' } }],
            content: null,
          },
        }],
      },
    ]);
  };
  try {
    const events = [];
    for await (const event of streamProviderResponse('lmstudio', 'qwen', [
      { role: 'system', content: 'Usa herramientas.' },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Inspecciona.' },
          { type: 'input_image', image_url: 'data:image/png;base64,AAAA' },
        ],
      },
    ])) events.push(event);
    assert.equal(request.url, 'http://127.0.0.1:1234/v1/chat/completions');
    assert.equal(request.body.model, 'qwen');
    assert.equal(request.body.stream, true);
    assert.equal(request.body.tools[0].type, 'function');
    assert.equal(request.body.tools[0].function.name, 'get_application_status');
    const userMessage = request.body.messages.find((message) => message.role === 'user');
    assert.deepEqual(userMessage.content, [
      { type: 'text', text: 'Inspecciona.' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ]);
    const completed = events.find((event) => event.type === 'response.completed');
    assert.equal(completed.response.output[0].call_id, 'call-1');
    assert.deepEqual(JSON.parse(completed.response.output[0].arguments), { include_bounds: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Responses probe sends a flat function tool schema', async () => {
  const originalFetch = globalThis.fetch;
  const restore = saveEnv(['OPENAI_API_KEY', 'RETROVISOR_OPENAI_URL']);
  process.env.OPENAI_API_KEY = 'probe-test-key';
  process.env.RETROVISOR_OPENAI_URL = 'https://api.openai.test/v1';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return jsonResponse({
      output: [{
        type: 'function_call',
        name: 'retrovisor_probe_echo',
        arguments: '{"value":"ok"}',
      }],
    });
  };
  try {
    const result = await probeProvider('openai', 'probe-model', {
      checks: ['tools'],
      timeoutMs: 2_000,
    });
    assert.equal(result.ok, true);
    assert.equal(request.url, 'https://api.openai.test/v1/responses');
    assert.equal(request.body.tools.length, 1);
    assert.deepEqual(Object.keys(request.body.tools[0]).sort(), ['description', 'name', 'parameters', 'strict', 'type']);
    assert.equal(request.body.tools[0].type, 'function');
    assert.equal(request.body.tools[0].name, 'retrovisor_probe_echo');
    assert.equal(request.body.tools[0].strict, true);
    assert.equal(Object.hasOwn(request.body.tools[0], 'function'), false);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
test('Ollama probe verifies connection, a harmless tool call, JSON Schema, and image input', async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, options = {}) => {
    const endpoint = String(url);
    const body = options.body ? JSON.parse(options.body) : null;
    seen.push({ endpoint, body });
    if (endpoint.endsWith('/api/tags')) {
      return jsonResponse({ models: [{ name: 'vision-qwen' }] });
    }
    assert.equal(endpoint, 'http://127.0.0.1:11434/api/chat');
    if (body.tools) {
      return jsonResponse({
        model: body.model,
        message: {
          role: 'assistant',
          tool_calls: [{
            type: 'function',
            function: { name: 'retrovisor_probe_echo', arguments: { value: 'ok' } },
          }],
        },
      });
    }
    if (body.format) {
      return jsonResponse({ model: body.model, message: { role: 'assistant', content: '{\"ok\":true,\"value\":\"ok\"}' } });
    }
    assert.deepEqual(body.messages[0].images, ['iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGP4z8AAR0jM/wxDSwIA6TA/wRjsoYgAAAAASUVORK5CYII=']);
    return jsonResponse({ model: body.model, message: { role: 'assistant', content: 'red-blue' } });
  };
  try {
    const result = await probeProvider('ollama', null, { timeoutMs: 2_000 });
    assert.equal(result.ok, true);
    assert.equal(result.model, 'vision-qwen');
    assert.deepEqual(result.capabilities.tools, true);
    assert.deepEqual(result.capabilities.structuredJson, true);
    assert.deepEqual(result.capabilities.vision, true);
    assert.equal(result.manualReviewRequired, false);
    assert.equal(seen.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('LM Studio probe reports unsupported vision for the selected model without cloud fallback', async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, options = {}) => {
    const endpoint = String(url);
    const body = options.body ? JSON.parse(options.body) : null;
    seen.push(endpoint);
    assert.equal(endpoint, 'http://127.0.0.1:1234/v1/chat/completions');
    if (body.tools) {
      return jsonResponse({
        choices: [{
          message: {
            tool_calls: [{
              id: 'probe-call',
              type: 'function',
              function: { name: 'retrovisor_probe_echo', arguments: '{\"value\":\"ok\"}' },
            }],
          },
        }],
      });
    }
    if (body.response_format) {
      return jsonResponse({ choices: [{ message: { content: '{\"ok\":true,\"value\":\"ok\"}' } }] });
    }
    return jsonResponse({ error: '{"message":"selected model does not accept images"}' }, 400);
  };
  try {
    const result = await probeProvider('lmstudio', 'text-only', {
      checks: ['tools', 'structuredJson', 'vision'],
      timeoutMs: 2_000,
    });
    assert.equal(result.ok, false);
    assert.equal(result.capabilities.tools, true);
    assert.equal(result.capabilities.structuredJson, true);
    assert.equal(result.capabilities.vision, false);
    assert.equal(result.manualReviewRequired, true);
    assert.equal(result.checks.vision.manualReview, true);
    assert.match(result.checks.vision.message, /selected model does not accept images/);
    assert.ok(seen.every((url) => url.startsWith('http://127.0.0.1:1234/')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});








test('/assistant/probe keeps origin checks and returns clear unsupported-provider errors', async (t) => {
  const { createCompanionServer } = await import('../server/agent/companion.js');
  const origin = 'http://127.0.0.1:5173';
  const companion = createCompanionServer({
    host: '127.0.0.1',
    port: 0,
    token: 'probe-test-token-with-enough-entropy-123456',
    allowedOrigins: [origin],
  });
  const address = await companion.listen();
  t.after(() => companion.close());
  const baseUrl = 'http://127.0.0.1:' + address.port;

  const forbidden = await fetch(baseUrl + '/assistant/probe', {
    method: 'POST',
    headers: { origin: 'http://malicious.invalid', 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'ollama', model: 'never-used' }),
  });
  assert.equal(forbidden.status, 403);

  const unsupported = await fetch(baseUrl + '/assistant/probe', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'not-a-provider' }),
  });
  assert.equal(unsupported.status, 400);
  assert.equal((await unsupported.json()).error.code, 'PROVIDER_NOT_SUPPORTED');
});
