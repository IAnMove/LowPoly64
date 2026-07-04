# Prompt para generar CharacterModel humanoide

Copia este prompt en un LLM externo cuando quieras un personaje completo para Retrovisor.

```text
Quiero un CharacterModel humanoide low-poly estilo PSX/N64 para Retrovisor.

Devuelve SOLO JSON valido, sin markdown ni explicaciones.

Objetivo visual:
[DESCRIBE AQUI EL PERSONAJE: aldeano N64, guardia PSX, maga, heroe, etc.]

Contrato obligatorio:
- Usa formato CharacterModel, no el formato legacy `pieces` plano.
- `assetRole` debe ser `"characterModel"`.
- `archetype` debe ser `"HUMANOID"`.
- `skeletonId` debe ser `"HUMANOID_STANDARD"`.
- Incluye `slotBindings` completos.
- Cada slot estructural (`HEAD`, `TORSO`, `ARM_L`, `ARM_R`, `LEG_L`, `LEG_R`)
  debe existir y tener al menos una pieza.
- `WEAPON_MAIN` y `WEAPON_SECONDARY` son opcionales en `slots`; si no hay arma,
  no declares esos slots y deja sus `slotBindings` como arrays vacios.
- Nombres de pieza unicos, estables y en MAYUSCULAS.
- Usa `pivot` en articulaciones reales: cadera, hombro, codo, rodilla, tobillo.
- Usa `parent` para que las piezas sigan la jerarquia del cuerpo.
- Mantener presupuesto: 400-900 triangulos para un personaje comun; maximo 1200 salvo encargo especial.
- Pocos segmentos: `limbLoft.sides` 6 por defecto, `lathe.segments` 6-8.

Metadatos:
{
  "id": "snake_case_id_cm",
  "name": "Nombre visible",
  "category": "N64",
  "assetRole": "characterModel",
  "archetype": "HUMANOID",
  "skeletonId": "HUMANOID_STANDARD",
  "slotBindings": { ... },
  "slots": [ ... ]
}
```

## Slots Y Nombres Canonicos

Usa estos nombres para piezas estructurales. Las piezas decorativas deben tener sufijos
claros y no deben robar nombres de hueso.

| Slot | Piezas estructurales |
| --- | --- |
| `HEAD` | `HEAD`, `EYE_SLAB_L/R`, `BROW_SLAB_L/R`, `MOUTH_SLAB`, pelo/gorro/orejas como decoracion; `FACE_DECAL` solo legacy |
| `TORSO` | `PELVIS`, `TORSO`, `CHEST`, `NECK`, ropa como `TUNIC_SKIRT` o `BELT_WRAP` |
| `ARM_L` | `CLAVICLE_L`, `ARM_L_UPPER`, `ARM_L_LOWER`, `HAND_L` |
| `ARM_R` | `CLAVICLE_R`, `ARM_R_UPPER`, `ARM_R_LOWER`, `HAND_R` |
| `LEG_L` | `LEG_L_UPPER`, `LEG_L_LOWER`, `FOOT_L` |
| `LEG_R` | `LEG_R_UPPER`, `LEG_R_LOWER`, `FOOT_R` |
| `WEAPON_MAIN` | arma/accesorio principal parentado a `HAND_R`; slot opcional |
| `WEAPON_SECONDARY` | escudo/accesorio secundario parentado a `HAND_L`; slot opcional |

`slotBindings` obligatorio:

```json
{
  "HEAD": ["HEAD"],
  "TORSO": ["PELVIS", "TORSO", "CHEST", "NECK"],
  "ARM_L": ["CLAVICLE_L", "ARM_L_UPPER", "ARM_L_LOWER", "HAND_L"],
  "ARM_R": ["CLAVICLE_R", "ARM_R_UPPER", "ARM_R_LOWER", "HAND_R"],
  "LEG_L": ["LEG_L_UPPER", "LEG_L_LOWER", "FOOT_L"],
  "LEG_R": ["LEG_R_UPPER", "LEG_R_LOWER", "FOOT_R"],
  "WEAPON_MAIN": [],
  "WEAPON_SECONDARY": []
}
```

