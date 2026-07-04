# Guía de uso con LLMs — Retrovisor 3D

Esta guía explica cómo usar LLMs externos (ChatGPT, Claude, Grok, etc.) para crear contenido para Retrovisor 3D.

Hay tres tipos de JSON que la app puede importar:

Para personajes, vehiculos y criaturas con animaciones reutilizables, el formato preferido es **CharacterModel (CM)**. Usa el formato legacy solo para props sueltos, prototipos rapidos o modelos que no van a colgar de un skeleton.

| Tipo | Descripción | Importar por |
|---|---|---|
| **Objeto (legacy)** | Modelo libre con piezas y animaciones propias | IMPORT JSON → textarea principal |
| **CharacterModel (CM)** | Modelo vinculado a un rig/esqueleto | IMPORT JSON → textarea principal |
| **Skeleton** | Esqueleto con bones y animaciones | IMPORT JSON → sección inferior |
| **Animation Profile** | Subset de animaciones para un CM | IMPORT JSON → sección inferior |

---

## 1. Objeto libre (formato legacy)

Para crear cualquier objeto 3D sin rig. Soporta animaciones propias.

Usa este formato cuando NO necesites slots, skeleton, animation profile ni el panel **RIG / ANIMATIONS**. Para personajes, vehiculos y criaturas, salta directamente a **CharacterModel**.

### Prompt

