import * as THREE from 'three';
import { state } from './state.js';
import { createMaterial } from './materials.js';
import { selectMesh, deselect } from './selection.js';
import { TEMPLATE_REGISTRY } from './template-registry.js';
import { t } from './i18n.js';
import { pushAction } from './undo.js';

const GEOMETRY_BUILDERS = {
  cube: (p) => new THREE.BoxGeometry(p.width || 2, p.height || 2, p.depth || 2),
  sphere: (p) => new THREE.SphereGeometry(p.radius || 1, p.widthSegments || 8, p.heightSegments || 6),
  cylinder: (p) => new THREE.CylinderGeometry(p.radiusTop || 1, p.radiusBottom || 1, p.height || 2, p.radialSegments || 8),
  cone: (p) => new THREE.ConeGeometry(p.radius || 1, p.height || 2, p.radialSegments || 8),
  plane: (p) => new THREE.PlaneGeometry(p.width || 3, p.height || 3),
  capsule: (p) => new THREE.CapsuleGeometry(p.radius || 0.8, p.length || 2, p.capSegments || 4, p.radialSegments || 8),
  torus: (p) => new THREE.TorusGeometry(p.radius || 1, p.tube || 0.1, p.radialSegments || 4, p.tubularSegments || 8),
};

export function buildGroupFromDefinition(def) {
  const group = new THREE.Group();
  group.userData.name = def.name || 'GROUP';

  // First pass: create all PivotGroups flat
  const pivotMap = new Map(); // name → pivotGroup
  const pieces = def.pieces || [];

  pieces.forEach((piece, i) => {
    const geoType = piece.geometry?.type;
    const builder = GEOMETRY_BUILDERS[geoType];
    if (!builder) {
      console.warn(`Unknown geometry type: ${geoType}`);
      return;
    }

    const pieceName = piece.name || `PIECE_${i + 1}`;
    const pos = piece.position || [0, 0, 0];
    const pivot = piece.pivot || pos;

    // Create PivotGroup at pivot point
    const pivotGroup = new THREE.Group();
    pivotGroup.userData.name = pieceName;
    pivotGroup.userData.isPivot = true;
    pivotGroup.name = pieceName;
    pivotGroup.position.set(pivot[0], pivot[1], pivot[2]);

    // Create mesh with offset from pivot
    const geometry = builder(piece.geometry.params || {});
    const mat = createMaterial(state.currentMaterialType, { color: piece.color || '#ffcc00' });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.userData.geometryType = geoType;
    mesh.position.set(pos[0] - pivot[0], pos[1] - pivot[1], pos[2] - pivot[2]);

    if (piece.rotation) {
      pivotGroup.rotation.set(piece.rotation[0], piece.rotation[1], piece.rotation[2]);
    }
    if (piece.scale) {
      pivotGroup.scale.set(piece.scale[0], piece.scale[1], piece.scale[2]);
    }

    pivotGroup.add(mesh);
    group.add(pivotGroup);
    pivotMap.set(pieceName, pivotGroup);
  });

  // Second pass: re-parent pieces with `parent` field
  pieces.forEach((piece) => {
    if (!piece.parent) return;
    const pieceName = piece.name;
    const child = pivotMap.get(pieceName);
    const parent = pivotMap.get(piece.parent);
    if (!child || !parent) {
      if (!parent) console.warn(`Parent "${piece.parent}" not found for piece "${pieceName}"`);
      return;
    }
    // Depth check: count ancestors
    let depth = 0;
    let ancestor = parent;
    while (ancestor && ancestor.userData.isPivot) {
      depth++;
      ancestor = ancestor.parent?.userData?.isPivot ? ancestor.parent : null;
    }
    if (depth >= 8) {
      console.warn(`Nesting too deep for piece "${pieceName}", max 8 levels. Skipping re-parent.`);
      return;
    }
    // Compute parent's accumulated position in root-group space
    function absPos(node) {
      const p = new THREE.Vector3();
      let c = node;
      while (c && c !== group) { p.add(c.position); c = c.parent; }
      return p;
    }
    const childAbsPos = child.position.clone();
    const parentAbsPos = absPos(parent);
    // Re-parent: remove from root group, add to parent pivotGroup
    group.remove(child);
    parent.add(child);
    // Convert child position from root-space to parent-local-space
    child.position.copy(childAbsPos).sub(parentAbsPos);
  });

  return group;
}