Si hay arma o escudo, usa esos slots y enlazalos a `HAND_R`/`HAND_L` en `slotBindings`.

## Lista Negra De Nombres

No uses estos nombres para decoracion porque el normalizador los trata como anclas:

`SHOULDER_L`, `SHOULDER_R`, `LEFT_SHOULDER`, `RIGHT_SHOULDER`, `PAULDRON_L`,
`PAULDRON_R`, `CLAVICLE_L`, `CLAVICLE_R`, `WAIST`, `HIP`, `HIPS`, `BODY`,
`UPPER_BODY`.

Excepcion: `CLAVICLE_L` y `CLAVICLE_R` solo se usan como piezas estructurales del
slot de brazo; nunca para hombreras o decoracion.

Usa alternativas: `ARM_L_PAD`, `ARM_R_PAD`, `TORSO_WAIST_DECO`, `CHEST_PLATE_DECO`,
`HAT_BRIM`, `HAIR_BACK`, `BOOT_CUFF_L`.

## Primitivas Recomendadas

- Torso, pelvis, botas, faldas: `TAPERED_BOX`.
- Brazos, piernas, colas, gorros doblados: `LIMB_LOFT`.
- Gorros redondos, cascos, faldas circulares: `LATHE`.
- Cabeza nueva: usa receta de Avatar Forge con `headMoldId` generado; no escribas vertices manuales de craneo si puedes pedir un molde.
- Facciones nuevas: `EYE_SLAB_L/R`, `BROW_SLAB_L/R` y `MOUTH_SLAB` como losetas `CUSTOM` finas con `decal` sprite-only.
- Cara legacy: `FACE_DECAL` como `PLANE` solo para plantillas antiguas ya versionadas; nunca para personajes nuevos.
- Cabeza exportada: `CUSTOM` de baja cantidad de vertices si viene del pipeline, o `SPHERE` de 8x6 segmentos para prototipos sin Avatar Forge.

`TAPERED_BOX` en CharacterModel:

```json
{
  "template": "TAPERED_BOX",
  "size": [1.0, 1.2, 0.7],
  "params": { "widthTop": 1.35, "depthTop": 0.78, "offsetTopZ": 0.03 }
}
```

`LIMB_LOFT` en CharacterModel:

```json
{
  "template": "LIMB_LOFT",
  "size": [0.42, 1.1, 0.42],
  "params": {
    "sides": 6,
    "sections": [
      { "y": -0.55, "radiusX": 0.14, "radiusZ": 0.13 },
      { "y": 0.0, "radiusX": 0.2, "radiusZ": 0.17, "offsetZ": 0.02 },
      { "y": 0.55, "radiusX": 0.22, "radiusZ": 0.19 }
    ],
    "capTop": true,
    "capBottom": true
  }
}
```

## Caras Nuevas: Losetas De Rasgo

Para personajes nuevos, pide un craneo generado y facciones compactas por
catalogo. El LLM debe elegir `presetId` y comprobar `spriteId`; el runtime genera
las cinco losetas (`EYE_SLAB_L`, `EYE_SLAB_R`, `BROW_SLAB_L`, `BROW_SLAB_R`,
`MOUTH_SLAB`) con profundidad real. No dibujes ojos, cejas ni boca como esferas,
cubos o vertices manuales de cabeza.

Presets de profundidad disponibles: `flat_safe`, `default_embedded`,
`toy_extruded`, `mask_plate`. Usa `default_embedded` salvo que se pida una cara
muy plana o un juguete con rasgos mas salientes. El slot `iris` usa el placeholder
`#ff00ff`, `brow` usa `#0000ff` y `lip` usa `#00ff00`.

Tabla corta de eleccion:

