import assert from 'node:assert/strict';
import test from 'node:test';
import { ApprovalManager } from '../server/agent/approval-manager.js';
import { runAssistantTurn } from '../server/agent/assistant-runner.js';
import { probeProvider } from '../server/agent/provider-client.js';
import { makeSuccessResult } from '../src/modules/agent/tool-validation.js';

const ONE_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function characterViews() {
  return ['front', 'profile', 'three-quarter'].map((view) => ({
    view,
    mimeType: 'image/png',
    width: 1,
    height: 1,
    data: ONE_PIXEL_PNG,
  }));
}

function characterDefinition(count = 150, textLength = 8) {
  return {
    version: 2,
    objects: Array.from({ length: count }, (_, index) => ({
      id: `rv_${String(index).padStart(8, '0')}`,
      name: `part-${index}`,
      points: [[index, 0, 0], [index, 1, 0], [index, 0, 1]],
      metadata: 'x'.repeat(textLength),
    })),
  };
}

function containsImagePayload(value) {
  if (Array.isArray(value)) return value.some(containsImagePayload);
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, 'images') || Object.hasOwn(value, 'input_image') || Object.hasOwn(value, 'image_url')) return true;
  return Object.values(value).some(containsImagePayload);
}

async function collectAssistant(options) {
  const events = [];
  for await (const event of runAssistantTurn(options)) events.push(event);
  return events;
}

test('capture_viewport makeSuccessResult keeps a valid PNG artifact for the panel', () => {
  const result = makeSuccessResult('capture_viewport', {
    mimeType: 'image/png',
    width: 1,
    height: 1,
    data: ONE_PIXEL_PNG,
  });
  assert.equal(result.ok, true);
  assert.equal(result.artifacts[0].mimeType, 'image/png');
  assert.deepEqual(Buffer.from(result.artifacts[0].data, 'base64'), Buffer.from(ONE_PIXEL_PNG, 'base64'));
  assert.equal(result.data.dataOmitted, true);
});

