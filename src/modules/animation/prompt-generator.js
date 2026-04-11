// Prompt Generator — builds LLM prompts for creating CharacterModel JSON or Skeleton JSON

import { getAllSkeletons } from './skeleton-registry.js';
import { getProfilesBySkeletonId } from './animation-profiles.js';
import { getSlots, ARCHETYPE_IDS } from './archetype-system.js';

// Compute world positions of all bones from local hierarchy
function computeBoneWorldPositions(bones) {
  const world = {};
  for (const bone of bones) {
    const parent = bone.parent ? world[bone.parent] : [0, 0, 0];
    world[bone.name] = [
      (parent?.[0] ?? 0) + bone.position[0],
      (parent?.[1] ?? 0) + bone.position[1],
      (parent?.[2] ?? 0) + bone.position[2],
    ];
  }
  return world;
}

function fmt(v) {
  return `[${v.map((n) => n.toFixed(2)).join(', ')}]`;
}

// Descriptions for slot roles per archetype
const SLOT_DESCRIPTIONS = {
  HUMANOID: {
    HEAD: 'cabeza, cara, casco/sombrero',
    TORSO: 'torso, pecho, armadura corporal',
    ARM_L: 'brazo izquierdo (upper/lower/hand)',
    ARM_R: 'brazo derecho (upper/lower/hand)',
    LEG_L: 'pierna izquierda (upper/lower/foot)',
    LEG_R: 'pierna derecha (upper/lower/foot)',
    WEAPON_MAIN: 'arma principal (mano derecha)',
    WEAPON_SECONDARY: 'arma/escudo secundario (mano izquierda)',
  },
  BIRD: {
    BODY: 'cuerpo principal',
    HEAD: 'cabeza, pico, cresta',
    WING_L: 'ala izquierda',
    WING_R: 'ala derecha',
    LEG_L: 'pata izquierda',
    LEG_R: 'pata derecha',
    TAIL: 'cola',
  },
  CAR: {
    BODY: 'carrocería principal (chasis, cabina, parabrisas, etc.)',
    WHEEL_FL: 'rueda delantera izquierda',
    WHEEL_FR: 'rueda delantera derecha',
    WHEEL_RL: 'rueda trasera izquierda',
    WHEEL_RR: 'rueda trasera derecha',
  },
};

const TEMPLATE_TYPES = `CUBE (caja), PRISM (cuña/rampa), PLANE (plano fino), CYLINDER (cilindro), CONE (cono), SPHERE (esfera), TORUS (rosco)`;

const FORMAT_SPEC = `{
  "name": "Nombre del personaje",
  "archetype": "<ARCHETYPE>",
  "animationProfile": "<PROFILE_ID>",
  "skeletonId": "<SKELETON_ID>",
  "slots": [
    {
      "slotId": "<SLOT_ID>",
      "pieces": [
        {
          "template": "CUBE",
          "name": "<NOMBRE_UNICO>",
          "size": [ancho, alto, profundidad],
          "offset": [x, y, z],
          "material": "#RRGGBB",
          "rotation": [rx, ry, rz],   // OPCIONAL: rotación en radianes
          "parent": "<NOMBRE_PIEZA_PADRE>",  // OPCIONAL: sub-piezas del mismo slot
          "pivot": [px, py, pz]       // OPCIONAL: punto de pivote en espacio mundo
        }
      ]
    }
  ]
}`;

const PLACEMENT_RULES = `REGLAS DE POSICIONAMIENTO:
1. "offset" = posición MUNDO del centro de la pieza (en unidades Three.js).
   Alinea la pieza principal de cada slot con la posición del bone correspondiente.
2. "size" = [ancho, alto, profundo]. Escala retro: cabeza ~[1.6, 1.6, 1.6], torso ~[2.0, 2.2, 1.2].
3. Sub-piezas dentro de un slot: usa "parent" (nombre de la pieza padre) y "pivot" (posición mundo del pivote de rotación).
4. "name" debe ser ÚNICO en todo el JSON.
5. La pieza principal de un slot lleva el mismo nombre que el slotId (p.ej. slot HEAD → pieza "HEAD").
6. Estilo retro PSX: formas geométricas simples, sin curvas complejas. Prefiere CUBEs.
7. Colores en hex: paleta retro recomendada — pieles (#f5d0b5, #c8845c), metales (#888, #aaa, #556), telas (#4a5, #2a4, #a22).
8. Evita demasiados vértices: radialSegments en CYLINDER/CONE máximo 8.
9. Para armas: coloca offset aproximado a la mano (HAND_R para mano derecha).`;