| Emocion/rol | `eyes.spriteId` | `brows.spriteId` | `mouth.spriteId` |
| --- | --- | --- | --- |
| heroe serio | `eye_sharp_hero` | `brow_heroic_slope` | `mouth_serious_cut` |
| amable/cute | `eye_big_sparkle` | `brow_soft_curve` | `mouth_soft_smile` |
| cansado | `eye_sleepy_lid` | `brow_elder` | `mouth_neutral_small` |
| triste/preocupado | `eye_downcast` | `brow_sad_inner_up` | `mouth_big_frown` |
| villano teatral | `eye_masked_slit` | `brow_villain_hook` | `mouth_mischief_tooth` |
| anciano | `eye_old_wrinkle` | `brow_elder` | `mouth_beard_gap` |
| fantasma/magia | `eye_blank_glow` | `brow_tiny_dot` | `mouth_ooh` |
| robot/NPC seco | `eye_robot` | `brow_thin` | `mouth_serious_cut` |

Ejemplo completo compacto para pedir un personaje nuevo. Es una receta de Avatar
Forge: no contiene vertices manuales de cabeza y el export resultante sera un
`CharacterModel` con craneo generado, losetas y pelo.

<!-- avatar-feature-slab-example:start -->
```json
{
  "version": 2,
  "label": "Heroe elfico generado con losetas",
  "headBuildMode": "mold",
  "bodyPresetId": "psx_heroic",
  "headMoldId": "gen_head_heroic",
  "featureSlabDepthPresetId": "default_embedded",
  "headParams": {
    "skullWidth": 0.04,
    "jawDrop": 0.08,
    "crownRoundness": 0.06,
    "cheekFullness": 0.03
  },
  "features": {
    "hair": {
      "presetId": "bridge_low_pony_01",
      "placement": { "size": 1.03, "offsetX": 0, "offsetY": -0.02, "length": 0.28 }
    },
    "eyes": {
      "presetId": "psx_sharp_hero_01",
      "spriteId": "eye_sharp_hero",
      "tintSlots": ["iris"],
      "placement": { "size": 1.04, "offsetX": 0, "offsetY": -0.01, "spacing": 0.02 }
    },
    "brows": {
      "presetId": "bridge_heroic_slope_01",
      "spriteId": "brow_heroic_slope",
      "tintSlots": ["brow"],
      "placement": { "size": 1.02, "offsetX": 0, "offsetY": -0.02 }
    },
    "nose": {
      "presetId": "nose_soft_01",
      "placement": { "size": 0.94, "offsetX": 0, "offsetY": 0 }
    },
    "mouth": {
      "presetId": "psx_serious_cut_01",
      "spriteId": "mouth_serious_cut",
      "tintSlots": ["lip"],
      "placement": { "size": 0.95, "offsetX": 0, "offsetY": 0.01 }
    },
    "ears": {
      "presetId": "ear_point_01",
      "placement": { "size": 1.05, "offsetX": 0, "offsetY": -0.02 }
    }
  },
  "accessoryIds": ["none"],
  "paletteId": "warm_rose",
  "colorOverrides": {
    "skin": "#d8ad86",
    "hair": "#5a341f",
    "iris": "#3a6ea5"
  },
  "skeletonId": "HUMANOID_STANDARD",
  "animationProfile": "HUMANOID_STANDARD_AVATAR_BASE"
}
```
<!-- avatar-feature-slab-example:end -->

Regla de compatibilidad: `FACE_DECAL` se acepta solo en ejemplos legacy ya
versionados, y sus capas deben ser sprite-only (`sprite`, nunca `style`). En
personajes nuevos, si necesitas cambiar expresion, cambia `presetId`/`spriteId`
de ojos, cejas y boca.

## Tabla De Proporciones

Estas son las proporciones versionadas de `CHARACTER_MOLD_PROPORTIONS`. Elige el molde
mas cercano y adapta desde ahi.