test('unknown local models require a probe without making provider requests', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error('fetch must not be reached for an unknown local model');
  };
  try {
    await assert.rejects(
      () => collectAssistant({
        provider: 'ollama',
        model: 'qwen-unknown-unittest',
        messages: [{ role: 'user', content: 'Prueba' }],
        approvals: new ApprovalManager(),
        callCommand: async () => ({ ok: true }),
      }),
      (error) => error.code === 'PROVIDER_PROBE_REQUIRED',
    );
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a probed non-vision local model keeps full panel artifacts and requests manual review', async () => {
  const originalFetch = globalThis.fetch;
  const assistantRequests = [];
  const probeRequests = [];
  const responses = [
    {
      message: {
        tool_calls: [{
          function: {
            name: 'retrovisor_probe_echo',
            arguments: JSON.stringify({ value: 'ok' }),
          },
        }],
      },
    },
    { message: { content: 'no-image' } },
    {
      message: {
        tool_calls: [{
          function: {
            name: 'render_character_views',
            arguments: JSON.stringify({ id: 'rv_12345678', size: 128 }),
          },
        }],
      },
    },
    { message: { content: 'Las vistas requieren revisión manual.' } },
  ];
  globalThis.fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    const probeTool = payload.tools?.[0]?.function?.name === 'retrovisor_probe_echo';
    const probeVision = payload.messages?.some((message) => String(message.content || '').includes('Inspect the probe image'));
    if (probeTool || probeVision) {
      probeRequests.push({ url, payload });
      return jsonResponse(responses.shift());
    }
    assistantRequests.push({ url, payload });
    return jsonResponse(responses.shift());
  };
  try {
    const probe = await probeProvider('ollama', 'qwen-vision-false-unittest', {
      checks: ['tools', 'vision'],
    });
    assert.equal(probe.capabilities.tools, true);
    assert.equal(probe.capabilities.vision, false);
    assert.equal(probeRequests.length, 2);

    const events = await collectAssistant({
      provider: 'ollama',
      model: 'qwen-vision-false-unittest',
      messages: [{ role: 'user', content: 'Renderiza las vistas.' }],
      approvals: new ApprovalManager(),
      callCommand: async () => makeSuccessResult('render_character_views', {
        views: characterViews(),
      }),
    });
    assert.equal(assistantRequests.length, 2);
    assert.equal(assistantRequests.some((request) => containsImagePayload(request.payload)), false);
    const manualReview = events.find((event) => event.type === 'visual_review_required');
    assert.ok(manualReview);
    assert.match(manualReview.message, /vistas/i);
    const disclaimer = JSON.stringify(assistantRequests[1].payload.messages);
    assert.match(disclaimer, /do not claim visual inspection/i);
    const completed = events.find((event) => event.type === 'tool_completed');
    assert.equal(completed.ok, true);
    assert.equal(completed.artifacts.length, 3);
    assert.deepEqual(completed.artifacts.map((artifact) => artifact.view), ['front', 'profile', 'three-quarter']);
    assert.equal(completed.artifacts[0].data, ONE_PIXEL_PNG);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('small JSON artifacts reach provider input complete, including arrays over 100 entries', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'vision-json-unittest-key';
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body);
    requests.push(payload);
    if (requests.length === 1) {
      return jsonResponse({
        output: [{
          type: 'function_call',
          call_id: 'export-json-small',
          name: 'export_character_asset',
          arguments: JSON.stringify({ id: 'rv_12345678', format: 'json' }),
        }],
      });
    }
    return jsonResponse({
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'Exportación lista.' }] }],
    });
  };
  const definition = characterDefinition(150, 8);
  assert.ok(JSON.stringify(definition).length < 64_000);
  try {
    const events = await collectAssistant({
      provider: 'openai',
      model: 'gpt-json-unittest',
      messages: [{ role: 'user', content: 'Exporta JSON.' }],
      approvals: new ApprovalManager(),
      callCommand: async () => makeSuccessResult('export_character_asset', {
        id: 'rv_12345678',
        format: 'json',
        mimeType: 'application/json',
        filename: 'character.json',
        definition,
      }),
    });
    const functionOutput = requests[1].input.find((item) => item.type === 'function_call_output');
    const providerResult = JSON.parse(functionOutput.output);
    assert.equal(providerResult.jsonArtifacts[0].complete, true);
    assert.equal(providerResult.jsonArtifacts[0].content.objects.length, 150);
    assert.equal(providerResult.jsonArtifacts[0].content.objects[149].id, 'rv_00000149');
    const completed = events.find((event) => event.type === 'tool_completed');
    assert.deepEqual(completed.artifacts[0].data, definition);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('large JSON artifacts are omitted from provider text but remain complete in panel events', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'vision-json-large-unittest-key';
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body);
    requests.push(payload);
    if (requests.length === 1) {
      return jsonResponse({
        output: [{
          type: 'function_call',
          call_id: 'export-json-large',
          name: 'export_character_asset',
          arguments: JSON.stringify({ id: 'rv_12345678', format: 'json' }),
        }],
      });
    }
    return jsonResponse({
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'El archivo está listo para descarga.' }] }],
    });
  };
  const definition = characterDefinition(2_500, 40);
  assert.ok(JSON.stringify(definition).length > 64_000);
  try {
    const events = await collectAssistant({
      provider: 'openai',
      model: 'gpt-json-large-unittest',
      messages: [{ role: 'user', content: 'Exporta el GLB/JSON completo.' }],
      approvals: new ApprovalManager(),
      callCommand: async () => makeSuccessResult('export_character_asset', {
        id: 'rv_12345678',
        format: 'json',
        mimeType: 'application/json',
        filename: 'character-large.json',
        definition,
      }),
    });
    const functionOutput = requests[1].input.find((item) => item.type === 'function_call_output');
    const providerResult = JSON.parse(functionOutput.output);
    assert.equal(providerResult.jsonArtifacts[0].complete, false);
    assert.equal(providerResult.jsonArtifacts[0].omitted, true);
    assert.equal(typeof providerResult.jsonArtifacts[0].reason, 'string');
    assert.equal(Object.hasOwn(providerResult.jsonArtifacts[0], 'content'), false);
    const completed = events.find((event) => event.type === 'tool_completed');
    assert.deepEqual(completed.artifacts[0].data, definition);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('cancellation after tool_started prevents callCommand', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'cancel-unittest-key';
  let fetchCount = 0;
  let commandCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse({
      output: [{
        type: 'function_call',
        call_id: 'cancel-before-command',
        name: 'get_scene_summary',
        arguments: '{}',
      }],
    });
  };
  const controller = new AbortController();
  try {
    await assert.rejects(async () => {
      for await (const event of runAssistantTurn({
        provider: 'openai',
        model: 'gpt-cancel-unittest',
        messages: [{ role: 'user', content: 'Inspecciona.' }],
        approvals: new ApprovalManager(),
        signal: controller.signal,
        callCommand: async () => {
          commandCount += 1;
          return { ok: true };
        },
      })) {
        if (event.type === 'tool_started') controller.abort();
      }
    }, (error) => error.code === 'ASSISTANT_CANCELLED');
    assert.equal(fetchCount, 1);
    assert.equal(commandCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});


test('a probed local model that returns text twice gets one factual no-action continuation', async () => {
  const originalFetch = globalThis.fetch;
  const model = 'qwen-no-actions-unittest';
  const probeRequests = [];
  const assistantRequests = [];
  let commandCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    const endpoint = String(url);
    const body = options.body ? JSON.parse(options.body) : null;
    if (endpoint.endsWith('/api/tags')) {
      return jsonResponse({ models: [{ name: model }] });
    }
    assert.equal(endpoint, 'http://127.0.0.1:11434/api/chat');
    const isProbe = body.messages?.some((message) => (
      typeof message.content === 'string'
      && message.content.includes('Call retrovisor_probe_echo exactly once')
    ));
    if (isProbe) {
      probeRequests.push(body);
      return jsonResponse({
        model,
        message: {
          role: 'assistant',
          tool_calls: [{
            type: 'function',
            function: {
              name: 'retrovisor_probe_echo',
              arguments: { value: 'ok' },
            },
          }],
        },
      });
    }
    assistantRequests.push(body);
    const text = assistantRequests.length === 1
      ? 'He revisado la pregunta.'
      : 'No se ejecutaron cambios.';
    return jsonResponse({ model, message: { role: 'assistant', content: text } });
  };
  try {
    const probe = await probeProvider('ollama', model, {
      checks: ['connection', 'tools'],
    });
    assert.equal(probe.ok, true);
    assert.equal(probe.capabilities.tools, true);
    assert.equal(probe.checks.tools.ok, true);
    assert.equal(probeRequests.length, 1);

    const events = await collectAssistant({
      provider: 'ollama',
      model,
      messages: [{ role: 'user', content: '¿Qué puedes hacer?' }],
      approvals: new ApprovalManager(),
      callCommand: async () => {
        commandCount += 1;
        return makeSuccessResult('get_scene_summary', { changed: true });
      },
    });
    assert.equal(assistantRequests.length, 2);
    assert.equal(commandCount, 0);
    assert.equal(events.filter((event) => event.type === 'workflow_continuation').length, 1);
    assert.equal(events.some((event) => event.type === 'tool_started'), false);
    assert.equal(events.some((event) => event.type === 'tool_completed'), false);

    const continuation = assistantRequests[1].messages.at(-1);
    assert.equal(continuation.role, 'user');
    assert.match(continuation.content, /zero editor commands have run/i);
    assert.match(continuation.content, /no objects were changed/i);
    assert.equal(assistantRequests[1].messages.some((message) => message.tool_calls?.length), false);

    const completed = events.find((event) => event.type === 'completed');
    assert.ok(completed);
    assert.equal(completed.status, 'no_actions');
    assert.equal(completed.toolCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

