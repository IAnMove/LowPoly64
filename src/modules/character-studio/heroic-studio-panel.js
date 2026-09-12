import * as THREE from 'three';
import { HERO_PSX_RECIPE } from './heroic-presets.js';
import { applyHeroicPresentation } from './heroic-character-shapes.js';
import { buildCharacterDesignGroup } from '../agent/character-commands.js';
import { createCharacterDesignModel, normalizeCharacterDesign } from './character-design.js';
import { createAvatarPreviewRuntime } from '../avatar/avatar-preview-runtime.js';
import { getLang } from '../shared/i18n.js';
import { insertCharacterDesignModel } from './character-studio.js';

/** The authored hero is a starting point. Every control recompiles its recipe. */
export function openHeroicStudio({ recipe: initial = HERO_PSX_RECIPE, target = null } = {}) {
  document.getElementById('heroic-character-studio')?.dispatchEvent(new Event('studio-close'));
  const es = getLang() === 'es';
  const tr = (spanish, english) => es ? spanish : english;
  const recipe = normalizeCharacterDesign(initial);
  const plumber = recipe.body.profile === 'plumber';
  const element = (tag, text, css = '') => { const node = document.createElement(tag); if (text) node.textContent = text; node.style.cssText = css; return node; };
  const modal = element('div', '', 'position:fixed;inset:0;z-index:1001;background:#070a12dc;display:grid;place-items:center;padding:18px;color:#e9e5db;font:13px monospace');
  modal.id = 'heroic-character-studio';
  const panel = element('section', '', 'display:grid;grid-template-columns:minmax(300px,1.35fr) minmax(260px,1fr);gap:20px;padding:20px;width:min(1000px,96vw);max-height:92vh;overflow:auto;background:#171a25;border:1px solid #bf9b49;border-radius:10px;box-shadow:0 20px 80px #000a');
  const preview = element('div', '', 'display:flex;flex-direction:column;gap:10px;position:sticky;top:0;align-self:start');
  const title = element('h2', plumber ? 'MARIO · N64' : tr('HÉROE PSX', 'PSX HERO'), 'margin:0;color:#f4cd62;font-size:20px');
  const intro = element('p', tr('Cuerpo, cara, pelo y equipo editables. Parte de este diseño y crea tu propio personaje.', 'Editable body, face, hair and equipment. Start from this design and create your own character.'), 'margin:0;color:#b5b5c3;line-height:1.5');
  const canvas = element('canvas', '', 'width:100%;aspect-ratio:1;min-height:280px;border-radius:6px;background:#202631');
  canvas.width = 700; canvas.height = 700;
  const readout = element('div', '', 'font-size:11px;color:#a6a8bb');
  preview.append(title, intro, canvas, readout);
  const controls = element('div', '', 'display:flex;flex-direction:column;gap:11px');
  const fields = new Map();
  const read = path => path.split('.').reduce((value, key) => value[key], recipe);
  const write = (path, value) => { const keys = path.split('.'); let branch = recipe; for (const key of keys.slice(0, -1)) branch = branch[key]; branch[keys.at(-1)] = value; };
  const heading = label => controls.append(element('strong', label, 'color:#f4cd62;margin-top:4px'));
  const range = (path, label, min, max, step) => {
    const wrapper = element('label', '', 'display:grid;grid-template-columns:1fr 46px;gap:4px;color:#c3c5d2;font-size:12px');
    const output = element('output', Number(read(path)).toFixed(2), 'text-align:right;color:#f4cd62');
    wrapper.append(element('span', label), output);
    const input = element('input', '', 'grid-column:1/-1;width:100%;accent-color:#dfb74e');
    Object.assign(input, { type: 'range', min, max, step, value: read(path) }); input.dataset.heroField = path;
    input.addEventListener('input', () => { write(path, Number(input.value)); output.textContent = Number(input.value).toFixed(2); update(); });
    wrapper.append(input); controls.append(wrapper); fields.set(path, input);
  };
  const check = (path, label) => {
    const wrapper = element('label', '', 'display:flex;gap:8px;align-items:center');
    const input = element('input'); input.type = 'checkbox'; input.checked = read(path); input.dataset.heroField = path;
    input.addEventListener('change', () => { write(path, input.checked); update(); }); wrapper.append(input, element('span', label)); controls.append(wrapper);
  };
  heading(tr('Proporciones', 'Proportions'));
  range('head.scale', tr('Cabeza', 'Head'), .65, 1.45, .05);
  if (!plumber) range('head.jaw', tr('Mandíbula', 'Jaw'), .75, 1.2, .025);
  range('body.height', tr('Altura', 'Height'), 2.8, 5.8, .1);
  range('body.width', tr('Anchura', 'Width'), 1, 2.8, .05);
  for (const [key, spanish, english] of [['shoulders', 'Hombros', 'Shoulders'], ['waist', 'Cintura', 'Waist'], ['arms', 'Brazos', 'Arms'], ['legs', 'Piernas', 'Legs'], ['boots', 'Botas', 'Boots']]) range('body.' + key, tr(spanish, english), .7, 1.35, .025);
  heading(tr('Equipo', 'Equipment'));
  check('equipment.sword.enabled', tr('Espada ancha', 'Broad sword'));
  range('equipment.sword.length', tr('Longitud de espada', 'Sword length'), .8, 3.5, .05);
  range('equipment.sword.width', tr('Anchura de espada', 'Sword width'), .12, .75, .01);
  check('equipment.pauldron.enabled', tr('Hombrera', 'Shoulder armor'));
  heading(tr('Colores', 'Colors'));
  const colors = element('div', '', 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px');
  for (const [path, label] of [['skin', tr('Piel', 'Skin')], ['hair.color', plumber ? tr('Gorra', 'Cap') : tr('Pelo', 'Hair')], ['outfit.shirt', tr('Camisa', 'Shirt')], ['outfit.pants', tr('Pantalón', 'Pants')], ['outfit.shoes', tr('Botas', 'Boots')], ['equipment.pauldron.color', tr('Metal', 'Metal')]]) {
    const wrapper = element('label', '', 'display:flex;flex-direction:column;gap:4px;font-size:11px');
    const input = element('input', '', 'width:100%;height:26px;background:transparent;border:0'); input.type = 'color'; input.value = read(path); input.dataset.heroField = path;
    input.addEventListener('input', () => { write(path, input.value); update(); }); wrapper.append(element('span', label), input); colors.append(wrapper);
  }
  controls.append(colors);
  const message = element('div', '', 'color:#ecbb8c;font-size:11px;min-height:14px');
  const button = (label, action, primary = false) => {
    const button = element('button', label, `padding:10px;cursor:pointer;font:inherit;font-weight:bold;border-radius:4px;border:1px solid #62606e;background:${primary ? '#dfb74e' : '#292d3c'};color:${primary ? '#171a25' : '#eee9df'}`);
    button.type = 'button'; button.addEventListener('click', action); controls.append(button); return button;
  };
  button(tr('CREAR PERSONAJE', 'CREATE CHARACTER'), () => { insertCharacterDesignModel(createCharacterDesignModel(recipe)); close(); }, true).dataset.heroAction = 'create';
  button(tr('CREAR SOLO EL CUERPO', 'CREATE BODY ONLY'), () => {
    const input = structuredClone(recipe); input.equipment.sword.enabled = false; input.equipment.pauldron.enabled = false;
    const model = createCharacterDesignModel(input);
    const slot = model.slots.find(s => s.slotId === 'HEAD');
    const head = slot.pieces.find(p => p.name === 'HEAD');
    slot.pieces = [{ ...head, template: 'LABEL', size: [0, 0, 0], params: undefined }];
    model.retroCharacterRecipe.includeHead = false;
    insertCharacterDesignModel(model); close();
  }).dataset.heroAction = 'body';
  if (target) button(tr('APLICAR ESTA CABEZA AL SELECCIONADO', 'APPLY THIS HEAD TO SELECTED'), async () => {
    const { executeAgentCommand } = await import('../agent/agent-command-api.js');
    const { ensureAgentId } = await import('../agent/agent-object-ids.js');
    const operation = crypto.randomUUID();
    const run = async (name, args) => { const result = await executeAgentCommand(name, args); if (!result.ok) throw new Error(result.error?.message || name); return result.data; };
    let draft;
    try {
      draft = await run('build_character_draft', { source_id: ensureAgentId(target), operation_id: operation + '-head' });
      await run('patch_character_draft', { draft_id: draft.draftId, expected_revision: 0, operation_id: operation + '-patch', patch: { head: recipe.head, hair: recipe.hair } });
      await run('commit_character_draft', { draft_id: draft.draftId, expected_revision: 1, operation_id: operation + '-commit' });
      close();
    } catch (error) { message.textContent = error.message; if (draft) await executeAgentCommand('discard_character_draft', { draft_id: draft.draftId }); }
  }).dataset.heroAction = 'head';
  button(tr('CERRAR', 'CLOSE'), close);
  controls.append(message); panel.append(preview, controls); modal.append(panel); document.body.append(modal);
  const runtime = createAvatarPreviewRuntime(canvas);
  runtime.scene.background = new THREE.Color('#202631');
  runtime.renderer.setSize(700, 700, false);
  runtime.controls.enableDamping = true;
  runtime.controls.dampingFactor = .12;
  let group;
  let frame = null;
  let renderPending = true;
  let lastRender = -Infinity;
  let closed = false;
  const minRenderInterval = 1000 / 30;
  function dispose() { if (!group) return; runtime.scene.remove(group); group.traverse(node => { node.geometry?.dispose(); for (const material of Array.isArray(node.material) ? node.material : [node.material]) material?.dispose(); }); }
  function update() {
    const next = buildCharacterDesignGroup(recipe); dispose(); group = next;
    applyHeroicPresentation(group); runtime.scene.add(group);
    const bounds = new THREE.Box3().setFromObject(group), center = bounds.getCenter(new THREE.Vector3());
    const distance = bounds.getBoundingSphere(new THREE.Sphere()).radius / Math.sin(THREE.MathUtils.degToRad(runtime.camera.fov / 2)) * 1.06;
    runtime.controls.target.copy(center); runtime.camera.position.copy(center).add(new THREE.Vector3(.55, .06, 1).normalize().multiplyScalar(distance));
    runtime.camera.aspect = 1; runtime.camera.updateProjectionMatrix(); runtime.controls.update();
    let triangles = 0; group.traverse(node => { if (node.isMesh) triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3; });
    readout.textContent = `${triangles} ${tr('triángulos · rig humanoide · JSON / GLB', 'triangles · humanoid rig · JSON / GLB')}`;
    scheduleRender();
  }
  function scheduleRender() {
    if (closed) return;
    renderPending = true;
    if (frame === null) frame = requestAnimationFrame(render);
  }
  function render(now = performance.now()) {
    frame = null;
    if (closed || !renderPending) return;
    if (now - lastRender < minRenderInterval) {
      frame = requestAnimationFrame(render);
      return;
    }
    renderPending = false;
    runtime.controls.update();
    runtime.renderer.render(runtime.scene, runtime.camera);
    lastRender = now;
  }
  runtime.controls.addEventListener('change', scheduleRender);
  function close() {
    closed = true;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    runtime.controls.removeEventListener('change', scheduleRender);
    dispose(); runtime.controls.dispose(); runtime.renderer.dispose(); modal.remove();
  }
  modal.addEventListener('studio-close', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  update(); scheduleRender();
  return { modal, recipe, fields, close };
}