```
Quiero crear un objeto/personaje 3D low-poly estilo N64/PS1 para un editor 3D.

Devuelve SOLO un JSON valido (sin markdown, sin explicacion) con esta estructura:

{
  "name": "NOMBRE_DEL_OBJETO",
  "pieces": [
    {
      "geometry": { "type": "TIPO", "params": { ... } },
      "color": "#hex",
      "name": "NOMBRE_PIEZA",
      "position": [x, y, z],
      "rotation": [rx, ry, rz],
      "scale": [sx, sy, sz]
    }
  ],
  "animations": [
    {
      "name": "NOMBRE_ANIMACION",
      "duration": 2.0,
      "loop": true,
      "tracks": [
        {
          "target": "NOMBRE_DE_LA_PIEZA",
          "property": "position",
          "interpolation": "linear",
          "keyframes": [
            { "time": 0, "value": [x, y, z] },
            { "time": 1, "value": [x, y, z] }
          ]
        }
      ]
    }
  ]
}

### Tipos de geometria y parametros:
- cube: { width, height, depth }
- sphere: { radius, widthSegments, heightSegments }
- cylinder: { radiusTop, radiusBottom, height, radialSegments }
- cone: { radius, height, radialSegments }
- plane: { width, height }
- capsule: { radius, length, capSegments, radialSegments }
- torus: { radius, tube, radialSegments, tubularSegments }
- wedge: { width, height, depth }
- pyramid: { width, height }
- taperedBox: { widthBottom, depthBottom, widthTop, depthTop, height, offsetTopX?, offsetTopZ? }
- limbLoft: { sides, sections, capTop?, capBottom? }
- lathe: { points, segments }
- custom: { vertices: [[x,y,z],...], faces: [[i,j,k],...] }  (solo triangulos)

Rangos validos:

- `taperedBox`: dimensiones > 0; `offsetTopX/Z` numericos opcionales.
- `limbLoft`: `sides` 4-10; `sections` 2-8 anillos con `y` creciente; cada seccion usa `{ y, radiusX, radiusZ?, offsetX?, offsetZ? }`, radios > 0.
- `lathe`: `points` 3-12 pares `[radio, y]` con `y` creciente; `radio >= 0` y al menos un radio > 0; `segments` 4-12.

### Ejemplos completos de primitivas PSX/N64

**taperedBox** para torso ahusado:

```json
{
  "name": "TORSO_TAPERED_EXAMPLE",
  "pieces": [
    {
      "name": "TORSO",
      "geometry": {
        "type": "taperedBox",
        "params": {
          "widthBottom": 0.8,
          "depthBottom": 0.45,
          "widthTop": 1.25,
          "depthTop": 0.58,
          "height": 1.35,
          "offsetTopX": 0,
          "offsetTopZ": 0.04
        }
      },
      "color": "#3f7a4a",
      "position": [0, 1.15, 0],
      "faceColors": ["#2f5c38", "#5a9a63", "#386f43", "#386f43", "#6dab72", "#24462b"]
    }
  ]
}
```

**limbLoft** para brazo doblado de 6 lados:

```json
{
  "name": "BENT_ARM_LOFT_EXAMPLE",
  "pieces": [
    {
      "name": "ARM_L",
      "geometry": {
        "type": "limbLoft",
        "params": {
          "sides": 6,
          "sections": [
            { "y": 0.0, "radiusX": 0.16, "radiusZ": 0.13, "offsetX": 0, "offsetZ": 0 },
            { "y": 0.55, "radiusX": 0.12, "radiusZ": 0.10, "offsetX": -0.03, "offsetZ": 0.05 },
            { "y": 1.05, "radiusX": 0.10, "radiusZ": 0.09, "offsetX": -0.06, "offsetZ": 0.12 }
          ],
          "capTop": true,
          "capBottom": true
        }
      },
      "color": "#d8a074",
      "position": [-0.8, 0.75, 0],
      "vertexColors": { "bottom": "#a96f47", "top": "#e4b184" }
    }
  ]
}
```

**lathe** para sombrero/seta low-poly:

```json
{
  "name": "LATHE_CAP_EXAMPLE",
  "pieces": [
    {
      "name": "CAP",
      "geometry": {
        "type": "lathe",
        "params": {
          "points": [[0, -0.24], [0.62, -0.18], [0.82, 0.02], [0.44, 0.20], [0, 0.30]],
          "segments": 8
        }
      },
      "color": "#d94a38",
      "position": [0, 1.45, 0],
      "vertexColors": { "bottom": "#8f2d23", "top": "#f87171" }
    },
    {
      "name": "STEM",
      "geometry": { "type": "cylinder", "params": { "radiusTop": 0.18, "radiusBottom": 0.25, "height": 1.15, "radialSegments": 6 } },
      "color": "#f0d6b8",
      "position": [0, 0.68, 0]
    }
  ]
}
```

### Campos opcionales por pieza:
- rotation: [0, 0, 0] (radianes)
- scale: [1, 1, 1]
- color: "#ffcc00"
- name: "PIECE_N"
- pivot: [x, y, z] ? punto de rotacion (ej: hombro para un brazo)
- parent: "NOMBRE_PADRE" ? pieza padre; las posiciones pasan a ser relativas al padre
- `texture`: `{ dataURL, transform? }` opcional para una pieza concreta
- `decal`: spec sprite-only para proyectar un PNG de rasgo sobre la cara frontal de una pieza `CUSTOM` fina

### Losetas de rasgo con sprite

Para caras N64/PSX, ojos/cejas/boca deben ser losetas 3D finas encajadas en la cabeza: piezas `CUSTOM` con grosor real, color piel en los laterales y un `decal` sprite-only en la cara frontal. No uses ojos como esferas ni boca como cajas grandes. El `decal` ya no dibuja estilos procedurales: cada capa debe declarar `sprite`.

```json
{
  "name": "FEATURE_SLAB_EXAMPLE",
  "pieces": [
    {
      "name": "HEAD",
      "geometry": { "type": "taperedBox", "params": { "widthBottom": 0.82, "depthBottom": 0.68, "widthTop": 0.95, "depthTop": 0.54, "height": 0.9 } },
      "color": "#d8ad86",
      "position": [0, 1.35, 0]
    },
    {
      "name": "EYE_SLAB_L",
      "geometry": {
        "type": "custom",
        "vertices": [[-0.24,1.34,0.43],[-0.04,1.34,0.43],[-0.04,1.54,0.43],[-0.24,1.54,0.43],[-0.24,1.34,0.36],[-0.04,1.34,0.36],[-0.04,1.54,0.36],[-0.24,1.54,0.36]],
        "faces": [[0,1,2],[0,2,3],[5,4,7],[5,7,6],[4,0,3],[4,3,7],[1,5,6],[1,6,2],[3,2,6],[3,6,7],[4,5,1],[4,1,0]]
      },
      "color": "#d8ad86",
      "decal": {
        "resolution": [32, 32],
        "background": "transparent",
        "flipY": false,
        "layers": [
          { "kind": "eye", "side": "L", "sprite": "eye_oval", "tint": { "iris": "#3a6ea5" }, "x": 0.5, "y": 0.5, "w": 0.96, "h": 0.96 }
        ]
      }
    }
  ]
}
```

Sprites validos actuales viven en `src/data/avatar/sprites/sprites-manifest.json`. `x/y/w/h` van de 0 a 1 y son relativos al canvas de la loseta. Para Avatar Forge usa el pipeline de `buildFeatureSlabParts`; no generes una pieza plana `FACE_DECAL` para ojos/cejas/boca nuevos.

### Propiedades animables (campo "property"):
- "position": [x, y, z] en unidades
- "rotation": [rx, ry, rz] en radianes
- "scale": [sx, sy, sz]
- "visible": [1] o [0]

### Interpolacion (campo opcional en cada track):
- "linear" (default)
- "smooth": catmull-rom
- "step": salto discreto

### Reglas:
- Pocos segmentos (6-8) para estilo low-poly
- Centrado en X/Z, apoyado en Y=0
- Colores hex retro saturados
- "name" unico en MAYUSCULAS por pieza
- Usa "pivot" en articulaciones y "parent" para jerarquia natural
- Primer y ultimo keyframe iguales si loop=true

### Como NO parecer Minecraft

- No construyas personajes apilando `cube` alineados a ejes para torso, brazos y piernas.
- Usa `taperedBox` para torso, pelvis, botas, faldones y piezas trapezoidales.
- Usa `limbLoft` de 6 lados para brazos, antebrazos, muslos, pantorrillas, colas y cuellos organicos.
- Usa `lathe` con 6-8 segmentos para craneos simples, gorros, cascos redondos, jarrones y faldas circulares.
- Las caras N64/PSX van con losetas `CUSTOM` finas + `decal` sprite-only; no modeles ojos como esferas ni boca como cajas grandes.
- Mantén un personaje completo alrededor de 800 triangulos o menos salvo que el usuario pida detalle extra.

Ahora crea: [DESCRIBE AQUI TU OBJETO/PERSONAJE]
```

