const STORAGE_KEY = 'lowpoly64-lang';

const templateFileExample = `{
  "id": "hero",
  "name": "Heroe",
  "category": "Personajes",
  "pieces": [
    {
      "name": "HEAD",
      "geometry": { "type": "sphere", "params": { "radius": 1, "widthSegments": 8, "heightSegments": 6 } },
      "color": "#ffddaa",
      "position": [0, 5, 0]
    },
    {
      "name": "TORSO",
      "geometry": { "type": "cube", "params": { "width": 1.8, "height": 2.5, "depth": 1.2 } },
      "color": "#cc3333",
      "position": [0, 2.8, 0]
    }
  ],
  "animations": [
    {
      "name": "idle",
      "duration": 1.6,
      "loop": true,
      "tracks": [
        {
          "target": "TORSO",
          "property": "position",
          "keyframes": [
            { "time": 0, "value": [0, 0, 0] },
            { "time": 0.8, "value": [0, 0.06, 0] },
            { "time": 1.6, "value": [0, 0, 0] }
          ]
        }
      ]
    }
  ]
}`;

const objectExample = `{
  "name": "RETRO CHEST",
  "pieces": [
    {
      "name": "BODY",
      "geometry": { "type": "cube", "params": { "width": 3, "height": 2, "depth": 2 } },
      "color": "#8b5a2b",
      "position": [0, 1, 0]
    },
    {
      "name": "LID",
      "geometry": { "type": "cube", "params": { "width": 3.2, "height": 0.8, "depth": 2.2 } },
      "color": "#b87333",
      "position": [0, 2.1, 0],
      "pivot": [0, 1.8, -1],
      "parent": "BODY"
    },
    {
      "name": "LOCK",
      "geometry": { "type": "cube", "params": { "width": 0.4, "height": 0.6, "depth": 0.2 } },
      "color": "#ffcc00",
      "position": [0, 1.1, 1.1]
    }
  ]
}`;

const animationExample = `{
  "name": "open_lid",
  "duration": 1.2,
  "loop": false,
  "tracks": [
    {
      "target": "LID",
      "property": "rotation",
      "keyframes": [
        { "time": 0, "value": [0, 0, 0] },
        { "time": 1.2, "value": [-1.2, 0, 0] }
      ]
    }
  ]
}`;

const objectPromptLight = `You generate importable LowPoly64 object JSON in PS1/N64 retro style.

Return ONLY valid JSON. No markdown. No explanations.

Create a low-poly retro object with:
- root format: { "name": string, "pieces": [...] }
- 10 to 40 pieces (more pieces = more detail, use 30-80 for characters)
- unique piece names (BODY, HEAD, ARM_L, LEG_R, etc.)
- geometry types: cube, sphere, cylinder, cone, plane, capsule, torus, wedge, pyramid, custom
- low segments (4-8 radial, 3-6 sphere) for authentic PS1 look
- use "faceColors" for per-face coloring: ["#hex", ...] array (one color per triangle, distributed evenly)
- use "vertexColors" for gradients: { "top": "#hex", "bottom": "#hex" } on large surfaces for PS1 volume shading
- use "opacity" (0-1) for glass, ghosts, energy effects
- use "pivot" for joints/hinges, "parent" for hierarchy (limbs parented to body)
- use wedge for roofs, ramps, angular shapes; pyramid for spikes, gems
- strong color blocking: distinct saturated colors per functional part
- no textures, flat hex colors only

Description:`;

