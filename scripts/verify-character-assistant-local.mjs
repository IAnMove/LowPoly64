// Optional real-service acceptance check. Uses only an already installed model.
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { createCompanionServer } from '../server/agent/companion.js';
import { runAssistantTurn } from '../server/agent/assistant-runner.js';
import { probeProvider } from '../server/agent/provider-client.js';
import { ApprovalManager } from '../server/agent/approval-manager.js';

const model = process.env.RETROVISOR_OLLAMA_MODEL || 'qwen3:4b-instruct-2507-q4_K_M';
const output = 'artifacts/llm-character-control';
const report = { model, provider: 'ollama', realProvider: true, turns: [], completed: false };
const vite = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41738, strictPort: true, hmr: false } });
const companion = createCompanionServer({ host: '127.0.0.1', port: 47838, token: 'local-character-verification-token-123456', allowedOrigins: ['http://127.0.0.1:41738'], commandTimeoutMs: 45000 });
let browser;
try {
  await vite.listen(); await companion.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:41738');
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 60000 });
  await page.evaluate(async () => {
    const s = window.__LOWPOLY64_STATE__;
    s.userObjects.clear(); s.selectedMesh = null; s.selectedMeshes.clear();
    const { startAgentBrowserBridge } = await import('/src/modules/agent/browser-bridge.js');
    window.verificationBridge = startAgentBrowserBridge({ configUrl: 'http://127.0.0.1:47838/agent/config' });
  });
  const connectionDeadline = Date.now() + 10000;
  while (!companion.registry.sessions.size && Date.now() < connectionDeadline) await new Promise(resolve => setTimeout(resolve, 100));
  report.probe = await probeProvider('ollama', model, { timeoutMs: 60000 });
  console.log('Real capabilities:', JSON.stringify(report.probe.capabilities));
  const messages = [];
  for (const prompt of ['Crea un espadachín PSX con pelo rubio puntiagudo. Usa el flujo de borradores del editor y añádelo a la escena. Sé breve.', 'Añade una espada ancha al personaje seleccionado. Conserva el resto.', 'Reduce la cabeza del personaje seleccionado un poco. Guarda y dame los archivos JSON y GLB.']) {
    const turn = { prompt, commands: [], text: '' };
    report.turns.push(turn);
    messages.push({ role: 'user', content: prompt });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);
    try {
      for await (const event of runAssistantTurn({ provider: 'ollama', model, messages, signal: controller.signal, approvals: new ApprovalManager(), callCommand: async (name, args) => {
        const result = await companion.registry.routeCommand(name, args);
        turn.commands.push({ name, args, ok: result.ok, error: result.error });
        console.log(name, result.ok ? 'OK' : JSON.stringify(result.error));
        if (name === 'export_character_asset' && result.ok) {
          for (const artifact of result.artifacts || []) {
            await fs.mkdir(output, { recursive: true });
            await fs.writeFile(`${output}/local-${artifact.filename}`, artifact.encoding === 'base64' ? Buffer.from(artifact.data, 'base64') : JSON.stringify(artifact.data, null, 2));
          }
        }
        return result;
      } })) {
        if (event.type === 'text_delta') turn.text += event.delta;
        if (event.type === 'completed') { turn.text = event.text; turn.status = event.status; }
        if (event.type === 'tool_completed' && !event.ok) { (turn.validationErrors ||= []).push({name:event.name,error:event.result?.error}); console.log('Rejected',event.name,JSON.stringify(event.result?.error)); }
        if (event.type === 'visual_review_required') turn.manualReviewRequired = true;
      }
    } finally { clearTimeout(timer); }
    messages.push({ role: 'assistant', content: turn.text });
    console.log('Assistant:', turn.text.slice(0, 1200));
    const count = await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.length);
    turn.sceneObjects = count;
    if (!count) throw new Error('The real model did not commit a character.');
  }
  report.scene = await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.map(group => ({ name: group.userData.name, recipe: group.userData.characterDesignRecipe, sword: Boolean(group.getObjectByName('EQUIP_SWORD_BLADE')) })));
  report.completed = report.scene.length === 1 && report.scene[0].sword && report.scene[0].recipe.head.scale < 0.95 && ['json', 'glb'].every(format => report.turns.at(-1).commands.some(command => command.name === 'export_character_asset' && command.args.format === format && command.ok));
  if (!report.completed) throw new Error('The actual scene or exported files do not satisfy the three requested edits.');
} catch (error) {
  report.error = { message: error.message, code: error.code };
  console.error('Real-service check:', error.message);
  process.exitCode = 1;
} finally {
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(`${output}/ollama-real-demo.json`, JSON.stringify(report, null, 2));
  await browser?.close(); await companion.close(); await vite.close();
}
