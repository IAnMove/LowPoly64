import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/app.js';
import { createCompanionServer } from '../../server/agent/companion.js';
import { runAssistantTurn } from '../../server/agent/assistant-runner.js';
import { ApprovalManager } from '../../server/agent/approval-manager.js';

test('assistant receives complete character images across the actual browser companion bridge', async ({ page }) => {
  test.setTimeout(180000);
  const companion = createCompanionServer({ host: '127.0.0.1', port: 47839, token: 'character-bridge-e2e-token-123456', allowedOrigins: ['http://127.0.0.1:41733'], commandTimeoutMs: 45000 });
  await companion.listen();
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY;
  try {
    await bootstrapApp(page, '/', { requireEditorModals: false });
    await page.evaluate(async () => {
      const s = window.__LOWPOLY64_STATE__;
      s.userObjects.clear(); s.selectedMesh = null; s.selectedMeshes.clear();
      const { startAgentBrowserBridge } = await import('/src/modules/agent/browser-bridge.js');
      window.testCharacterBridge = startAgentBrowserBridge({ configUrl: 'http://127.0.0.1:47839/agent/config' });
    });
    await expect.poll(() => companion.registry.sessions.size).toBe(1);
    process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
    const bodies = [], commands = [];
    let draftId = null, characterId = null;
    const actions = [
      ['get_character_capabilities', () => ({})],
      ['build_character_draft', () => ({ catalog_id: 'studio:psx-swordsman', operation_id: 'bridge-build-001' })],
      ['patch_character_draft', () => ({ draft_id: draftId, expected_revision: 0, operation_id: 'bridge-sword-001', patch: { equipment: { sword: { enabled: true, width: 0.6 } } } })],
      ['patch_character_draft', () => ({ draft_id: draftId, expected_revision: 1, operation_id: 'bridge-head-001', patch: { head: { scale: 0.75 } } })],
      ['render_character_views', () => ({ draft_id: draftId, size: 384 })],
      ['evaluate_character', () => ({ draft_id: draftId })],
      ['commit_character_draft', () => ({ draft_id: draftId, expected_revision: 2, operation_id: 'bridge-commit-001' })],
      ['export_character_asset', () => ({ id: characterId, format: 'json' })],
      ['export_character_asset', () => ({ id: characterId, format: 'glb' })],
    ];
    globalThis.fetch = async (url, options) => {
      if (!String(url).startsWith('https://api.openai.com/')) return originalFetch(url, options);
      bodies.push(JSON.parse(options.body));
      const step = actions.shift();
      const output = step ? [{ type: 'function_call', call_id: `scripted-${bodies.length}`, name: step[0], arguments: JSON.stringify(step[1]()) }] : [{ type: 'message', content: [{ type: 'output_text', text: 'Personaje guardado; prueba determinista del protocolo.' }] }];
      return new Response(JSON.stringify({ output }), { headers: { 'content-type': 'application/json' } });
    };
    const events = [];
    for await (const event of runAssistantTurn({ provider: 'openai', model: 'scripted-protocol-test', messages: [{ role: 'user', content: 'Crea un espadachín PSX rubio y añade una espada ancha.' }], approvals: new ApprovalManager(), callCommand: async (name, args) => {
      const result = await companion.registry.routeCommand(name, args);
      expect(result.ok, JSON.stringify(result.error)).toBe(true);
      commands.push(name);
      if (name === 'build_character_draft') draftId = result.data.draftId;
      if (name === 'commit_character_draft') characterId = result.data.id;
      return result;
    } })) events.push(event);
    expect(events.some(event => event.type === 'completed')).toBe(true);
    const renders = events.find(event => event.name === 'render_character_views' && event.type === 'tool_completed').artifacts;
    const images = bodies.flatMap(body => body.input).filter(item => Array.isArray(item.content)).flatMap(item => item.content).filter(item => item.type === 'input_image');
    expect(new Set(images.map(image => image.image_url)).size).toBe(3);
    for (const render of renders) expect(images.some(image => image.image_url.endsWith(render.data))).toBe(true);
    const exported = events.find(event => event.name === 'export_character_asset' && event.type === 'tool_completed').artifacts[0];
    expect(exported.data.pieces.some(piece => piece.name === 'EQUIP_SWORD_BLADE')).toBe(true);
    expect(exported.data.characterDesignRecipe.head.scale).toBe(0.75);
    const glb = events.filter(event => event.name === 'export_character_asset' && event.type === 'tool_completed').at(-1).artifacts[0];
    expect(Buffer.from(glb.data, 'base64').subarray(0, 4).toString()).toBe('glTF');
    await fs.mkdir(path.join(process.cwd(), 'artifacts', 'llm-character-control'), { recursive: true });
    await fs.writeFile(path.join(process.cwd(), 'artifacts', 'llm-character-control', 'bridge-validation.json'), JSON.stringify({ provider: 'scripted mock; actual browser and companion', commands, imageBytes: renders.map(image => image.byteLength), characterId, exportedPieces: exported.data.pieces.length }, null, 2));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
    await page.evaluate(() => window.testCharacterBridge?.stop?.()).catch(() => {});
    await companion.close();
  }
});