### Cómo importar

1. Copia el JSON del LLM
2. IMPORT JSON → textarea principal → IMPORT OBJECT

---

## 2. CharacterModel (CM) — modelo vinculado a un rig

Para crear personajes, vehículos o criaturas que se animan con un **esqueleto existente**.
La app tiene esqueletos para: `HUMANOID_DEFAULT`, `BIRD_SIMPLE`, `CAR_SIMPLE`.

Ventajas frente al formato legacy:

- separa el modelo por `slots` semanticos (`HEAD`, `ARM_R`, `WHEEL_FL`, etc.)
- queda listo para `skeletonId` + `animationProfile`
- abre el flujo completo del panel **RIG / ANIMATIONS**
- facilita exportar, reusar animaciones y ajustar bindings sin rehacer el modelo

> **Recomendado**: usar el botón **PROMPT LLM** dentro de la app (panel izquierdo → sección ARQUETIPOS).
> Genera el prompt automáticamente con las posiciones exactas de los bones en espacio mundo.

### Formato

```json
{
  "name": "Nombre del personaje",
  "archetype": "HUMANOID",
  "animationProfile": "HUMANOID_SWORDSMAN",
  "skeletonId": "HUMANOID_DEFAULT",
  "slots": [
    {
      "slotId": "HEAD",
      "pieces": [
        {
          "template": "CUBE",
          "name": "HEAD",
          "size": [1.6, 1.6, 1.6],
          "offset": [0, 4.3, 0],
          "material": "#f5d0b5"
        }
      ]
    },
    {
      "slotId": "TORSO",
      "pieces": [
        {
          "template": "CUBE",
          "name": "TORSO",
          "size": [2.0, 2.2, 1.2],
          "offset": [0, 2.85, 0],
          "material": "#4a5"
        }
      ]
    }
  ]
}
```

### Campos por pieza de slot