| Molde | Altura | Cabezas | Hombros | Brazo | Pierna | Mano | Pie |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `psx_humanoid_chibi_mold_cm` | 5.5568 | 2.3153 | 0.7149 | 0.2699 | 0.2288 | 0.1500 | 0.4500 |
| `psx_humanoid_heroic_mold_cm` | 6.6064 | 4.6524 | 1.7121 | 0.3633 | 0.4043 | 0.2535 | 0.8169 |
| `psx_humanoid_slim_mold_cm` | 6.4832 | 4.9115 | 1.3333 | 0.3625 | 0.4323 | 0.2424 | 0.7273 |
| `psx_humanoid_heavy_mold_cm` | 6.1696 | 4.0589 | 1.6129 | 0.3485 | 0.3388 | 0.2632 | 0.8684 |
| `n64_humanoid_round_mold_cm` | 5.9574 | 2.3362 | 0.7462 | 0.2434 | 0.2400 | 0.2039 | 0.5098 |
| `n64_humanoid_classic_mold_cm` | 6.3588 | 3.6970 | 1.1728 | 0.3145 | 0.3713 | 0.2326 | 0.6860 |

## Paleta Y Sombreado

Usa 5-7 colores maximo:

- piel
- ropa principal
- ropa secundaria
- cuero/botas/cinturon
- metal/acento
- pelo

Para `TAPERED_BOX`, `faceColors` sigue este orden: back, front, left, right, top, bottom.
Ejemplo desde una base verde:

```json
"faceColors": ["#1f5522", "#3fa447", "#2b7430", "#2b7430", "#55b75b", "#183e19"]
```

## Como NO Parecer Minecraft

- No hagas torso, brazos y piernas con `CUBE` puros.
- No pongas ojos, pupilas, boca o cejas como geometria suelta; usa losetas de rasgo con `spriteId`. `FACE_DECAL` queda solo para legacy.
- No uses bloques rectos para muslos y antebrazos; usa `LIMB_LOFT` con 3 secciones.
- No hagas la ropa como placas planas pegadas si puede ser una silueta: tunica, falda,
  hombreras, botas y guantes deben alterar el contorno.
- Evita simetria perfecta en accesorios: gorros, pelo y capas leen mejor con una curva
  o desplazamiento pequeno.

## Checklist Antes De Responder

- JSON parsea sin comentarios ni trailing commas.
- Todos los slots estructurales existen.
- `skeletonId` es `HUMANOID_STANDARD`.
- `slotBindings` contiene todos los slots.
- Cada pieza referenciada por `slotBindings` existe.
- No se uso ningun nombre de la lista negra para decoracion.
- Personaje nuevo: usa craneo generado + presets con `spriteId` para ojos, cejas y boca.
- Si es legacy con `FACE_DECAL`, tiene `decal.resolution`, `background`, `flipY: false` y `layers` con `sprite`, nunca `style`.
- El personaje mantiene una silueta clara a 128px de alto.
- Un clip walk/idle debe encontrar targets para torso, brazos y piernas.

## Ejemplo Completo Pequeno

Este ejemplo es deliberadamente pequeno: un aldeano N64 simple. Debe importar a la primera.

