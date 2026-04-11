# Guía de uso con LLMs — Retrovisor 3D

Esta guía explica cómo usar LLMs externos (ChatGPT, Claude, Grok, etc.) para crear contenido para Retrovisor 3D.

Hay tres tipos de JSON que la app puede importar:

| Tipo | Descripción | Importar por |
|---|---|---|
| **Objeto (legacy)** | Modelo libre con piezas y animaciones propias | IMPORT JSON → textarea principal |
| **CharacterModel (CM)** | Modelo vinculado a un rig/esqueleto | IMPORT JSON → textarea principal |
| **Skeleton** | Esqueleto con bones y animaciones | IMPORT JSON → sección inferior |
| **Animation Profile** | Subset de animaciones para un CM | IMPORT JSON → sección inferior |

---

## 1. Objeto libre (formato legacy)

Para crear cualquier objeto 3D sin rig. Soporta animaciones propias.

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
- custom: { vertices: [[x,y,z],...], faces: [[i,j,k],...] }  (solo triangulos)

### Campos opcionales por pieza:
- rotation: [0, 0, 0] (radianes)
- scale: [1, 1, 1]
- color: "#ffcc00"
- name: "PIECE_N"
- pivot: [x, y, z] — punto de rotacion (ej: hombro para un brazo)
- parent: "NOMBRE_PADRE" — pieza padre; las posiciones pasan a ser relativas al padre

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

Ahora crea: [DESCRIBE AQUI TU OBJETO/PERSONAJE]
```

### Cómo importar

1. Copia el JSON del LLM
2. IMPORT JSON → textarea principal → IMPORT OBJECT

---

## 2. CharacterModel (CM) — modelo vinculado a un rig

Para crear personajes, vehículos o criaturas que se animan con un **esqueleto existente**.
La app tiene esqueletos para: `HUMANOID_DEFAULT`, `BIRD_SIMPLE`, `CAR_SIMPLE`.

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
| `template` | string | `CUBE`, `PRISM`, `PLANE`, `CYLINDER`, `CONE`, `SPHERE`, `TORUS` |
| `name` | string | Nombre único en todo el JSON. La pieza principal lleva el nombre del slot. |
| `size` | [w, h, d] | Dimensiones en unidades Three.js |
| `offset` | [x, y, z] | Posición MUNDO del centro de la pieza. Alinear con la posición del bone. |
| `material` | "#RRGGBB" | Color hex |
| `rotation` | [rx, ry, rz] | Opcional. Radianes. |
| `parent` | string | Opcional. Sub-pieza dentro del mismo slot. |
| `pivot` | [x, y, z] | Opcional. Punto de pivote en espacio mundo. |

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