const objectPromptFull = `You generate production-ready LowPoly64 JSON for PS1/N64-style retro game assets.

Return ONLY valid JSON. No markdown fences. No explanations.

Target format:
- Import object: { "name": string, "pieces": [...], "animations"?: [...] }
- Template file: { "id": string, "name": string, "category": string, "pieces": [...], "animations"?: [...] }

=== PS1/N64 STYLE GUIDE ===
- Target aesthetic: Final Fantasy VII, Mario 64, Crash Bandicoot — chunky geometry, strong silhouettes, saturated colors
- Use 20-80 pieces for characters, 10-40 for props, 40-100 for vehicles/buildings
- LOW polygon counts: spheres 6-8 segments, cylinders 6-8 radial, cones 6-8
- Exaggerated proportions: big heads, big hands, stubby limbs (chibi for characters)
- Strong color blocking: each functional part gets a distinct saturated hex color
- NO smooth gradients, NO realistic proportions, NO high-poly details

=== GEOMETRY TYPES ===
cube, sphere, cylinder, cone, plane, capsule, torus, wedge, pyramid, custom
- wedge: ramps, roofs, angular armor, shoe soles, cockpits
- pyramid: spikes, gems, crystal formations, pointed hats
- custom: { vertices: [[x,y,z],...], faces: [[i,j,k],...] } for unique shapes (max 512 verts, 1024 faces)
- torus: rings, donuts, halos, bangles (use low segments: radial 4, tubular 8)

=== COLOR TECHNIQUES ===
- "color": "#hex" — base flat color per piece (required)
- "faceColors": ["#hex", ...] — per-triangle coloring. Colors distribute evenly across triangles.
  Example: cube has 12 triangles, 6 colors = 2 triangles each. Great for multicolored faces, patterns, gradients on geometry.
- "vertexColors": { "top": "#lighter", "bottom": "#darker" } — Y-axis gradient for PS1-style volume shading.
  Use on torso, head, limbs, large props. Adds depth without extra pieces.
- "vertexColors": ["#hex", ...] — per-vertex array for complex coloring.
- "opacity": 0.0-1.0 — for glass, ghosts, energy shields, water, particles.

=== HIERARCHY & ANIMATION ===
- Every piece MUST have a unique stable name (BODY, HEAD, ARM_L, ARM_R, LEG_L, LEG_R, HAND_L, etc.)
- Use "pivot" for joints: shoulder joints, knee joints, hip joints, hinges, lids
- Use "parent" to create skeleton: arms parent to body, hands parent to arms, etc.
- Max nesting depth: 8 levels
- Characters/enemies/animals MUST include animations: idle, walk, attack minimum
- Animation targets must match piece names EXACTLY

Animation rules:
- Duration: 0.5-2s for actions, 2-4s for idle loops
- rotation values are Euler radians [rx, ry, rz]
- Use anticipation (wind-up), contact, and settle for quality motion
- Keep feet/hinges/handles believable relative to pivots

=== QUALITY CHECKLIST ===
- Strong readable silhouette at small sizes
- Clean parent-child hierarchy with stable pivot points
- Saturated color palette with clear part separation
- Centered around origin, coherent scale
- Importable without manual fixes
- Animations included for animated assets

Create the JSON for this asset:`;

const animationPromptLight = `You generate importable LowPoly64 animation JSON.

Return ONLY valid JSON. No markdown. No explanations.

Format:
{
  "name": string,
  "duration": number,
  "loop": boolean,
  "tracks": [...]
}

Rules:
- target must match existing piece names exactly
- property must be position, rotation, scale or visible
- rotation values are radians [rx, ry, rz]
- keep the clip short and readable
- use few tracks and few keyframes

Object and intent:`;

const animationPromptFull = `You generate production-ready LowPoly64 animation JSON for an existing object.

Return ONLY valid JSON. No markdown fences. No explanations.

Format:
{
  "name": string,
  "duration": number,
  "loop": boolean,
  "tracks": [
    {
      "target": "EXISTING_PIECE_NAME",
      "property": "position" | "rotation" | "scale" | "visible",
      "keyframes": [
        { "time": number, "value": [...] }
      ]
    }
  ]
}

Rules:
- target names must match existing piece names exactly
- duration must stay within the real action
- visible uses [1] or [0]
- position and scale use 3 numbers
- rotation uses radians [rx, ry, rz]
- keep track count efficient
- use anticipation, contact and settle where appropriate
- do not animate every piece unless needed
- keep feet, hinges and handles believable relative to pivots
- for idle loops, use subtle offsets
- for attacks or interactions, prioritize silhouette and readability
- for NPCs, prefer calm loops like idle, walk, talk, wave, sit
- for enemies, prefer idle, patrol or walk, attack, hurt, die

Create the animation for this object and intent:`;

