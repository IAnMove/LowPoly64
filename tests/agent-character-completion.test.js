import assert from 'node:assert/strict';
import test from 'node:test';
import { runAssistantTurn } from '../server/agent/assistant-runner.js';

const draftId = 'draft_completion123';
const build = { type: 'function_call', call_id: 'build', name: 'build_character_draft', arguments: JSON.stringify({ operation_id: 'build', recipe: { style: 'psx' } }) };
const say = text => ({ output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] });
const finish = name => ({ output: [{ type: 'function_call', call_id: name, name, arguments: JSON.stringify({ draft_id: draftId, expected_revision: 0, operation_id: name }) }] });

async function run(responses, prompt) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only';
  const events = [], commands = [], requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    assert.ok(responses.length, 'Continuation must be bounded');
    return new Response(JSON.stringify(responses.shift()), { headers: { 'content-type': 'application/json' } });
  };
  try {
    for await (const event of runAssistantTurn({ provider: 'openai', model: 'completion-test', messages: [{ role: 'user', content: prompt }], callCommand: async (name) => {
      commands.push(name);
      return { ok: true, data: name === 'build_character_draft' ? { draftId, revision: 0 } : { id: 'rv_completed123' } };
    } })) events.push(event);
    return { events, commands, requests };
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
}

test('unfinished scene requests get one contextual continuation, never an automatic commit', async () => {
  const result = await run([{ output: [build] }, say('Creado.'), finish('commit_character_draft'), say('Añadido a la escena.')], 'Crea el personaje y añádelo a la escena.');
  assert.deepEqual(result.commands, ['build_character_draft', 'commit_character_draft']);
  assert.equal(result.events.filter(event => event.type === 'workflow_continuation').length, 1);
  assert.match(result.requests[2].input.at(-1).content, /Do not commit when the user asked to review first/);
  assert.match(result.requests[2].input.at(-1).content, /draft_completion123/);
  assert.equal(result.events.at(-1).status, 'complete');
});

test('a model stopping on a draft receives a truthful pending status without changing the scene', async () => {
  const result = await run([{ output: [build] }, say('Borrador listo.'), say('Creado y añadido.')], 'Prepara solo un borrador para revisarlo antes de añadirlo.');
  assert.deepEqual(result.commands, ['build_character_draft']);
  assert.equal(result.requests.length, 3);
  assert.equal(result.events.at(-1).status, 'draft_pending');
  assert.match(result.events.at(-1).text, /todavía no se han añadido/);
  assert.deepEqual(result.events.find(event => event.type === 'draft_pending').drafts, [{ draftId, revision: 0 }]);
});

test('discarded drafts do not trigger completion recovery', async () => {
  const result = await run([{ output: [build] }, finish('discard_character_draft'), say('Borrador descartado.')], 'Prepara y descarta un borrador de prueba.');
  assert.equal(result.events.at(-1).status, 'complete');
  assert.equal(result.events.some(event => event.type === 'workflow_continuation'), false);
});