<!-- character-example:start -->
```json
{
  "id": "n64_simple_villager_cm",
  "name": "Aldeano simple N64",
  "category": "N64",
  "assetRole": "characterModel",
  "archetype": "HUMANOID",
  "skeletonId": "HUMANOID_STANDARD",
  "slotBindings": {
    "HEAD": ["HEAD"],
    "TORSO": ["PELVIS", "TORSO", "CHEST", "NECK"],
    "ARM_L": ["CLAVICLE_L", "ARM_L_UPPER", "ARM_L_LOWER", "HAND_L"],
    "ARM_R": ["CLAVICLE_R", "ARM_R_UPPER", "ARM_R_LOWER", "HAND_R"],
    "LEG_L": ["LEG_L_UPPER", "LEG_L_LOWER", "FOOT_L"],
    "LEG_R": ["LEG_R_UPPER", "LEG_R_LOWER", "FOOT_R"],
    "WEAPON_MAIN": [],
    "WEAPON_SECONDARY": []
  },
  "slots": [
    {
      "slotId": "HEAD",
      "pieces": [
        {
          "template": "SPHERE",
          "name": "HEAD",
          "size": [1.18, 1.18, 1.18],
          "offset": [0, 4.85, 0],
          "material": "#e5bd9b",
          "parent": "NECK",
          "pivot": [0, 4.28, 0],
          "params": { "widthSegments": 8, "heightSegments": 6 },
          "vertexColors": { "top": "#f2d0b0", "bottom": "#bf906d" }
        },
        {
          "template": "PLANE",
          "name": "FACE_DECAL",
          "size": [0.72, 0.42, 0.01],
          "offset": [0, 4.82, 0.61],
          "material": "#ffffff",
          "parent": "HEAD",
          "pivot": [0, 4.85, 0],
          "decal": {
            "resolution": [64, 32],
            "background": "transparent",
            "flipY": false,
            "layers": [
              { "kind": "eye", "side": "L", "sprite": "eye_dot", "tint": { "iris": "#2b4f7e" }, "x": 0.34, "y": 0.43, "w": 0.1, "h": 0.16 },
              { "kind": "eye", "side": "R", "sprite": "eye_dot", "tint": { "iris": "#2b4f7e" }, "x": 0.66, "y": 0.43, "w": 0.1, "h": 0.16 },
              { "kind": "brow", "side": "L", "sprite": "brow_flat", "tint": { "brow": "#6b4a2d" }, "x": 0.34, "y": 0.3, "w": 0.15, "h": 0.04 },
              { "kind": "brow", "side": "R", "sprite": "brow_flat", "tint": { "brow": "#6b4a2d" }, "x": 0.66, "y": 0.3, "w": 0.15, "h": 0.04 },
              { "kind": "mouth", "sprite": "mouth_smile", "tint": { "lip": "#7a3b2e" }, "x": 0.5, "y": 0.73, "w": 0.22, "h": 0.07 }
            ]
          }
        },
        {
          "template": "LATHE",
          "name": "HAIR_CAP",
          "size": [1.24, 0.44, 1.24],
          "offset": [0, 5.18, -0.04],
          "material": "#6b4a2d",
          "parent": "HEAD",
          "pivot": [0, 4.85, 0],
          "params": { "segments": 8, "points": [[0.0, -0.1], [0.62, -0.08], [0.58, 0.18], [0.2, 0.34], [0.0, 0.38]] }
        }
      ]
    },
    {
      "slotId": "TORSO",
      "pieces": [
        {
          "template": "TAPERED_BOX",
          "name": "PELVIS",
          "size": [1.02, 0.52, 0.64],
          "offset": [0, 2.1, 0],
          "material": "#4f5f86",
          "pivot": [0, 2.4, 0],
          "params": { "widthTop": 0.9, "depthTop": 0.58 }
        },
        {
          "template": "TAPERED_BOX",
          "name": "TORSO",
          "size": [1.08, 1.18, 0.72],
          "offset": [0, 2.9, 0],
          "material": "#9a6b3a",
          "parent": "PELVIS",
          "pivot": [0, 2.4, 0],
          "params": { "widthTop": 1.28, "depthTop": 0.78 },
          "faceColors": ["#654523", "#b98249", "#80582d", "#80582d", "#c9965b", "#4b331c"]
        },
        {
          "template": "TAPERED_BOX",
          "name": "CHEST",
          "size": [1.22, 0.6, 0.76],
          "offset": [0, 3.58, 0],
          "material": "#a97845",
          "parent": "TORSO",
          "pivot": [0, 3.18, 0],
          "params": { "widthTop": 1.34, "depthTop": 0.82 }
        },
        {
          "template": "TAPERED_BOX",
          "name": "NECK",
          "size": [0.32, 0.3, 0.28],
          "offset": [0, 4.22, 0],
          "material": "#e5bd9b",
          "parent": "CHEST",
          "pivot": [0, 4.05, 0],
          "params": { "widthTop": 0.28, "depthTop": 0.24 }
        }
      ]
    },
    {
      "slotId": "ARM_L",
      "pieces": [
        { "template": "TAPERED_BOX", "name": "CLAVICLE_L", "size": [0.36, 0.16, 0.34], "offset": [0.7, 3.9, 0], "material": "#a97845", "parent": "CHEST", "pivot": [0.52, 3.9, 0], "params": { "widthTop": 0.28, "depthTop": 0.3 } },
        { "template": "LIMB_LOFT", "name": "ARM_L_UPPER", "size": [0.38, 0.9, 0.36], "offset": [0.92, 3.32, 0], "material": "#a97845", "parent": "CLAVICLE_L", "pivot": [0.9, 3.78, 0], "params": { "sides": 6, "sections": [{ "y": -0.45, "radiusX": 0.13, "radiusZ": 0.13 }, { "y": 0, "radiusX": 0.18, "radiusZ": 0.16 }, { "y": 0.45, "radiusX": 0.2, "radiusZ": 0.17 }], "capTop": true, "capBottom": true } },
        { "template": "LIMB_LOFT", "name": "ARM_L_LOWER", "size": [0.32, 0.82, 0.3], "offset": [0.94, 2.48, 0], "material": "#e5bd9b", "parent": "ARM_L_UPPER", "pivot": [0.92, 2.88, 0], "params": { "sides": 6, "sections": [{ "y": -0.41, "radiusX": 0.12, "radiusZ": 0.12 }, { "y": 0, "radiusX": 0.15, "radiusZ": 0.14 }, { "y": 0.41, "radiusX": 0.17, "radiusZ": 0.15 }], "capTop": true, "capBottom": true } },
        { "template": "TAPERED_BOX", "name": "HAND_L", "size": [0.28, 0.28, 0.24], "offset": [0.94, 1.96, 0], "material": "#e5bd9b", "parent": "ARM_L_LOWER", "pivot": [0.94, 2.06, 0], "params": { "widthTop": 0.24, "depthTop": 0.22 } }
      ]
    },
    {
      "slotId": "ARM_R",
      "pieces": [
        { "template": "TAPERED_BOX", "name": "CLAVICLE_R", "size": [0.36, 0.16, 0.34], "offset": [-0.7, 3.9, 0], "material": "#a97845", "parent": "CHEST", "pivot": [-0.52, 3.9, 0], "params": { "widthTop": 0.28, "depthTop": 0.3 } },
        { "template": "LIMB_LOFT", "name": "ARM_R_UPPER", "size": [0.38, 0.9, 0.36], "offset": [-0.92, 3.32, 0], "material": "#a97845", "parent": "CLAVICLE_R", "pivot": [-0.9, 3.78, 0], "params": { "sides": 6, "sections": [{ "y": -0.45, "radiusX": 0.13, "radiusZ": 0.13 }, { "y": 0, "radiusX": 0.18, "radiusZ": 0.16 }, { "y": 0.45, "radiusX": 0.2, "radiusZ": 0.17 }], "capTop": true, "capBottom": true } },
        { "template": "LIMB_LOFT", "name": "ARM_R_LOWER", "size": [0.32, 0.82, 0.3], "offset": [-0.94, 2.48, 0], "material": "#e5bd9b", "parent": "ARM_R_UPPER", "pivot": [-0.92, 2.88, 0], "params": { "sides": 6, "sections": [{ "y": -0.41, "radiusX": 0.12, "radiusZ": 0.12 }, { "y": 0, "radiusX": 0.15, "radiusZ": 0.14 }, { "y": 0.41, "radiusX": 0.17, "radiusZ": 0.15 }], "capTop": true, "capBottom": true } },
        { "template": "TAPERED_BOX", "name": "HAND_R", "size": [0.28, 0.28, 0.24], "offset": [-0.94, 1.96, 0], "material": "#e5bd9b", "parent": "ARM_R_LOWER", "pivot": [-0.94, 2.06, 0], "params": { "widthTop": 0.24, "depthTop": 0.22 } }
      ]
    },
    {
      "slotId": "LEG_L",
      "pieces": [
        { "template": "LIMB_LOFT", "name": "LEG_L_UPPER", "size": [0.42, 1.02, 0.38], "offset": [0.32, 1.42, 0], "material": "#4f5f86", "parent": "PELVIS", "pivot": [0.32, 2.1, 0], "params": { "sides": 6, "sections": [{ "y": -0.51, "radiusX": 0.15, "radiusZ": 0.14 }, { "y": 0, "radiusX": 0.2, "radiusZ": 0.17 }, { "y": 0.51, "radiusX": 0.21, "radiusZ": 0.18 }], "capTop": true, "capBottom": true } },
        { "template": "LIMB_LOFT", "name": "LEG_L_LOWER", "size": [0.34, 0.9, 0.32], "offset": [0.32, 0.62, 0], "material": "#5b3a24", "parent": "LEG_L_UPPER", "pivot": [0.32, 0.96, 0], "params": { "sides": 6, "sections": [{ "y": -0.45, "radiusX": 0.13, "radiusZ": 0.14 }, { "y": 0, "radiusX": 0.17, "radiusZ": 0.15 }, { "y": 0.45, "radiusX": 0.17, "radiusZ": 0.16 }], "capTop": true, "capBottom": true } },
        { "template": "TAPERED_BOX", "name": "FOOT_L", "size": [0.36, 0.24, 0.68], "offset": [0.32, 0.12, 0.2], "material": "#4b2f1d", "parent": "LEG_L_LOWER", "pivot": [0.32, 0.18, 0], "params": { "widthTop": 0.28, "depthTop": 0.42, "offsetTopZ": -0.08 } }
      ]
    },
    {
      "slotId": "LEG_R",
      "pieces": [
        { "template": "LIMB_LOFT", "name": "LEG_R_UPPER", "size": [0.42, 1.02, 0.38], "offset": [-0.32, 1.42, 0], "material": "#4f5f86", "parent": "PELVIS", "pivot": [-0.32, 2.1, 0], "params": { "sides": 6, "sections": [{ "y": -0.51, "radiusX": 0.15, "radiusZ": 0.14 }, { "y": 0, "radiusX": 0.2, "radiusZ": 0.17 }, { "y": 0.51, "radiusX": 0.21, "radiusZ": 0.18 }], "capTop": true, "capBottom": true } },
        { "template": "LIMB_LOFT", "name": "LEG_R_LOWER", "size": [0.34, 0.9, 0.32], "offset": [-0.32, 0.62, 0], "material": "#5b3a24", "parent": "LEG_R_UPPER", "pivot": [-0.32, 0.96, 0], "params": { "sides": 6, "sections": [{ "y": -0.45, "radiusX": 0.13, "radiusZ": 0.14 }, { "y": 0, "radiusX": 0.17, "radiusZ": 0.15 }, { "y": 0.45, "radiusX": 0.17, "radiusZ": 0.16 }], "capTop": true, "capBottom": true } },
        { "template": "TAPERED_BOX", "name": "FOOT_R", "size": [0.36, 0.24, 0.68], "offset": [-0.32, 0.12, 0.2], "material": "#4b2f1d", "parent": "LEG_R_LOWER", "pivot": [-0.32, 0.18, 0], "params": { "widthTop": 0.28, "depthTop": 0.42, "offsetTopZ": -0.08 } }
      ]
    }
  ]
}
```
<!-- character-example:end -->

## Prueba En Frio

Despues de recibir un JSON:

1. Guardalo como template si pasa validacion.
2. Ejecuta `node scripts/check-ask-character-example.mjs` para validar este contrato.
3. Ejecuta `npm run check`.
4. Spawnea el template y prueba un clip walk/idle desde el panel de animacion.

Para probar estilos distintos, pide dos variaciones:

- `Aldeano N64 bajo y amable, con ropa marron y gorro redondo`.
- `Guardia PSX delgado, con torso ahusado, botas grandes, hombrera decorativa y cara decal seria`.