const content = {
  en: {
    langButton: 'EN',
    copy: 'Copy',
    copied: 'Copied',
    backToEditor: 'Back To Editor',
    heroTitle: 'Build higher-quality JSON and animation packs',
    heroLead: 'This help page documents the real file formats used by LowPoly64, how templates are stored on disk, when animations are required, and how to prompt external LLMs without losing important motion data.',
    introTitle: 'What this app is',
    introLead: 'LowPoly64 is a retro 3D editor for building low-poly objects, character pieces and simple animations with JSON-first workflows.',
    tocWorkflow: 'Workflow',
    tocAiTextures: 'AI textures',
    tocTemplateFiles: 'Template files',
    tocObjectJson: 'Object JSON',
    tocAnimationJson: 'Animation JSON',
    tocPrompts: 'Prompt packs',
    tocCreation: 'Ways to create JSON',
    tocQuality: 'Quality checklist',
    workflowTitle: 'Workflow',
    workflowCreateTitle: '1. Choose the source',
    workflowEditTitle: '2. Build clean structure',
    workflowAnimateTitle: '3. Add or preserve motion',
    workflowExportTitle: '4. Save the right output',
    workflowCreate: [
      'Use primitives for blockout, template files for reusable library assets, and import JSON for one-off generation.',
      'A template file on disk is not the same as a minimal import object: templates also include id and category.',
      'If you are replacing a character or any animated asset, preserve or recreate its animations instead of stripping them.',
    ],
    workflowEdit: [
      'Keep piece names unique and stable because animations bind to those exact names.',
      'Use pivots for hinges, limbs, lids, levers and rotating traps.',
      'Use hierarchy only when a parent-child relationship is intentional and reusable.',
    ],
    workflowAnimate: [
      'Characters, enemies, animals and moving interactables should usually keep animations in the template file.',
      'Simple props like barrels or rocks normally do not need animations.',
      'Import object first, then import extra animation JSON only when the object already exists as a selected group.',
    ],
    workflowExport: [
      'Use template JSON files for your library.',
      'Use import JSON to quickly bring in generated objects.',
      'Use exported scene or group JSON when you want an editable backup of a result made inside the editor.',
    ],
    aiTexturesTitle: 'AI textures',
    aiTexturesLead: 'Use the AI texture modal when you want to generate a base sprite, branch variations from it, and save the whole strip as a reusable PNG.',
    aiTexturesBaseTitle: 'Base and variations',
    aiTexturesBase: [
      'Generate a texture or paint/import one manually. The current canvas is always the BASE tile of the strip.',
      'Select BASE or any variation tile, write a prompt, and generate a new variation from that selected source.',
      'Use - REMOVE on a selected variation to delete it from the strip. The base tile is not removable because it comes from the current canvas.',
    ],
    aiTexturesExportTitle: 'Apply and export',
    aiTexturesExport: [
      'APPLY builds one horizontal sprite strip texture and applies it to the selected mesh.',
      'EXPORT PNG saves that same horizontal strip as a single image file so you can use it elsewhere immediately.',
      'If you repaint or replace the canvas, the BASE tile updates automatically and future exports include that updated base.',
    ],
    templateFilesTitle: 'Template files on disk',
    templateFilesLead: 'Reusable library assets now live as one JSON file per asset under src/data/templates. Adding or replacing a file is the preferred long-term workflow.',
    templateFilesNote: 'Template files are auto-discovered on next load. A new .json file inside src/data/templates/** is picked up automatically if it contains id, name, category and pieces.',
    templateFilesPathsTitle: 'Folders',
    templateFilesPaths: [
      'src/data/templates/furniture',
      'src/data/templates/nature',
      'src/data/templates/architecture',
      'src/data/templates/props',
      'src/data/templates/characters',
    ],
    templateFilesRulesTitle: 'Rules',
    templateFilesRules: [
      'Template file format: id, name, category, pieces, optional animations.',
      'Import object format: name, pieces, optional animations.',
      'For animated templates, keep the animations array in the same file unless you have a deliberate reason to split the workflow.',
      'Categories currently shown in the UI are Mobiliario, Naturaleza, Arquitectura, Props and Personajes.',
    ],
    templateExampleTitle: 'Template file example',
    objectJsonTitle: 'Object JSON',
    objectJsonLead: 'Import object JSON is the minimal format for bringing a model into the editor. It does not need id or category unless you are saving it as a reusable template file.',
    objectJsonNote: 'Best practice: design piece names first. If names change later, animation tracks targeting the old names will stop working.',
    objectFieldsTitle: 'Important fields',
    objectFields: [
      '"name": object name shown in the editor.',
      '"pieces": visible parts of the object.',
      '"geometry": type plus params for each piece.',
      '"position": required transform anchor for the piece.',
      '"rotation", "scale", "pivot", "parent": optional but critical for good motion rigs.',
      '"vertexColors": optional PS1-style vertex shading. Gradient: { "top": "#hex", "bottom": "#hex" }. Per-vertex: ["#hex", ...] array matching vertex count.',
      '"faceColors": optional per-triangle coloring. Array of hex colors ["#ff0000", "#00ff00", ...] distributed evenly across triangles. Great for multicolored faces.',
      '"opacity": optional, 0.0 to 1.0 (default 1). Enables transparency for glass, ghosts, energy effects. Exported to GLB.',
      '"animations": optional on import objects, but recommended when the asset is inherently animated.',
    ],
    objectTypesTitle: 'Supported geometry types',
    objectTypes: ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule', 'torus', 'wedge', 'pyramid', 'custom'],
    objectLimitsTitle: 'Validation limits',
    objectLimits: [
      'Max 400 pieces per imported object.',
      'Max nesting depth 8 for parent chains.',
      'Names are normalized and capped to 80 characters.',
      'Geometry segments are capped to 64.',
      'Absolute scale is capped to 100.',
    ],
    objectExampleTitle: 'Import object example',
    animationJsonTitle: 'Animation JSON',
    animationJsonLead: 'Animation JSON targets piece names that already exist inside the selected group. The importer validates duration, track count, keyframes and target properties.',
    animationJsonWarning: 'If target names do not match existing piece names exactly, those tracks are skipped. This is the main reason animations appear to vanish.',
    animationFieldsTitle: 'Important fields',
    animationFields: [
      '"name": clip name shown in the editor.',
      '"duration": total clip length in seconds.',
      '"loop": repeat for idle or patrol loops, false for one-shot actions.',
      '"tracks": one or more property tracks.',
      '"target": exact existing piece name.',
      '"property": position, rotation, scale or visible.',
    ],
    animationLimitsTitle: 'Validation limits',
    animationLimits: [
      'Max 64 tracks per animation.',
      'Max 240 keyframes per track.',
      'Max duration 600 seconds.',
      'visible uses [1] or [0].',
      'rotation values are Euler radians.',
    ],
    animationFlowTitle: 'Import flow',
    animationFlow: [
      'Create or import the object first.',
      'Select the root group, not a loose child piece.',
      'Import a single animation JSON with tracks or a wrapper object with an animations array.',
      'Play the result in the timeline before treating it as final.',
    ],
    animationExampleTitle: 'Animation example',
    promptsTitle: 'Prompt packs for LLMs',
    promptsLead: 'Use the light prompts for fast drafts. Use the full prompts for production assets, reusable templates and any character or gameplay object where motion quality matters.',
    objectPromptLightTitle: 'Light object prompt',
    objectPromptFullTitle: 'Full object prompt',
    animationPromptLightTitle: 'Light animation prompt',
    animationPromptFullTitle: 'Full animation prompt',
    creationTitle: 'Ways to create JSON',
    creationLead: 'There is no single best path. Choose the workflow that loses the least information for the asset type you are building.',
    creationMethodsTitle: 'Practical options',
    creationMethods: [
      'Write JSON by hand when you want exact control over names, pivots and hierarchy.',
      'Duplicate an existing template file and replace only what changes when the new asset is a close variant.',
      'Build inside the editor, then export JSON and use that as the editable base.',
      'Ask an LLM for object JSON first, import it, fix structure, then ask for animation JSON against the final piece names.',
      'Ask an LLM for a full template file when you already know the id, category and whether animations must ship in the file.',
      'Keep object generation and animation generation as separate prompts when you want the highest quality and least breakage.',
    ],
    creationSequenceTitle: 'Recommended sequence for highest quality',
    creationSequence: [
      'Decide whether the asset is static or animated before generating anything.',
      'Define the reusable piece names and pivot plan first.',
      'Generate or model the object.',
      'Import and fix proportions, names and hierarchy inside the editor.',
      'Generate animations only after the structure is stable.',
      'Store the final reusable result as a template JSON file on disk.',
    ],
    qualityTitle: 'Quality checklist',
    qualityLead: 'Use this checklist when you want JSONs and animations that are good enough to keep, not just good enough to import.',
    qualityObjectTitle: 'Object quality',
    qualityObject: [
      'Readable silhouette from gameplay distance.',
      'Strong color blocking by function.',
      'Stable, semantic piece names.',
      'Reasonable piece count and retro segmentation.',
      'Correct pivots for any part that should rotate.',
    ],
    qualityAnimationTitle: 'Animation quality',
    qualityAnimation: [
      'Only animate the parts that matter.',
      'Use looping idle motion for living or active assets.',
      'Use one-shot clips for attack, hurt, die, open, close or trigger actions.',
      'Keep contact points believable relative to pivots.',
      'Never drop a required animations array from a character template just to simplify the JSON.',
    ],
    footer: 'Rule of thumb: static props can stay object-only. Characters, enemies, animals and moving gameplay assets should usually preserve animations in the final template file.',
    projectLinkLabel: 'Project page',
    projectLinkValue: 'https://github.com/IAnMove/LowPoly64',
  },
  es: {
    langButton: 'ES',
    copy: 'Copiar',
    copied: 'Copiado',
    backToEditor: 'Volver Al Editor',
    heroTitle: 'Crea JSONs y packs de animacion de mas calidad',
    heroLead: 'Esta ayuda documenta el formato real que usa LowPoly64, como se guardan los templates en disco, cuando las animaciones son obligatorias y como pedir a un LLM externo sin perder movimiento importante.',
    introTitle: 'Que es esta app',
    introLead: 'LowPoly64 es un editor 3D retro para crear objetos low-poly, piezas de personajes y animaciones simples con un flujo basado en JSON.',
    tocWorkflow: 'Flujo',
    tocAiTextures: 'Texturas AI',
    tocTemplateFiles: 'Templates en disco',
    tocObjectJson: 'JSON de objetos',
    tocAnimationJson: 'JSON de animaciones',
    tocPrompts: 'Prompts',
    tocCreation: 'Formas de crear JSON',
    tocQuality: 'Checklist de calidad',
    workflowTitle: 'Flujo',
    workflowCreateTitle: '1. Elegir la fuente',
    workflowEditTitle: '2. Construir bien la estructura',
    workflowAnimateTitle: '3. Anadir o preservar movimiento',
    workflowExportTitle: '4. Guardar la salida correcta',
    workflowCreate: [
      'Usa primitivas para blockout, ficheros de template para libreria reutilizable y JSON importable para generacion puntual.',
      'Un template en disco no es igual que un import object minimo: los templates tambien llevan id y category.',
      'Si sustituyes un personaje o cualquier asset animado, preserva o recrea sus animaciones en vez de quitarlas.',
    ],
    workflowEdit: [
      'Mantem los nombres de pieza unicos y estables porque las animaciones se enlazan a esos nombres exactos.',
      'Usa pivot para bisagras, extremidades, tapas, palancas y trampas rotatorias.',
      'Usa jerarquia solo cuando la relacion padre-hijo sea intencional y reutilizable.',
    ],
    workflowAnimate: [
      'Personajes, enemigos, animales e interactuables con movimiento suelen necesitar animaciones dentro del template final.',
      'Props simples como barriles o rocas normalmente no necesitan animacion.',
      'Importa primero el objeto y despues animaciones extra solo cuando el objeto ya existe como grupo seleccionado.',
    ],
    workflowExport: [
      'Usa ficheros template JSON para tu libreria.',
      'Usa import JSON para traer objetos generados rapidamente.',
      'Usa el JSON exportado de escena o grupo cuando quieras un backup editable de algo construido dentro del editor.',
    ],
    aiTexturesTitle: 'Texturas AI',
    aiTexturesLead: 'Usa el modal de AI texture cuando quieras generar un sprite base, sacar variaciones a partir de ese tile y guardar el strip completo como un PNG reutilizable.',
    aiTexturesBaseTitle: 'Base y variaciones',
    aiTexturesBase: [
      'Genera una textura o pintala/importala a mano. El canvas actual siempre es el tile BASE del strip.',
      'Selecciona BASE o cualquier variacion, escribe un prompt y genera una nueva variacion a partir de ese origen.',
      'Usa - REMOVE sobre una variacion seleccionada para borrarla del strip. El tile base no se borra porque sale del canvas actual.',
    ],
    aiTexturesExportTitle: 'Aplicar y exportar',
    aiTexturesExport: [
      'APPLY construye una textura horizontal con todo el sprite strip y la aplica al mesh seleccionado.',
      'EXPORT PNG guarda ese mismo strip horizontal como una sola imagen para usarlo fuera del editor inmediatamente.',
      'Si repintas o sustituyes el canvas, el tile BASE se actualiza solo y los siguientes exports incluyen esa base nueva.',
    ],
    templateFilesTitle: 'Templates en disco',
    templateFilesLead: 'Los assets reutilizables viven ahora como un JSON por asset dentro de src/data/templates. Anadir o sustituir un fichero es el flujo preferido a largo plazo.',
    templateFilesNote: 'Los templates se detectan automaticamente en la siguiente carga. Un .json nuevo dentro de src/data/templates/** se recoge solo si contiene id, name, category y pieces.',
    templateFilesPathsTitle: 'Carpetas',
    templateFilesPaths: [
      'src/data/templates/furniture',
      'src/data/templates/nature',
      'src/data/templates/architecture',
      'src/data/templates/props',
      'src/data/templates/characters',
    ],
    templateFilesRulesTitle: 'Reglas',
    templateFilesRules: [
      'Formato de template: id, name, category, pieces y animations opcional.',
      'Formato de import object: name, pieces y animations opcional.',
      'En templates animados, mantem el array animations en el mismo fichero salvo que tengas un motivo claro para separar el flujo.',
      'Las categorias que muestra ahora la UI son Mobiliario, Naturaleza, Arquitectura, Props y Personajes.',
    ],
    templateExampleTitle: 'Ejemplo de fichero template',
    objectJsonTitle: 'JSON de objetos',
    objectJsonLead: 'El import object JSON es el formato minimo para meter un modelo en el editor. No necesita id ni category salvo que quieras guardarlo como template reutilizable.',
    objectJsonNote: 'Mejor practica: diseña primero los nombres de pieza. Si luego cambian, los tracks que apuntaban a los nombres viejos dejaran de funcionar.',
    objectFieldsTitle: 'Campos importantes',
    objectFields: [
      '"name": nombre del objeto mostrado en el editor.',
      '"pieces": partes visibles del objeto.',
      '"geometry": tipo y params de cada pieza.',
      '"position": ancla de transformacion requerida para cada pieza.',
      '"rotation", "scale", "pivot" y "parent": opcionales, pero criticos para rigs y movimiento buenos.',
      '"vertexColors": sombreado estilo PS1 opcional. Gradiente: { "top": "#hex", "bottom": "#hex" }. Por vertice: ["#hex", ...] array con tantos colores como vertices.',
      '"faceColors": coloración por triángulo opcional. Array de colores hex ["#ff0000", "#00ff00", ...] distribuidos entre los triángulos de la geometría.',
      '"opacity": opcional, 0.0 a 1.0 (por defecto 1). Habilita transparencia para cristal, fantasmas, efectos de energia. Se exporta a GLB.',
      '"animations": opcional en import objects, pero recomendable cuando el asset es inherentemente animado.',
    ],
    objectTypesTitle: 'Geometrias soportadas',
    objectTypes: ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule', 'torus', 'wedge', 'pyramid', 'custom'],
    objectLimitsTitle: 'Limites de validacion',
    objectLimits: [
      'Maximo 400 piezas por objeto importado.',
      'Profundidad maxima de jerarquia 8.',
      'Los nombres se normalizan y se limitan a 80 caracteres.',
      'Los segmentos de geometria se limitan a 64.',
      'La escala absoluta se limita a 100.',
    ],
    objectExampleTitle: 'Ejemplo de import object',
    animationJsonTitle: 'JSON de animaciones',
    animationJsonLead: 'El JSON de animacion apunta a nombres de pieza que ya existen dentro del grupo seleccionado. El importador valida duracion, tracks, keyframes y propiedades.',
    animationJsonWarning: 'Si los target no coinciden exactamente con las piezas existentes, esos tracks se saltan. Esta es la causa principal de que una animacion parezca desaparecer.',
    animationFieldsTitle: 'Campos importantes',
    animationFields: [
      '"name": nombre del clip mostrado en el editor.',
      '"duration": duracion total del clip en segundos.',
      '"loop": true para idle o patrol, false para acciones de una sola vez.',
      '"tracks": uno o varios tracks de propiedad.',
      '"target": nombre exacto de una pieza existente.',
      '"property": position, rotation, scale o visible.',
    ],
    animationLimitsTitle: 'Limites de validacion',
    animationLimits: [
      'Maximo 64 tracks por animacion.',
      'Maximo 240 keyframes por track.',
      'Duracion maxima 600 segundos.',
      'visible usa [1] o [0].',
      'rotation usa radianes Euler.',
    ],
    animationFlowTitle: 'Flujo de importacion',
    animationFlow: [
      'Crea o importa primero el objeto.',
      'Selecciona el grupo raiz, no una pieza hija suelta.',
      'Importa un JSON de una animacion con tracks o un wrapper con animations.',
      'Reproduce el resultado en la timeline antes de darlo por bueno.',
    ],
    animationExampleTitle: 'Ejemplo de animacion',
    promptsTitle: 'Prompts para LLMs',
    promptsLead: 'Usa los prompts ligeros para borradores rapidos. Usa los completos para assets de produccion, templates reutilizables y cualquier personaje u objeto jugable donde la calidad del movimiento importe.',
    objectPromptLightTitle: 'Prompt ligero de objeto',
    objectPromptFullTitle: 'Prompt completo de objeto',
    animationPromptLightTitle: 'Prompt ligero de animacion',
    animationPromptFullTitle: 'Prompt completo de animacion',
    creationTitle: 'Formas de crear JSON',
    creationLead: 'No hay un unico camino bueno. Elige el flujo que pierda menos informacion para el tipo de asset que estas construyendo.',
    creationMethodsTitle: 'Opciones practicas',
    creationMethods: [
      'Escribir JSON a mano cuando quieras control exacto de nombres, pivots y jerarquia.',
      'Duplicar un template existente y cambiar solo lo necesario cuando el asset nuevo sea una variante cercana.',
      'Construir dentro del editor y luego exportar JSON para usarlo como base editable.',
      'Pedir a un LLM primero el object JSON, importarlo, arreglar estructura y despues pedir la animacion contra los nombres definitivos.',
      'Pedir a un LLM un template completo cuando ya conoces el id, la category y si las animaciones deben viajar dentro del fichero.',
      'Separar generacion de objeto y generacion de animacion cuando quieras la maxima calidad y el minimo de roturas.',
    ],
    creationSequenceTitle: 'Secuencia recomendada para maxima calidad',
    creationSequence: [
      'Decide antes de generar nada si el asset es estatico o animado.',
      'Define primero los nombres reutilizables de pieza y el plan de pivots.',
      'Genera o modela el objeto.',
      'Importa y corrige proporciones, nombres y jerarquia dentro del editor.',
      'Genera las animaciones solo cuando la estructura ya sea estable.',
      'Guarda el resultado reutilizable final como template JSON en disco.',
    ],
    qualityTitle: 'Checklist de calidad',
    qualityLead: 'Usa esta lista cuando quieras JSONs y animaciones que merezca la pena guardar, no solo que importen sin error.',
    qualityObjectTitle: 'Calidad del objeto',
    qualityObject: [
      'Silueta legible a distancia de gameplay.',
      'Bloqueo de color fuerte por funcion.',
      'Nombres de pieza semanticos y estables.',
      'Numero de piezas y segmentacion retro razonables.',
      'Pivots correctos en cualquier parte que deba rotar.',
    ],
    qualityAnimationTitle: 'Calidad de la animacion',
    qualityAnimation: [
      'Anima solo las partes que importan.',
      'Usa bucles idle para assets vivos o activos.',
      'Usa clips de una sola vez para attack, hurt, die, open, close o trigger.',
      'Mantem creibles los puntos de contacto respecto a sus pivots.',
      'No elimines un array animations requerido en un template de personaje solo por simplificar el JSON.',
    ],
    footer: 'Regla rapida: los props estaticos pueden quedarse sin animacion. Personajes, enemigos, animales y assets de gameplay con movimiento suelen necesitar conservar animations dentro del template final.',
    projectLinkLabel: 'Pagina del proyecto',
    projectLinkValue: 'https://github.com/IAnMove/LowPoly64',
  },
};