| Campo | Tipo | Descripción |
|---|---|---|
| `template` | string | `CUBE`, `PRISM`, `PLANE`, `CYLINDER`, `CONE`, `SPHERE`, `CAPSULE`, `TORUS`, `PYRAMID`, `CUSTOM` |
| `name` | string | Nombre ?nico en todo el JSON. La pieza principal lleva el nombre del slot. |
| `size` | [w, h, d] | Dimensiones en unidades Three.js. En `CUSTOM` puede omitirse. |
| `offset` | [x, y, z] | Posici?n MUNDO del centro de la pieza. Alinear con la posici?n del bone. |
| `material` | "#RRGGBB" | Color hex |
| `rotation` | [rx, ry, rz] | Opcional. Radianes. |
| `parent` | string | Opcional. Sub-pieza dentro del mismo slot. |
| `pivot` | [x, y, z] | Opcional. Punto de pivote en espacio mundo. |
| `texture` | object | Opcional. Textura serializada para caras o placas dedicadas. |

Si `template` es `CUSTOM`, usa:

- `params.vertices`: `[[x, y, z], ...]`
- `params.faces`: `[[i, j, k], ...]`

Solo triangulos. `offset` sigue siendo la posicion de colocacion de la pieza.

### Guia rapida de moldes PSX/N64

Para que el resultado no se vaya a un look voxel generico:

- separa siempre torso y pelvis
- separa brazo superior, antebrazo y mano
- separa muslo, espinilla y pie
- no resuelvas la cabeza como un solo cubo limpio
- construye el pelo con 3-5 masas grandes

Si quieres **PSX**:

- prioriza siluetas angulosas y piezas duras
- usa `TAPERED_BOX`, `LIMB_LOFT`, `LATHE`, `PRISM`, `PYRAMID`, `CUSTOM`, `faceColors` y placas finas en casco, flequillo, hombreras o faldones
- guarda ojos, boca y rasgos finos para losetas `CUSTOM` con `decal` sprite-only; nariz, orejas, gorra y pelo si pueden ser volumen aparte

Si quieres **N64**:

- prioriza `SPHERE` y `CYLINDER` low-seg donde mejoren la silueta
- usa `LIMB_LOFT` de 6 lados para extremidades y `TAPERED_BOX` para torso/botas si quieres evitar look voxel
- exagera cabeza, manos y pies
- usa `vertexColors` para dar volumen y evita meter demasiado ruido pequeno
- para caras tipo mascota/portada, usa losetas o una placa frontal con `decal` sprite-only y deja nariz, orejas, gorra o pelo como volumen aparte

### Arquetipos y slots

**HUMANOID** — slots: `HEAD`, `TORSO`, `ARM_L`, `ARM_R`, `LEG_L`, `LEG_R`, `WEAPON_MAIN`, `WEAPON_SECONDARY`

**BIRD** — slots: `BODY`, `HEAD`, `WING_L`, `WING_R`, `LEG_L`, `LEG_R`, `TAIL`

