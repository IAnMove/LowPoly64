import assert from 'node:assert/strict';
import test from 'node:test';
import { ApprovalManager } from '../server/agent/approval-manager.js';
import { runAssistantTurn } from '../server/agent/assistant-runner.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('provider loop executes tools and streams normalized text events', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'not-a-real-key';
  const responses = [
    {
      output: [{
        type: 'function_call',
        call_id: 'call-1',
        name: 'get_scene_summary',
        arguments: '{}',
      }],
    },
    {
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: 'La escena está lista.' }],
      }],
    },
  ];
  globalThis.fetch = async () => jsonResponse(responses.shift());
  const calls = [];
  const events = [];
  try {
    for await (const event of runAssistantTurn({
      provider: 'openai',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Inspecciona la escena' }],
      approvals: new ApprovalManager(),
      callCommand: async (name, args) => {
        calls.push({ name, args });
        return { ok: true, command: name, changedIds: [], data: { objectCount: 0 } };
      },
    })) {
      events.push(event);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
  assert.deepEqual(calls, [{ name: 'get_scene_summary', args: { include_bounds: true } }]);
  assert.ok(events.some((event) => event.type === 'tool_completed' && event.ok));
  assert.equal(events.find((event) => event.type === 'completed').text, 'La escena está lista.');
});

test('destructive assistant calls pause for explicit approval and can be denied', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'not-a-real-key';
  const responses = [
    {
      output: [{
        type: 'function_call',
        call_id: 'delete-1',
        name: 'delete_objects',
        arguments: JSON.stringify({ ids: ['rv_12345678'], confirm: true }),
      }],
    },
    {
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: 'No se borró nada.' }],
      }],
    },
  ];
  globalThis.fetch = async () => jsonResponse(responses.shift());
  const approvals = new ApprovalManager({ timeoutMs: 1_000 });
  let commandCalls = 0;
  const events = [];
  try {
    for await (const event of runAssistantTurn({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Borra el objeto' }],
      approvals,
      callCommand: async () => {
        commandCalls += 1;
        return { ok: true };
      },
    })) {
      events.push(event);
      if (event.type === 'approval_required') approvals.resolve(event.approvalId, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
  assert.equal(commandCalls, 0);
  assert.ok(events.some((event) => (
    event.type === 'tool_completed'
    && event.result.error.code === 'USER_DENIED'
  )));
});

test('provider credentials are required server-side and never accepted from chat input', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(async () => {
      for await (const _event of runAssistantTurn({
        provider: 'openai',
        messages: [{ role: 'user', content: 'hello' }],
        approvals: new ApprovalManager(),
        callCommand: async () => ({ ok: true }),
      })) {
        // drain
      }
    }, (error) => error.code === 'PROVIDER_NOT_CONFIGURED');
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});

test('cancelling while destructive approval is pending aborts the turn', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'not-a-real-key';
  globalThis.fetch = async () => jsonResponse({
    output: [{
      type: 'function_call',
      call_id: 'delete-cancel',
      name: 'delete_objects',
      arguments: JSON.stringify({ ids: ['rv_12345678'], confirm: true }),
    }],
  });
  const abortController = new AbortController();
  try {
    await assert.rejects(async () => {
      for await (const event of runAssistantTurn({
        provider: 'openai',
        messages: [{ role: 'user', content: 'Borra el objeto' }],
        approvals: new ApprovalManager({ timeoutMs: 1_000 }),
        signal: abortController.signal,
        callCommand: async () => ({ ok: true }),
      })) {
        if (event.type === 'approval_required') abortController.abort();
      }
    }, (error) => error.code === 'ASSISTANT_CANCELLED');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('provider loop stops at the bounded turn limit', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'not-a-real-key';
  let sequence = 0;
  globalThis.fetch = async () => {
    sequence += 1;
    return jsonResponse({
      output: [{
        type: 'function_call',
        call_id: `loop-${sequence}`,
        name: 'get_scene_summary',
        arguments: '{}',
      }],
    });
  };
  try {
    await assert.rejects(async () => {
      for await (const _event of runAssistantTurn({
        provider: 'openai',
        messages: [{ role: 'user', content: 'Sigue para siempre' }],
        approvals: new ApprovalManager(),
        callCommand: async (name) => ({ ok: true, command: name, changedIds: [], data: {} }),
      })) {
        // drain
      }
    }, (error) => error.code === 'TURN_LIMIT');
    assert.equal(sequence, 8);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('viewport captures are returned to vision-capable providers as bounded image input', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'not-a-real-key';
  const requestBodies = [];
  let sequence = 0;
  globalThis.fetch = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    sequence += 1;
    if (sequence === 1) {
      return jsonResponse({
        output: [{
          type: 'function_call',
          call_id: 'capture-1',
          name: 'capture_viewport',
          arguments: '{}',
        }],
      });
    }
    return jsonResponse({
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: 'La captura se ve correcta.' }],
      }],
    });
  };
  try {
    for await (const _event of runAssistantTurn({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Comprueba visualmente' }],
      approvals: new ApprovalManager(),
      callCommand: async (name) => ({
        ok: true,
        command: name,
        changedIds: [],
        warnings: [],
        data: {
          mimeType: 'image/png',
          width: 1,
          height: 1,
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
        },
      }),
    })) {
      // drain
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
  const secondInput = requestBodies[1].input;
  const imageMessage = secondInput.find((item) => (
    item.role === 'user'
    && Array.isArray(item.content)
    && item.content.some((content) => content.type === 'input_image')
  ));
  assert.ok(imageMessage);
  assert.match(
    imageMessage.content.find((content) => content.type === 'input_image').image_url,
    /^data:image\/png;base64,/,
  );
  const functionOutput = secondInput.find((item) => item.type === 'function_call_output').output;
  assert.equal(functionOutput.includes('iVBORw0'), false);
});
