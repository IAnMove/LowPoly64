import * as THREE from 'three';
import { state } from '../shared/state.js';
import { createMaterial } from '../shared/materials.js';
import { selectMesh, deselect } from './selection.js';
import { TEMPLATE_REGISTRY } from './template-registry.js';
import { getLang, t } from '../shared/i18n.js';
import { pushAction } from '../shared/undo.js';
import { emit } from '../../event-bus.js';
import { compileAnimation } from '../animation/animation.js';
import { resolveAnimationProfile } from '../animation/animation-profiles.js';
import { buildBoneToTargetMap, translateAnimForMesh } from '../animation/mesh-animation-translation.js';
import { rebuildRigAnimationsForGroup } from '../animation/rigging-utils.js';
import {
  cloneGeometryParams,
  createCustomGeometry,
  createPyramidGeometry,
  createWedgeGeometry,
  normalizeGeometryDefinition,
} from './custom-geometries.js';
import { applyVertexColors } from './vertex-colors.js';
import { applyFaceColors } from './retro-effects.js';
import { configureTexture, applyTextureTransform, rememberTextureTransform } from '../shared/textures.js';

const GEOMETRY_BUILDERS = {
  cube: (p) => new THREE.BoxGeometry(p.width ?? 2, p.height ?? 2, p.depth ?? 2),
  sphere: (p) => new THREE.SphereGeometry(p.radius ?? 1, p.widthSegments ?? 8, p.heightSegments ?? 6),
  cylinder: (p) => new THREE.CylinderGeometry(p.radiusTop ?? 1, p.radiusBottom ?? 1, p.height ?? 2, p.radialSegments ?? 8),
  cone: (p) => new THREE.ConeGeometry(p.radius ?? 1, p.height ?? 2, p.radialSegments ?? 8),
  plane: (p) => new THREE.PlaneGeometry(p.width ?? 3, p.height ?? 3),
  capsule: (p) => new THREE.CapsuleGeometry(p.radius ?? 0.8, p.length ?? 2, p.capSegments ?? 4, p.radialSegments ?? 8),
  torus: (p) => new THREE.TorusGeometry(p.radius ?? 1, p.tube ?? 0.1, p.radialSegments ?? 4, p.tubularSegments ?? 8),
  wedge: (p) => createWedgeGeometry(p.width ?? 2, p.height ?? 2, p.depth ?? 2),
  pyramid: (p) => createPyramidGeometry(p.width ?? 2, p.height ?? 2),
  custom: (p) => createCustomGeometry(p.vertices || [], p.faces || []),
  label: () => null,
};

function applyFaceUVs(mesh, faceUVs) {
  if (!mesh?.geometry?.attributes?.uv || !Array.isArray(faceUVs) || mesh.userData.geometryType !== 'cube') return;
  const uvAttr = mesh.geometry.attributes.uv;
  for (let face = 0; face < 6; face++) {
    const d = faceUVs[face];
    if (!d) continue;
    const base = face * 4;
    const rad = THREE.MathUtils.degToRad(d.rot || 0);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
    corners.forEach((c, i) => {
      const cx = c[0] - 0.5;
      const cy = c[1] - 0.5;
      const rx = cx * cos - cy * sin + 0.5;
      const ry = cx * sin + cy * cos + 0.5;
      uvAttr.setXY(base + i, d.ou + rx * d.su, d.ov + ry * d.sv);
    });
  }
  uvAttr.needsUpdate = true;
}

function applySerializedTexture(mesh, textureDef) {
  if (!mesh || !textureDef?.dataURL) return;
  const img = new Image();
  img.onload = () => {
    const texture = new THREE.Texture(img);
    configureTexture(texture);
    if (textureDef.transform) {
      applyTextureTransform(texture, textureDef.transform);
    }
    mesh.userData.texture = texture;
    mesh.userData.textureEnabled = true;
    if (textureDef.processing) {
      mesh.userData.textureProcessing = JSON.parse(JSON.stringify(textureDef.processing));
    }
    mesh.userData.colorBeforeTexture = mesh.material?.color?.getHex?.() ?? 0xffffff;
    rememberTextureTransform(mesh, texture);
    mesh.material.map = texture;
    mesh.material.color.set(0xffffff);
    mesh.material.needsUpdate = true;
    if (textureDef.faceUVs) {
      mesh.userData.faceUVs = textureDef.faceUVs.map((d) => ({ ...d }));
      applyFaceUVs(mesh, textureDef.faceUVs);
    }
  };
  img.src = textureDef.dataURL;
}

