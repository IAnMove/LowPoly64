# SKELETON.md — Contrato canónico de esqueleto humanoide

**Regla nº1: todo contenido nuevo (moldes, personajes, clips) usa exclusivamente
`HUMANOID_STANDARD`.** `HUMANOID_DEFAULT` y `HUMANOID_CAPTURE` son legacy: se mantienen
para los templates existentes pero está prohibido usarlos en contenido nuevo.

Fuente de verdad de la definición: `src/data/skeletons/humanoid_standard.json`
(id `HUMANOID_STANDARD`, archetype `HUMANOID`). Este documento fija las convenciones
que el JSON por sí solo no expresa.

## Huesos y jerarquía

| Hueso | Padre | Posición local (rest) |
|---|---|---|
| `Hips` | — (raíz) | [0, 2.6, 0] |
| `Spine` | Hips | [0, 0.2, 0] |
| `Neck` | Spine | [0, 1.02, 0] |
| `Head` | Neck | [0, 0.42, 0] |
| `Left_Shoulder` | Spine | [0.42, 1.02, 0] |
| `Left_Upper_Arm` | Left_Shoulder | [0.18, 0.08, 0] |
| `Left_Lower_Arm` | Left_Upper_Arm | [0, -0.9, 0] |
| `Left_Hand` | Left_Lower_Arm | [0, -0.88, 0.02] |
| `Right_Shoulder` | Spine | [-0.42, 1.02, 0] |
| `Right_Upper_Arm` | Right_Shoulder | [-0.18, 0.08, 0] |
| `Right_Lower_Arm` | Right_Upper_Arm | [0, -0.9, 0] |
| `Right_Hand` | Right_Lower_Arm | [0, -0.88, 0.02] |
| `Left_Upper_Leg` | Hips | [0.25, -0.2, 0] |
| `Left_Lower_Leg` | Left_Upper_Leg | [0, -1.1, 0] |
| `Left_Foot` | Left_Lower_Leg | [0, -1.05, 0.18] |
| `Right_Upper_Leg` | Hips | [-0.25, -0.2, 0] |
| `Right_Lower_Leg` | Right_Upper_Leg | [0, -1.1, 0] |
| `Right_Foot` | Right_Lower_Leg | [0, -1.05, 0.18] |

Convención de lados: **+X = izquierda del personaje** (`Left_*` en x positiva),
**+Z = frente**, **+Y = arriba**. Igual que las cabezas (`axes: { up: "+y", front: "+z" }`).

## Convenciones obligatorias (definidas aquí, 2026-07-02)

1. **Rest pose = brazos caídos a los lados, piernas rectas, mirando a +Z**
   (todas las quaternions de reposo son identidad `[0,0,0,1]`).
2. **Ejes locales en reposo = ejes del mundo** para TODOS los huesos: ningún hueso
   nace rotado. La dirección "a lo largo del hueso" es la posición local del hijo
   (−Y en extremidades, +Y en la columna). Esto hace que un delta de rotación
   signifique lo mismo en cualquier rig conforme: **por eso los clips son portables**.
3. **Los pivots del modelo visual deben estar en las articulaciones reales de la
   geometría** (hombro, codo, cadera, rodilla), no en el centro de la pieza.
4. **Escala:** altura de referencia ~5.2 unidades (Hips a 2.6). Los moldes de otra
   altura escalan las POSICIONES de los huesos proporcionalmente, nunca las
   orientaciones. La adaptación de un clip a otra estatura solo escala la translación
   de `Hips`/root (ratio de longitud de pierna); las rotaciones se copian tal cual.

## Nombres de pieza (nodos visuales) por hueso

Nombres canónicos que el normalizador (`HUMANOID_NODE_ALIASES` en
`src/modules/viewport/templates.js`) reconoce y ancla. Usar SIEMPRE los canónicos
en contenido nuevo:

| Hueso | Nombre de pieza canónico |
|---|---|
| Hips | `PELVIS` |
| Spine | `TORSO` (o `CHEST` como segmento superior) |
| Neck | `NECK` |
| Head | `HEAD` |
| Shoulders | `CLAVICLE_L` / `CLAVICLE_R` |
| Upper arms | `ARM_L_UPPER` / `ARM_R_UPPER` (forma corta: `ARM_L` / `ARM_R`) |
| Lower arms | `ARM_L_LOWER` / `ARM_R_LOWER` |
| Hands | `HAND_L` / `HAND_R` |
| Upper legs | `LEG_L_UPPER` / `LEG_R_UPPER` |
| Lower legs | `LEG_L_LOWER` / `LEG_R_LOWER` |
| Feet | `FOOT_L` / `FOOT_R` |

### Lista negra — NUNCA usar para piezas decorativas

Cualquier nombre que sea alias de anclaje reparenta la pieza y puede desmontar el
brazo/pierna entero (síntoma: `Animation target ARM_L not found in group`):

`SHOULDER_L/R`, `LEFT_SHOULDER`, `RIGHT_SHOULDER`, `PAULDRON_*`, `CLAVICLE_*`,
`WAIST`, `HIP`, `HIPS`, `BODY`, `UPPER_BODY`, y en general todo alias listado en
`HUMANOID_NODE_ALIASES`. Para decoración usar sufijos: `ARM_L_PAD`, `TORSO_WAIST`,
`CHEST_PLATE_DECO`. Ojo: la normalización ignora mayúsculas y separadores
(`Left Shoulder` == `LEFT_SHOULDER`).

## slotBindings

Mapa `slot de animación → nombres de nodo` que conecta clips con piezas. Los slots
son: `HEAD`, `TORSO`, `ARM_L`, `ARM_R`, `LEG_L`, `LEG_R`, `WEAPON_MAIN`,
`WEAPON_SECONDARY`. Ejemplo conforme (los `defaultBindings` del propio
`humanoid_standard.json` aceptan tanto nombres de hueso como nombres de pieza canónicos):

```json
"skeletonId": "HUMANOID_STANDARD",
"slotBindings": {
  "HEAD": ["HEAD"],
  "TORSO": ["PELVIS", "TORSO", "NECK"],
  "ARM_L": ["CLAVICLE_L", "ARM_L_UPPER", "ARM_L_LOWER", "HAND_L"],
  "ARM_R": ["CLAVICLE_R", "ARM_R_UPPER", "ARM_R_LOWER", "HAND_R"],
  "LEG_L": ["LEG_L_UPPER", "LEG_L_LOWER", "FOOT_L"],
  "LEG_R": ["LEG_R_UPPER", "LEG_R_LOWER", "FOOT_R"],
  "WEAPON_MAIN": ["HAND_R"],
  "WEAPON_SECONDARY": ["HAND_L"]
}
```

Un grupo es **conforme** cuando: declara `skeletonId: "HUMANOID_STANDARD"`, contiene
un nodo por cada hueso de la tabla (o su nombre de pieza canónico), y sus pivots y
ejes cumplen las convenciones de arriba. El gate de Motion Ripper
(`resolveImportEligibility` en `motion-ripper-target-config.js`) y la futura
aplicación de clips 1:1 (Fase 3 de `newtask.md`) usan esta definición.

## Estado actual y migración

- `src/data/templates/generated-character-molds.js` emite `HUMANOID_STANDARD`
  con nodos de hueso estandar y `slotBindings` derivados del spec del molde.
- Los personajes de captura usan `HUMANOID_CAPTURE`; el pipeline de captura queda
  congelado tal y como describe `docs/motion-ripper-freeze.md`.
- No añadir alias nuevos a `HUMANOID_NODE_ALIASES`: es una capa de compatibilidad
  legacy, no un mecanismo de extensión.