function getLang() {
  return localStorage.getItem(STORAGE_KEY) || 'en';
}

function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

function fillList(id, items) {
  const list = document.getElementById(id);
  if (!list) return;
  list.replaceChildren(...items.map((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
}

function fillPills(id, items) {
  const container = document.getElementById(id);
  if (!container) return;
  container.replaceChildren(...items.map((item) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = item;
    return pill;
  }));
}

function render(lang) {
  const copyLabel = content[lang].copy;

  document.documentElement.lang = lang;
  document.querySelectorAll('[data-help]').forEach((el) => {
    const key = el.getAttribute('data-help');
    if (content[lang][key]) {
      el.textContent = content[lang][key];
    }
  });

  fillList('workflow-create-list', content[lang].workflowCreate);
  fillList('workflow-edit-list', content[lang].workflowEdit);
  fillList('workflow-animate-list', content[lang].workflowAnimate);
  fillList('workflow-export-list', content[lang].workflowExport);
  fillList('ai-textures-base-list', content[lang].aiTexturesBase);
  fillList('ai-textures-export-list', content[lang].aiTexturesExport);
  fillList('template-files-paths-list', content[lang].templateFilesPaths);
  fillList('template-files-rules-list', content[lang].templateFilesRules);
  fillList('object-fields-list', content[lang].objectFields);
  fillList('object-limits-list', content[lang].objectLimits);
  fillList('animation-fields-list', content[lang].animationFields);
  fillList('animation-limits-list', content[lang].animationLimits);
  fillList('animation-flow-list', content[lang].animationFlow);
  fillList('creation-methods-list', content[lang].creationMethods);
  fillList('creation-sequence-list', content[lang].creationSequence);
  fillList('quality-object-list', content[lang].qualityObject);
  fillList('quality-animation-list', content[lang].qualityAnimation);
  fillPills('object-types-pills', content[lang].objectTypes);

  document.getElementById('template-file-example').textContent = templateFileExample;
  document.getElementById('object-json-example').textContent = objectExample;
  document.getElementById('animation-json-example').textContent = animationExample;
  document.getElementById('object-prompt-light').textContent = objectPromptLight;
  document.getElementById('object-prompt-full').textContent = objectPromptFull;
  document.getElementById('animation-prompt-light').textContent = animationPromptLight;
  document.getElementById('animation-prompt-full').textContent = animationPromptFull;

  const projectLink = document.getElementById('project-link');
  if (projectLink) {
    projectLink.textContent = `${content[lang].projectLinkLabel}: ${content[lang].projectLinkValue}`;
    projectLink.href = content[lang].projectLinkValue;
  }

  document.getElementById('help-lang-toggle').textContent = content[lang].langButton;
  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.textContent = copyLabel;
  });
}

function wireCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-copy-target');
      const target = document.getElementById(targetId);
      if (!target) return;

      const original = content[getLang()].copy;
      try {
        await navigator.clipboard.writeText(target.textContent);
        button.textContent = content[getLang()].copied;
        setTimeout(() => {
          button.textContent = original;
        }, 1200);
      } catch {
        window.prompt('Copy this text:', target.textContent);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  render(getLang());
  wireCopyButtons();

  document.getElementById('help-lang-toggle')?.addEventListener('click', () => {
    const next = getLang() === 'en' ? 'es' : 'en';
    setLang(next);
    render(next);
  });
});