function cloneTextureDefinition(textureDef) {
  return textureDef ? JSON.parse(JSON.stringify(textureDef)) : textureDef;
}

function mergeAnimationDefs(baseAnimations = [], extraAnimations = [], namePrefix = 'profile') {
  const merged = baseAnimations.map((anim) => ({ ...anim }));
  const usedNames = new Set(merged.map((anim, index) => anim?.name || `anim_${index + 1}`));

  extraAnimations.forEach((anim, index) => {
    if (!anim) return;
    const candidate = { ...anim };
    const rawName = candidate.name || `anim_${index + 1}`;
    let resolvedName = rawName;
    if (usedNames.has(resolvedName)) {
      const safePrefix = String(namePrefix || 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'profile';
      resolvedName = `${safePrefix}_${rawName}`;
      let suffix = 2;
      while (usedNames.has(resolvedName)) {
        resolvedName = `${safePrefix}_${rawName}_${suffix++}`;
      }
    }
    candidate.name = resolvedName;
    usedNames.add(resolvedName);
    merged.push(candidate);
  });

  return merged;
}

export function buildGroupFromDefinition(def, { compileAnimations = true } = {}) {
  const group = new THREE.Group();
  group.userData.name = def.name || 'GROUP';

  // First pass: create all PivotGroups flat
  const pivotMap = new Map(); // name → pivotGroup
  const pieces = def.pieces || [];

  pieces.forEach((piece, i) => {
    const geometryDef = normalizeGeometryDefinition(piece.geometry);
    const geoType = geometryDef.type;
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
    if (geoType !== 'label') {
      const geometry = builder(geometryDef.params);
      // Apply face colors first (converts to non-indexed), then vertex colors
      const hasFC = piece.faceColors && applyFaceColors(geometry, piece.faceColors);
      const hasVC = (piece.vertexColors && applyVertexColors(geometry, piece.vertexColors)) || hasFC;
      const mat = createMaterial(state.currentMaterialType, {
        color: piece.color || '#ffcc00',
        vertexColors: hasVC,
        opacity: piece.opacity !== undefined ? piece.opacity : 1,
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.userData.geometryType = geoType;
      mesh.userData.geometryParams = cloneGeometryParams(geometry.parameters || geometryDef.params);
      if (hasVC) mesh.userData.vertexColors = piece.vertexColors;
      if (hasFC) mesh.userData.faceColorArray = piece.faceColors;
      if (piece.texture) mesh.userData.textureDefinition = cloneTextureDefinition(piece.texture);
      mesh.position.set(pos[0] - pivot[0], pos[1] - pivot[1], pos[2] - pivot[2]);
      if (piece.texture) applySerializedTexture(mesh, piece.texture);
      pivotGroup.add(mesh);
    } else {
      pivotGroup.userData.geometryType = 'label';
      pivotGroup.userData.geometryParams = {};
    }

    if (piece.rotation) {
      pivotGroup.rotation.set(piece.rotation[0], piece.rotation[1], piece.rotation[2]);
    }
    if (piece.scale) {
      pivotGroup.scale.set(piece.scale[0], piece.scale[1], piece.scale[2]);
    }

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

  if (compileAnimations && Array.isArray(def.animations) && def.animations.length > 0) {
    group.userData.animations = def.animations.map((anim) => ({ ...anim }));
    group.userData.animationClips = group.userData.animations
      .map((animDef) => compileAnimation(animDef, group))
      .filter(Boolean);
  }

  return group;
}

export function instantiateTemplateDefinition(def) {
  const group = buildGroupFromDefinition(def);
  group.userData.templateId = def.id || null;

  if (def._archetypeMeta) {
    const meta = def._archetypeMeta;
    group.userData.archetype = meta.archetype;
    group.userData.slotMap = Object.fromEntries(
      Object.entries(meta.slotMap || {}).map(([slotId, names]) => [slotId, Array.isArray(names) ? [...names] : []])
    );
    group.userData.animationProfile = meta.animationProfile || null;
    group.userData.skeletonId = meta.skeletonId || null;

    if (group.userData.skeletonId || group.userData.animationProfile) {
      const { skeleton } = rebuildRigAnimationsForGroup(group, {
        skeletonId: group.userData.skeletonId || undefined,
        animationProfile: group.userData.animationProfile,
      });
      if (skeleton?.defaultBindings) {
        group.userData.slotBindings = { ...skeleton.defaultBindings };
      }
    }
  }

  if (shouldApplyHumanoidFacing(def, group.userData)) {
    group.rotation.y = Math.PI;
    group.userData.defaultFacingYaw = Math.PI;
  }

  return group;
}

const HUMANOID_FACING_TOKENS = [
  'hero',
  'knight',
  'archer',
  'mage',
  'guard',
  'merchant',
  'villager',
  'bomber',
  'sage',
  'princess',
  'ranger',
  'dragoon',
  'revenant',
  'swordsman',
  'psx_humanoid',
  'humanoid_mold',
  'skeleton',
];

function shouldApplyHumanoidFacing(def, userData = {}) {
  const id = String(def?.id || '').toLowerCase();
  const archetype = String(userData?.archetype || def?._archetypeMeta?.archetype || '').toUpperCase();
  const skeletonId = String(userData?.skeletonId || def?._archetypeMeta?.skeletonId || '').toUpperCase();
  const hasFacingToken = HUMANOID_FACING_TOKENS.some((token) => id.includes(token));

  if (hasFacingToken) {
    return true;
  }

  if (archetype === 'HUMANOID') {
    return true;
  }

  if (skeletonId !== 'HUMANOID_DEFAULT') {
    return false;
  }

  return false;
}

const TEMPLATE_SPAWN_CELL_SIZE = 6;
const TEMPLATE_SPAWN_PADDING = 1.25;
const TEMPLATE_SPAWN_MAX_RING = 12;

function measureObjectFootprintRadius(object) {
  if (!object) {
    return TEMPLATE_SPAWN_CELL_SIZE * 0.45;
  }

  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return TEMPLATE_SPAWN_CELL_SIZE * 0.45;
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = (Math.max(size.x, size.z) * 0.5) + TEMPLATE_SPAWN_PADDING;
  return Math.max(radius, TEMPLATE_SPAWN_CELL_SIZE * 0.45);
}

function buildSpawnCandidates() {
  const candidates = [new THREE.Vector3(0, 0, 0)];

  for (let ring = 1; ring <= TEMPLATE_SPAWN_MAX_RING; ring += 1) {
    for (let gridX = -ring; gridX <= ring; gridX += 1) {
      for (let gridZ = -ring; gridZ <= ring; gridZ += 1) {
        const onPerimeter = Math.abs(gridX) === ring || Math.abs(gridZ) === ring;
        if (!onPerimeter) continue;
        candidates.push(new THREE.Vector3(
          gridX * TEMPLATE_SPAWN_CELL_SIZE,
          0,
          gridZ * TEMPLATE_SPAWN_CELL_SIZE
        ));
      }
    }
  }

  return candidates;
}

function findTemplateSpawnPosition(group) {
  const candidateRadius = measureObjectFootprintRadius(group);
  const occupied = (state.userObjects?.children || [])
    .filter((child) => child && child !== group)
    .map((child) => ({
      position: child.position.clone(),
      radius: measureObjectFootprintRadius(child),
    }));

  const candidates = buildSpawnCandidates();
  for (const candidate of candidates) {
    const collides = occupied.some((entry) => {
      const dx = candidate.x - entry.position.x;
      const dz = candidate.z - entry.position.z;
      const minDistance = candidateRadius + entry.radius;
      return (dx * dx) + (dz * dz) < (minDistance * minDistance);
    });
    if (!collides) {
      return candidate;
    }
  }

  const fallbackOffset = (occupied.length + 1) * TEMPLATE_SPAWN_CELL_SIZE;
  return new THREE.Vector3(fallbackOffset, 0, 0);
}

export function addTemplate(id) {
  const def = TEMPLATE_REGISTRY.find((t) => t.id === id);
  if (!def) {
    console.warn(`Template not found: ${id}`);
    return;
  }

  const group = instantiateTemplateDefinition(def);
  const spawnPosition = findTemplateSpawnPosition(group);
  group.position.copy(spawnPosition);

  state.userObjects.add(group);

  selectMesh(group);

  pushAction({
    type: t('actionCreateTemplate'),
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); selectMesh(group); },
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
  // Furniture
  chair: 'tplSilla', table: 'tplMesa', bed: 'tplCama', bookshelf: 'tplEstanteria',
  desk: 'tplEscritorio', stool: 'tplTaburete',
  // Nature
  tree: 'tplArbol', rock: 'tplRoca', bush: 'tplArbusto', mushroom: 'tplSeta', flower: 'tplFlor',
  // Architecture
  house: 'tplCasa', door: 'tplPuerta', window: 'tplVentana', stairs: 'tplEscalera',
  fence: 'tplValla', bridge: 'tplPuente',
  // Props
  crate: 'tplCaja', barrel: 'tplBarril', chest: 'tplCofre', potion: 'tplPocion',
  sword: 'tplEspada', shield: 'tplEscudo', torch: 'tplAntorcha', 'lamp-post': 'tplFarola',
  coin: 'tplMoneda', key: 'tplLlave', lever: 'tplPalanca', button: 'tplBoton',
  breakable_tablet: 'tplCajaRompible', pressure_plate: 'tplPlacaPresion',
  // Characters
  villager: 'tplAldeano', merchant: 'tplMercader', guard: 'tplGuardia',
  hero: 'tplHeroe', knight: 'tplCaballero', knight_horse: 'tplCaballeroMontado',
  archer: 'tplArquero', mage: 'tplMago', bomber: 'tplBombardero', 'old-sage': 'tplViejoSabio',
  psx_warrior: 'tplPsxWarrior',
  swordsman_cm: 'tplEspadachinCM', archer_cm: 'tplArqueroCM',
  chicken_cm: 'tplGallinaCM', car_cm: 'tplCocheCM',
  // Monsters
  slime: 'tplSlime', skeleton: 'tplEsqueleto', bat: 'tplMurcielago',
};

const CATEGORY_I18N = {
  Mobiliario: 'catMobiliario', Naturaleza: 'catNaturaleza',
  Arquitectura: 'catArquitectura', Props: 'catProps', Personajes: 'catPersonajes',
  Monstruos: 'catMonstruos',
};

const CATEGORY_LABELS = {
  Mobiliario: { en: 'Furniture', es: 'Mobiliario' },
  Naturaleza: { en: 'Nature', es: 'Naturaleza' },
  Arquitectura: { en: 'Architecture', es: 'Arquitectura' },
  Props: { en: 'Props', es: 'Props' },
  Comida: { en: 'Food', es: 'Comida' },
  Videojuegos: { en: 'Gaming', es: 'Videojuegos' },
  Efectos: { en: 'Effects', es: 'Efectos' },
  Personajes: { en: 'Characters', es: 'Personajes' },
  Monstruos: { en: 'Monsters', es: 'Monstruos' },
  PSX: { en: 'PSX', es: 'PSX' },
  N64: { en: 'N64', es: 'N64' },
};

const SUBSECTION_LABELS = {
  seating: { en: 'Seating', es: 'Asientos' },
  surfaces: { en: 'Tables and Surfaces', es: 'Mesas y Superficies' },
  storage: { en: 'Storage', es: 'Almacenaje' },
  rest: { en: 'Beds and Rest', es: 'Descanso' },
  generalFurniture: { en: 'Other Furniture', es: 'Otros Muebles' },

  modularRivers: { en: 'Modular Rivers', es: 'Rios Modulares' },
  waterLandmarks: { en: 'Waterfalls and Water', es: 'Cascadas y Agua' },
  cavesLandmarks: { en: 'Caves and Cliffs', es: 'Cuevas y Acantilados' },
  plants: { en: 'Plants and Trees', es: 'Plantas y Arboles' },
  mushrooms: { en: 'Mushrooms', es: 'Setas' },
  rocksCrystals: { en: 'Rocks and Crystals', es: 'Rocas y Cristales' },
  woodland: { en: 'Logs and Stumps', es: 'Troncos y Tocones' },
  generalNature: { en: 'Other Nature', es: 'Otra Naturaleza' },

  modularWalls: { en: 'Modular Walls', es: 'Murallas Modulares' },
  modularHouses: { en: 'Modular Houses', es: 'Casas Modulares' },
  modularRoads: { en: 'Modular Roads', es: 'Carreteras Modulares' },
  buildingParts: { en: 'Parts and Modules', es: 'Piezas y Modulos' },
  levelTraversal: { en: 'Platforms and Traversal', es: 'Plataformas y Recorrido' },
  buildings: { en: 'Buildings', es: 'Edificios' },
  towersLandmarks: { en: 'Towers and Landmarks', es: 'Torres y Referentes' },
  outdoorStructures: { en: 'Outdoor Structures', es: 'Estructuras Exteriores' },
  generalArchitecture: { en: 'Other Architecture', es: 'Otra Arquitectura' },

  pickupsRewards: { en: 'Pickups and Rewards', es: 'Pickups y Recompensas' },
  containers: { en: 'Containers and Breakables', es: 'Contenedores y Rompibles' },
  switchesTraps: { en: 'Switches and Traps', es: 'Interruptores y Trampas' },
  gearWeapons: { en: 'Gear and Weapons', es: 'Equipo y Armas' },
  worldProps: { en: 'World Props', es: 'Props de Escena' },
  vehicles: { en: 'Vehicles', es: 'Vehiculos' },
  generalProps: { en: 'Other Props', es: 'Otros Props' },

  fruit: { en: 'Fruit', es: 'Fruta' },
  bakerySweets: { en: 'Bakery and Sweets', es: 'Panaderia y Dulces' },
  savoryMeals: { en: 'Meals and Savory', es: 'Platos y Salado' },

  consoles: { en: 'Consoles', es: 'Consolas' },
  controllers: { en: 'Controllers', es: 'Mandos' },
  handhelds: { en: 'Handhelds', es: 'Portatiles' },
  mediaAccessories: { en: 'Media and Accessories', es: 'Soportes y Accesorios' },

  combatEffects: { en: 'Combat FX', es: 'FX de Combate' },
  elementalEffects: { en: 'Elemental FX', es: 'FX Elementales' },
  magicEffects: { en: 'Magic and Energy', es: 'Magia y Energia' },
  trailsBursts: { en: 'Trails and Bursts', es: 'Estelas y Rafagas' },

  heroesNpcs: { en: 'Heroes and NPCs', es: 'Heroes y NPCs' },
  animalsCompanions: { en: 'Animals and Companions', es: 'Animales y Companeros' },
  characterModels: { en: 'Character Models', es: 'Modelos CM' },
  referencesStudies: { en: 'References and Studies', es: 'Referencias y Estudios' },
  molds: { en: 'Molds and Bases', es: 'Moldes y Bases' },
  retroCast: { en: 'Retro Styled', es: 'Estilo Retro' },
  generalCharacters: { en: 'Other Characters', es: 'Otros Personajes' },

  undeadSpirits: { en: 'Undead and Spirits', es: 'No Muertos y Espiritus' },
  beastsCritters: { en: 'Beasts and Critters', es: 'Bestias y Bichos' },
  oddities: { en: 'Oddities', es: 'Rarezas' },
  generalMonsters: { en: 'Other Monsters', es: 'Otros Monstruos' },

  psxCollection: { en: 'PSX Collection', es: 'Coleccion PSX' },
  n64Collection: { en: 'N64 Collection', es: 'Coleccion N64' },
  general: { en: 'General', es: 'General' },
};

const SUBSECTION_ORDER = {
  Mobiliario: ['seating', 'surfaces', 'storage', 'rest', 'generalFurniture'],
  Naturaleza: ['modularRivers', 'waterLandmarks', 'cavesLandmarks', 'plants', 'mushrooms', 'rocksCrystals', 'woodland', 'generalNature'],
  Arquitectura: ['modularWalls', 'modularHouses', 'modularRoads', 'buildingParts', 'levelTraversal', 'buildings', 'towersLandmarks', 'outdoorStructures', 'generalArchitecture'],
  Props: ['pickupsRewards', 'containers', 'switchesTraps', 'gearWeapons', 'worldProps', 'vehicles', 'generalProps'],
  Comida: ['fruit', 'bakerySweets', 'savoryMeals'],
  Videojuegos: ['consoles', 'controllers', 'handhelds', 'mediaAccessories'],
  Efectos: ['combatEffects', 'elementalEffects', 'magicEffects', 'trailsBursts'],
  Personajes: ['heroesNpcs', 'animalsCompanions', 'characterModels', 'referencesStudies', 'molds', 'retroCast', 'generalCharacters'],
  Monstruos: ['undeadSpirits', 'beastsCritters', 'oddities', 'generalMonsters'],
  PSX: ['characterModels', 'referencesStudies', 'molds', 'psxCollection'],
  N64: ['characterModels', 'referencesStudies', 'molds', 'n64Collection'],
};

function localizeLabel(labels, fallback = '') {
  if (!labels) return fallback;
  const lang = getLang();
  return labels[lang] || labels.en || fallback;
}

function getCategoryLabel(category) {
  return CATEGORY_I18N[category]
    ? t(CATEGORY_I18N[category])
    : localizeLabel(CATEGORY_LABELS[category], category);
}

function getTemplateLabel(template) {
  return TEMPLATE_I18N[template.id] ? t(TEMPLATE_I18N[template.id]) : template.name;
}

function hasToken(id, tokens) {
  return tokens.some((token) => id.includes(token));
}

function getTemplateSubsection(category, template) {
  const id = String(template?.id || '').toLowerCase();

  switch (category) {
    case 'Mobiliario':
      if (hasToken(id, ['chair', 'bench', 'stool'])) return 'seating';
      if (hasToken(id, ['table', 'desk', 'altar'])) return 'surfaces';
      if (hasToken(id, ['bookshelf', 'cabinet'])) return 'storage';
      if (hasToken(id, ['bed'])) return 'rest';
      return 'generalFurniture';

    case 'Naturaleza':
      if (hasToken(id, ['river_segment'])) return 'modularRivers';
      if (hasToken(id, ['waterfall'])) return 'waterLandmarks';
      if (hasToken(id, ['cave_entrance', 'cliff'])) return 'cavesLandmarks';
      if (hasToken(id, ['tree', 'palm_tree', 'bush', 'flower', 'cactus'])) return 'plants';
      if (hasToken(id, ['mushroom'])) return 'mushrooms';
      if (hasToken(id, ['rock', 'crystal'])) return 'rocksCrystals';
      if (hasToken(id, ['log', 'stump'])) return 'woodland';
      return 'generalNature';

    case 'Arquitectura':
      if (hasToken(id, ['wall_kit'])) return 'modularWalls';
      if (hasToken(id, ['house_kit'])) return 'modularHouses';
      if (hasToken(id, ['road_segment'])) return 'modularRoads';
      if (hasToken(id, ['door', 'window', 'stairs', 'wall', 'fence', 'column', 'floor_tile', 'archway', 'gate', 'star_door'])) return 'buildingParts';
      if (hasToken(id, ['bridge', 'rotating_bridge', 'floating_platform', 'warp_pipe'])) return 'levelTraversal';
      if (hasToken(id, ['tower', 'guard_tower', 'wizard_tower', 'lighthouse', 'observatory', 'windmill', 'watermill'])) return 'towersLandmarks';
      if (hasToken(id, ['house', 'cottage', 'townhouse', 'shop', 'tavern', 'inn', 'library', 'warehouse', 'blacksmith', 'barn', 'chapel', 'dojo', 'gatehouse', 'manor', 'temple'])) return 'buildings';
      if (hasToken(id, ['well'])) return 'outdoorStructures';
      return 'generalArchitecture';

    case 'Props':
      if (hasToken(id, ['coin', 'red_coin', 'star_pickup', 'key', 'potion', 'treasure_pile', 'checkpoint'])) return 'pickupsRewards';
      if (hasToken(id, ['crate', 'barrel', 'chest', 'breakable_tablet', 'item_box', 'question_block'])) return 'containers';
      if (hasToken(id, ['button', 'pressure_plate', 'lever', 'crystal_switch', 'spike_trap', 'spring_pad', 'bumper'])) return 'switchesTraps';
      if (hasToken(id, ['sword', 'shield', 'bomb', 'cannon'])) return 'gearWeapons';
      if (hasToken(id, ['torch', 'lamp-post', 'signpost', 'ladder', 'campfire', 'portal'])) return 'worldProps';
      if (hasToken(id, ['car_cm'])) return 'vehicles';
      return 'generalProps';

    case 'Comida':
      if (hasToken(id, ['apple', 'banana', 'cherries', 'coconut', 'dragonfruit', 'fig', 'grapes', 'kiwi', 'lemon', 'lime', 'mango', 'orange', 'peach', 'pear', 'pineapple', 'plum', 'pomegranate', 'strawberry', 'watermelon'])) return 'fruit';
      if (hasToken(id, ['bread', 'baguette', 'croissant', 'cupcake', 'donut', 'pancake', 'pretzel', 'ice_cream', 'cheese'])) return 'bakerySweets';
      return 'savoryMeals';

    case 'Videojuegos':
      if (hasToken(id, ['console'])) return 'consoles';
      if (hasToken(id, ['controller', 'remote'])) return 'controllers';
      if (hasToken(id, ['cartridge', 'disc', 'memory_card', 'vmu'])) return 'mediaAccessories';
      if (hasToken(id, ['handheld', '3ds', 'vita', 'psp', 'nintendo_ds', 'game_boy'])) return 'handhelds';
      return 'mediaAccessories';

    case 'Efectos':
      if (hasToken(id, ['slash', 'hit_flash', 'shockwave', 'explosion', 'lightning'])) return 'combatEffects';
      if (hasToken(id, ['fire', 'ice', 'water', 'lava', 'poison', 'snow'])) return 'elementalEffects';
      if (hasToken(id, ['healing', 'magic_shield', 'energy_orb', 'teleport', 'sparkle'])) return 'magicEffects';
      return 'trailsBursts';

    case 'Personajes':
      if (id === 'knight_horse') return 'characterModels';
      if (id === 'chicken_cm') return 'animalsCompanions';
      if (id.includes('_mold')) return 'molds';
      if (id.includes('_reference') || id.includes('_study') || id.includes('voxel_test')) return 'referencesStudies';
      if (id.endsWith('_cm')) return 'characterModels';
      if (hasToken(id, ['cat', 'dog', 'mouse', 'rat', 'squirrel', 'horse'])) return 'animalsCompanions';
      if (id.startsWith('psx_') || id.startsWith('n64_')) return 'retroCast';
      if (hasToken(id, ['hero', 'knight', 'archer', 'mage', 'guard', 'merchant', 'villager', 'bomber', 'sage', 'princess', 'ranger', 'dragoon', 'revenant'])) return 'heroesNpcs';
      return 'generalCharacters';

    case 'Monstruos':
      if (hasToken(id, ['skeleton', 'ghost'])) return 'undeadSpirits';
      if (hasToken(id, ['bat', 'spiked_beetle', 'masked_critter'])) return 'beastsCritters';
      if (hasToken(id, ['slime', 'eye_turret'])) return 'oddities';
      return 'generalMonsters';

    case 'PSX':
      if (id.includes('_mold')) return 'molds';
      if (id.includes('_reference') || id.includes('_study')) return 'referencesStudies';
      if (id.endsWith('_cm')) return 'characterModels';
      return 'psxCollection';

    case 'N64':
      if (id.includes('_mold')) return 'molds';
      if (id.includes('_reference') || id.includes('_study')) return 'referencesStudies';
      if (id.endsWith('_cm')) return 'characterModels';
      return 'n64Collection';

    default:
      return 'general';
  }
}

function sortTemplatesByLabel(templates) {
  return [...templates].sort((a, b) => getTemplateLabel(a).localeCompare(getTemplateLabel(b)));
}

function getSubsectionGroups(category, templates) {
  const groups = new Map();

  templates.forEach((template) => {
    const subsection = getTemplateSubsection(category, template);
    if (!groups.has(subsection)) groups.set(subsection, []);
    groups.get(subsection).push(template);
  });

  const order = SUBSECTION_ORDER[category] || [];
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      if (safeA !== safeB) return safeA - safeB;
      return localizeLabel(SUBSECTION_LABELS[a], a).localeCompare(localizeLabel(SUBSECTION_LABELS[b], b));
    })
    .map(([key, items]) => [key, sortTemplatesByLabel(items)]);
}

export function generateTemplateListUI(container) {
  container.innerHTML = '';
  const categories = getCategories();

  categories.forEach((templates, category) => {
    const section = document.createElement('div');
    section.className = 'mb-3';

    const catLabel = getCategoryLabel(category);
    const header = document.createElement('button');
    header.className = 'w-full text-left text-[#ffcc00] text-xs mb-2 tracking-widest flex justify-between items-center cursor-pointer hover:text-white';
    header.innerHTML = `<span>${catLabel.toUpperCase()} <span class="text-zinc-500 text-[9px]">(${templates.length})</span></span><span class="toggle-arrow">&#9660;</span>`;

    const body = document.createElement('div');
    body.className = 'flex flex-col gap-2';

    getSubsectionGroups(category, templates).forEach(([subsectionKey, subsectionTemplates]) => {
      const subsection = document.createElement('div');
      subsection.className = 'rounded border border-zinc-800 bg-zinc-950/40 p-2';

      const subsectionHeader = document.createElement('div');
      subsectionHeader.className = 'flex items-center justify-between text-[9px] mb-2 uppercase tracking-wide text-[#00d0ff]';
      subsectionHeader.innerHTML = `<span>${localizeLabel(SUBSECTION_LABELS[subsectionKey], subsectionKey)}</span><span class="text-zinc-500">(${subsectionTemplates.length})</span>`;

      const list = document.createElement('div');
      list.className = 'flex flex-col gap-1';

      subsectionTemplates.forEach((tpl) => {
        const label = getTemplateLabel(tpl);
        const btn = document.createElement('button');
        btn.className = 'retro-button bg-zinc-800 hover:bg-[#ffcc00] hover:text-black px-3 py-2 text-left text-xs flex justify-between items-center border border-zinc-700';
        btn.innerHTML = `<span>${label}</span><span class="text-[#ffcc00]">&rarr;</span>`;
        btn.onclick = () => { addTemplate(tpl.id); emit('scene:objects-changed'); };
        list.appendChild(btn);
      });

      subsection.appendChild(subsectionHeader);
      subsection.appendChild(list);
      body.appendChild(subsection);
    });

    header.onclick = () => {
      body.classList.toggle('hidden');
      header.querySelector('.toggle-arrow').innerHTML = body.classList.contains('hidden') ? '&#9654;' : '&#9660;';
    };

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  });
}