export function addTemplate(id) {
  const def = TEMPLATE_REGISTRY.find((t) => t.id === id);
  if (!def) {
    console.warn(`Template not found: ${id}`);
    return;
  }

  const group = buildGroupFromDefinition(def);
  state.userObjects.add(group);

  const firstChild = group.children.find((c) => c.isMesh || c.userData.isPivot);
  if (firstChild) selectMesh(firstChild);

  pushAction({
    type: t('actionCreateTemplate'),
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); const m = group.children.find((c) => c.isMesh || c.userData.isPivot); if (m) selectMesh(m); },
  });
}

export function getCategories() {
  const cats = new Map();
  TEMPLATE_REGISTRY.forEach((t) => {
    if (!cats.has(t.category)) cats.set(t.category, []);
    cats.get(t.category).push(t);
  });
  return cats;
}

const TEMPLATE_I18N = {
  chair: 'tplSilla', table: 'tplMesa', shelf: 'tplEstanteria', bed: 'tplCama',
  desk: 'tplEscritorio', stool: 'tplTaburete', tree: 'tplArbol', rock: 'tplRoca',
  bush: 'tplArbusto', mushroom: 'tplSeta', flower: 'tplFlor', house: 'tplCasa',
  door: 'tplPuerta', window: 'tplVentana', stairs: 'tplEscalera', fence: 'tplValla',
  bridge: 'tplPuente', crate: 'tplCaja', barrel: 'tplBarril', chest: 'tplCofre',
  potion: 'tplPocion', sword: 'tplEspada', shield: 'tplEscudo', torch: 'tplAntorcha',
  lamppost: 'tplFarola', character: 'tplPersonaje', npc_villager: 'tplNpcAldeano',
  enemy: 'tplEnemigo', animal: 'tplAnimal',
};

const CATEGORY_I18N = {
  Mobiliario: 'catMobiliario', Naturaleza: 'catNaturaleza',
  Arquitectura: 'catArquitectura', Props: 'catProps', Personajes: 'catPersonajes',
};

export function generateTemplateListUI(container) {
  container.innerHTML = '';
  const categories = getCategories();

  categories.forEach((templates, category) => {
    const section = document.createElement('div');
    section.className = 'mb-3';

    const catLabel = CATEGORY_I18N[category] ? t(CATEGORY_I18N[category]) : category;
    const header = document.createElement('button');
    header.className = 'w-full text-left text-[#ffcc00] text-xs mb-2 tracking-widest flex justify-between items-center cursor-pointer hover:text-white';
    header.innerHTML = `<span>${catLabel.toUpperCase()}</span><span class="toggle-arrow">&#9660;</span>`;

    const list = document.createElement('div');
    list.className = 'flex flex-col gap-1';

    templates.forEach((tpl) => {
      const label = TEMPLATE_I18N[tpl.id] ? t(TEMPLATE_I18N[tpl.id]) : tpl.name;
      const btn = document.createElement('button');
      btn.className = 'retro-button bg-zinc-800 hover:bg-[#ffcc00] hover:text-black px-3 py-2 text-left text-xs flex justify-between items-center border border-zinc-700';
      btn.innerHTML = `<span>${label}</span><span class="text-[#ffcc00]">&rarr;</span>`;
      btn.onclick = () => window.addTemplate(tpl.id);
      list.appendChild(btn);
    });

    header.onclick = () => {
      list.classList.toggle('hidden');
      header.querySelector('.toggle-arrow').innerHTML = list.classList.contains('hidden') ? '&#9654;' : '&#9660;';
    };

    section.appendChild(header);
    section.appendChild(list);
    container.appendChild(section);
  });
}