**CAR** — slots: `BODY`, `WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, `WHEEL_RR`

**PROP** — slots: `BODY`

### Perfiles de animación disponibles

| Profile ID | Skeleton | Animaciones |
|---|---|---|
| `HUMANOID_SWORDSMAN` | HUMANOID_DEFAULT | idle, walk, run, attack, hurt, die |
| `HUMANOID_ARCHER` | HUMANOID_DEFAULT | idle, walk, run, bow_draw, bow_shoot |
| `BIRD_IDLE_WALK` | BIRD_SIMPLE | idle, walk |
| `CAR_ROLL` | CAR_SIMPLE | idle, roll |

### Cómo importar

1. Copia el JSON del LLM
2. IMPORT JSON → textarea principal → IMPORT OBJECT
3. El modelo aparece en la escena ya vinculado al rig
4. Selecciona el grupo → botón **RIG / ANIMATIONS** en el panel derecho

---

## 3. Skeleton JSON — crear un esqueleto nuevo

Para añadir un nuevo arquetipo o nuevas animaciones a uno existente.

> **Recomendado**: usar **PROMPT LLM → pestaña ESQUELETO/RIG** dentro de la app.

### Formato

```json
{
  "id": "NOMBRE_EN_MAYUSCULAS",
  "archetype": "HUMANOID",
  "bones": [
    { "name": "ROOT",  "parent": null,    "position": [0, 0, 0] },
    { "name": "SPINE", "parent": "ROOT",  "position": [0, 2.85, 0] },
    { "name": "HEAD",  "parent": "SPINE", "position": [0, 1.45, 0] }
  ],
  "defaultBindings": {
    "HEAD":  ["HEAD"],
    "TORSO": ["SPINE"],
    "ARM_L": ["ARM_L_UPPER", "ARM_L_LOWER", "HAND_L"]
  },
  "animations": [
    {
      "name": "idle",
      "duration": 2.0,
      "loop": true,
      "tracks": [
        {
          "target": "HEAD",
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
}
```

### Reglas del skeleton

- `ROOT` siempre en `[0, 0, 0]`, `parent: null`
- `position` es LOCAL respecto al parent (no posición mundo)
- Escala: humanoide ≈ 6 unidades de alto. Eje Y = arriba, Z = adelante
- Convenciones de nombre: sufijos `_L`/`_R` (izquierda/derecha), `_UPPER`/`_LOWER`
- `defaultBindings`: cada slot del arquetipo apunta a 1-N bones. El primero es el "primario"
- Animaciones: `rotation` en radianes XYZ, `position` en unidades Three.js
- Loops: primer y último keyframe deben coincidir en valor
- Incluir siempre `"idle"` (loop: true)

### Cómo importar en runtime (sin rebuild)

1. Genera el JSON con el LLM
2. IMPORT JSON → **sección inferior** (IMPORT SKELETON / ANIMATION PROFILE) → pega → IMPORT
3. El esqueleto queda disponible inmediatamente en el RIG panel

### Para un arquetipo NUEVO (no existe en la app)

Además del skeleton, hay que:
1. Editar `src/modules/archetype-system.js` → añadir a `ARCHETYPE_SLOTS`:
   ```js
   NOMBRE_ARQUETIPO: ['SLOT1', 'SLOT2', ...],
   ```
2. Crear `src/data/animation-profiles/<nombre>.json`:
   ```json
   { "id": "PERFIL_ID", "skeletonId": "ID_DEL_ESQUELETO", "animations": ["idle", "walk"] }
   ```
3. `npm run build` (o importar el perfil también via la sección inferior)

---

## 4. Animation Profile JSON — subset de animaciones

Cuando quieres exponer solo algunas animaciones de un skeleton para un rol concreto.

```json
{
  "id": "HUMANOID_PALADIN",
  "skeletonId": "HUMANOID_DEFAULT",
  "animations": ["idle", "walk", "attack", "hurt", "die"],
  "style": {
    "walkSpeed": 0.8
  }
}
```

### Cómo importar

IMPORT JSON → sección inferior → pega → IMPORT. Disponible inmediatamente en el RIG panel.

---

## Regla practica

- Personajes, enemigos, mounts, coches o criaturas: **CharacterModel**
- Props sueltos, decorado, pickup simple o pruebas rapidas: **legacy**

## Panel RIG / ANIMATIONS

Accesible para cualquier grupo desde el panel de propiedades (derecha):
- **Con rig asignado**: botón "RIG / ANIMATIONS"
- **Sin rig**: botón "ASIGNAR RIG" → selecciona arquetipo + esqueleto → abre el panel

### Dentro del RIG panel

- **Viewport izquierdo**: modelo 3D. Click en una pieza para asignarla al slot activo.
- **Viewport derecho**: esqueleto con bones (esferas cyan + líneas).
- **Bindings** (panel inferior izquierdo): lista de slots. Clic en un slot para expandir:
  - **PIEZAS DEL MODELO** (magenta): qué piezas del modelo pertenecen a este slot
  - **BONES DEL ESQUELETO** (cian): qué bones del esqueleto mueven este slot
- **Animations** (panel inferior derecho): lista de animaciones. Clic para reproducir en bucle.

---

## Modo Animación (objetos legacy)

Para objetos importados con el formato legacy (no CM):

1. Selecciona el grupo
2. Panel derecho → **ANIMATION MODE**
3. Panel dedicado: lista animaciones, play/stop, importar nueva animación, exportar GLB/JSON
4. **ESC** para volver

---

## Exportar

- **COPY JSON** / **DOWNLOAD**: exporta el grupo seleccionado en formato compatible con importar
- **GLB**: exporta para motores de juego (Unity, Godot, etc.)

Los efectos PSX (vertex jitter, dithering, etc.) son visuales — no se incluyen en el GLB.