export function generateCharacterPrompt(skeletonId, profileId, userDescription) {
  const allSkeletons = getAllSkeletons();
  const skeleton = allSkeletons.find((s) => s.id === skeletonId);
  if (!skeleton) return '// Error: esqueleto no encontrado';

  const profiles = getProfilesBySkeletonId(skeletonId);
  const profile = profiles.find((p) => p.id === profileId) || profiles[0];
  const slots = getSlots(skeleton.archetype) || [];
  const worldPos = computeBoneWorldPositions(skeleton.bones);
  const slotDescs = SLOT_DESCRIPTIONS[skeleton.archetype] || {};
  const bindings = skeleton.defaultBindings || {};

  // Build bone positions section
  const bonePosLines = skeleton.bones.map((b) => {
    const wp = worldPos[b.name];
    const indent = b.parent ? '  ' : '';
    return `${indent}${b.name.padEnd(16)} → mundo: ${fmt(wp)}${b.parent ? ` (hijo de ${b.parent})` : ' (raíz)'}`;
  });

  // Build slot info section
  const slotLines = slots.map((slotId) => {
    const boneNames = bindings[slotId] || [];
    const primaryBone = boneNames[0];
    const pos = primaryBone ? worldPos[primaryBone] : null;
    const desc = slotDescs[slotId] || slotId;
    const posStr = pos ? `bone "${primaryBone}" en ${fmt(pos)}` : '(sin bone)';
    return `  ${slotId.padEnd(20)} → ${posStr}\n                          ↳ ${desc}`;
  });

  // Animations list
  const animList = profile
    ? `${profile.id} — animaciones disponibles: ${profile.animations.join(', ')}`
    : '(sin perfil de animación)';

  // Build the full prompt
  return `Eres un diseñador de modelos 3D para videojuegos de estilo retro/PSX (lowpoly, bloques, look N64/PS1).
Tu tarea es crear un CharacterModel en formato JSON según las especificaciones exactas de abajo.

═══════════════════════════════════════════════
DESCRIPCIÓN DEL PERSONAJE
═══════════════════════════════════════════════
${userDescription || '(sin descripción — decide tú el estilo)'}

═══════════════════════════════════════════════
RIG AL QUE SE VINCULARÁ
═══════════════════════════════════════════════
Arquetipo    : ${skeleton.archetype}
Esqueleto    : ${skeleton.id}
Animaciones  : ${animList}

POSICIONES DE BONES EN ESPACIO MUNDO:
${bonePosLines.join('\n')}

═══════════════════════════════════════════════
SLOTS A RELLENAR (uno por sección)
═══════════════════════════════════════════════
${slotLines.join('\n')}

═══════════════════════════════════════════════
FORMATO EXACTO DEL JSON
═══════════════════════════════════════════════
Devuelve ÚNICAMENTE el JSON, sin texto antes ni después, sin bloques markdown.

${FORMAT_SPEC
    .replace('<ARCHETYPE>', skeleton.archetype)
    .replace('<PROFILE_ID>', profile ? profile.id : 'null')
    .replace('<SKELETON_ID>', skeleton.id)
}

Tipos de geometría disponibles: ${TEMPLATE_TYPES}

${PLACEMENT_RULES}

═══════════════════════════════════════════════
CÓMO IMPORTARLO EN LA APP
═══════════════════════════════════════════════
1. En la app, pulsa el botón IMPORT JSON (barra superior o panel izquierdo).
2. Pega el JSON generado en el área de texto y pulsa "IMPORT OBJECT".
3. El modelo aparecerá en la escena ya vinculado al rig "${skeleton.id}".
4. Selecciona el grupo → botón "RIG / ANIMATIONS" en el panel derecho.
5. En el panel de rig verás el mesh a la izquierda y los bones a la derecha.
6. Pulsa cualquier animación para previsualizar.`;
}

// Return all available skeletons for the UI dropdown
export function getPromptSkeletons() {
  return getAllSkeletons().map((s) => ({
    id: s.id,
    archetype: s.archetype,
    label: `${s.id} (${s.archetype})`,
  }));
}

// Return profiles for a given skeleton
export function getPromptProfiles(skeletonId) {
  return getProfilesBySkeletonId(skeletonId).map((p) => ({
    id: p.id,
    label: `${p.id} — ${p.animations.join(', ')}`,
  }));
}

// ─── Skeleton Prompt ────────────────────────────────────────────────────────

// All existing archetypes and their slots for reference
const ARCHETYPE_SLOT_REFERENCE = {
  HUMANOID: ['HEAD', 'TORSO', 'ARM_L', 'ARM_R', 'LEG_L', 'LEG_R', 'WEAPON_MAIN', 'WEAPON_SECONDARY'],
  BIRD:     ['BODY', 'HEAD', 'LEG_L', 'LEG_R', 'WING_L', 'WING_R', 'TAIL'],
  CAR:      ['BODY', 'WHEEL_FL', 'WHEEL_FR', 'WHEEL_RL', 'WHEEL_RR'],
  PROP:     ['BODY'],
};

const SKELETON_FORMAT_SPEC = `{
  "id": "NOMBRE_EN_MAYUSCULAS",
  "archetype": "<ARCHETYPE_ID>",
  "bones": [
    { "name": "ROOT",  "parent": null,   "position": [0, 0, 0] },
    { "name": "SPINE", "parent": "ROOT", "position": [0, 2.85, 0] },
    ...más bones...
  ],
  "defaultBindings": {
    "<SLOT_ID>": ["<BONE_PRIMARIO>", "<BONE_SECUNDARIO_OPCIONAL>"],
    ...un entry por cada slot del arquetipo...
  },
  "animations": [
    {
      "name": "idle",
      "duration": 2.0,
      "loop": true,
      "tracks": [
        {
          "target": "<BONE_NAME>",
          "property": "rotation",
          "interpolation": "smooth",
          "keyframes": [
            { "time": 0,   "value": [0, 0, 0] },
            { "time": 1.0, "value": [0.05, 0.1, 0] },
            { "time": 2.0, "value": [0, 0, 0] }
          ]
        }
      ]
    }
  ]
}`;

const SKELETON_RULES = `REGLAS DE DISEÑO DEL ESQUELETO:
1. ROOT siempre en posición [0, 0, 0], parent: null.
2. "position" de cada bone = LOCAL respecto a su parent (NO posición mundo).
3. Escala: un humanoide mide ~6 unidades de alto total. Eje Y = arriba, Z = adelante.
4. Convenciones de nombre: sufijos _L/_R para izquierda/derecha, _UPPER/_LOWER para articulaciones.
   Ejemplos: ARM_L_UPPER, ARM_L_LOWER, HAND_L, LEG_R_UPPER, LEG_R_LOWER, FOOT_R.
5. "defaultBindings": cada SLOT_ID del arquetipo debe aparecer con al menos 1 bone.
   El primer bone de la lista es el "primario" (donde se centra la pieza geométrica).
6. ANIMACIONES — tracks:
   - "rotation": radianes [rx, ry, rz] (Euler XYZ).
   - "position": unidades Three.js [x, y, z] (igual que la posición del bone en reposo).
   - "scale": factor [sx, sy, sz] (1 = sin escalar).
   - "interpolation": "smooth" para movimiento orgánico, "linear" para mecánico.
   - En animaciones loop=true: primer y último keyframe DEBEN coincidir en valor.
7. Incluir SIEMPRE al menos la animación "idle" (loop: true).
8. Las animaciones recomendadas según arquetipo:
   - HUMANOID: idle, walk, run, attack, hurt, die
   - BIRD: idle, walk, fly
   - CAR: idle, accelerate
   - PROP: idle (opcional, puede ser vacío)
9. Si el arquetipo es NUEVO (no HUMANOID/BIRD/CAR/PROP), elige slots descriptivos
   para las partes móviles independientes del personaje.`;

const SKELETON_INSTALL_INSTRUCTIONS = `═══════════════════════════════════════════════
CÓMO INSTALARLO EN LA APP
═══════════════════════════════════════════════
1. Guarda el JSON en: src/data/skeletons/<nombre_archivo>.json
2. Si el arquetipo es NUEVO (no existe), añade también:
   a) En src/modules/archetype-system.js → ARCHETYPE_SLOTS:
      NOMBRE_ARQUETIPO: ['SLOT1', 'SLOT2', ...],
   b) Crea src/data/animation-profiles/<nombre_perfil>.json:
      { "id": "PERFIL_ID", "skeletonId": "ID_DEL_ESQUELETO", "animations": ["idle", "walk", ...] }
3. Haz rebuild del proyecto (npm run build / vite).
   El skeleton-registry lo detectará automáticamente por glob pattern.
4. En la app, ve a la sección ARQUETIPOS (panel izquierdo) para previsualizarlo.`;

export function generateSkeletonPrompt(archetypeId, isNewArchetype, newArchetypeName, userDescription) {
  const effectiveArchetype = isNewArchetype ? (newArchetypeName || 'NUEVO_ARQUETIPO').toUpperCase() : archetypeId;
  const existingSlots = isNewArchetype ? null : ARCHETYPE_SLOT_REFERENCE[archetypeId];

  // Reference existing archetypes
  const archetypeRefLines = Object.entries(ARCHETYPE_SLOT_REFERENCE).map(
    ([id, slots]) => `  ${id.padEnd(12)} slots: [${slots.join(', ')}]`
  );

  // Show existing skeleton IDs for reference
  const existingSkels = getAllSkeletons()
    .filter((s) => !isNewArchetype && s.archetype === archetypeId)
    .map((s) => `  ${s.id} — ${s.bones.length} bones`);

  const slotSection = isNewArchetype
    ? `Arquetipo NUEVO: "${effectiveArchetype}"
Elige los slots que mejor representen las partes móviles independientes del personaje.
Inspírate en los arquetipos existentes para la convención de nombres.`
    : `Arquetipo    : ${effectiveArchetype}
Slots a cubrir: [${existingSlots.join(', ')}]
${existingSkels.length ? `Esqueletos existentes para referencia:\n${existingSkels.join('\n')}` : ''}`;

  return `Eres un diseñador de rigs 3D para videojuegos de estilo retro/PSX.
Tu tarea es crear un Skeleton JSON completo para la aplicación Retrovisor 3D.
El skeleton define los huesos (bones), su jerarquía, los bindings a slots, y las animaciones.

═══════════════════════════════════════════════
DESCRIPCIÓN DEL PERSONAJE / CRIATURA / OBJETO
═══════════════════════════════════════════════
${userDescription || '(sin descripción — decide tú el tipo de criatura o personaje)'}

═══════════════════════════════════════════════
ARQUETIPO Y SLOTS
═══════════════════════════════════════════════
${slotSection}

ARQUETIPOS EXISTENTES EN EL SISTEMA (referencia):
${archetypeRefLines.join('\n')}

═══════════════════════════════════════════════
FORMATO EXACTO DEL JSON
═══════════════════════════════════════════════
Devuelve ÚNICAMENTE el JSON, sin texto antes ni después, sin bloques markdown.

${SKELETON_FORMAT_SPEC
    .replace('<ARCHETYPE_ID>', effectiveArchetype)
}

${SKELETON_RULES}

${SKELETON_INSTALL_INSTRUCTIONS}`;
}

export function getArchetypeOptions() {
  return ARCHETYPE_IDS.map((id) => ({
    id,
    label: `${id} — slots: [${(ARCHETYPE_SLOT_REFERENCE[id] || []).join(', ')}]`,
  }));
}
