# Prompt para generar objetos 3D con LLMs externos

Copia y pega el siguiente prompt en tu LLM favorito (Grok, Perplexity, ChatGPT, etc.) para generar objetos 3D importables en LowPoly64.

---

## Prompt (objeto + animaciones)

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
- custom: { vertices, faces } with triangular faces only

### Campos opcionales por pieza:
- rotation: [0, 0, 0] (radianes)
- scale: [1, 1, 1]
- color: "#ffcc00" (usa colores retro saturados)
- name: "PIECE_N"
- pivot: [x, y, z] — punto de rotacion de la pieza (ej: el hombro para un brazo). Si se omite, rota desde su centro geometrico. Usar para extremidades, cabeza, puertas, etc.
- parent: "NOMBRE_PADRE" — pieza padre en la jerarquia. Al mover/rotar el padre, los hijos se mueven con el. Ej: brazos y cabeza como hijos del torso. Las posiciones pasan a ser relativas al padre.

### Propiedades animables por track:
- "position": mueve la pieza [x, y, z] en unidades
- "rotation": rota la pieza [rx, ry, rz] en radianes
- "scale": escala la pieza [sx, sy, sz]
- "visible": muestra/oculta la pieza [1] o [0]

### Interpolacion (campo opcional en cada track):
- "linear" (default): transicion recta entre keyframes
- "smooth": transicion suave catmull-rom (no aplica a rotation)
- "step": salto discreto, sin transicion

### Reglas para el objeto:
- Usa pocos segmentos para mantener el estilo low-poly (6-8 segmentos)
- Compon el objeto con multiples piezas simples (cubos, cilindros, esferas, conos)
- Las posiciones son en unidades (1 unidad ≈ 1 metro)
- El objeto debe estar centrado en X/Z y apoyado en Y=0
- Usa colores hex retro: saturados, brillantes, estilo N64
- IMPORTANTE: cada pieza debe tener un "name" unico y descriptivo en MAYUSCULAS (ej: "BRAZO_IZQ", "CABEZA", "TORSO")
- Para personajes: usa "pivot" en las articulaciones (hombro, cadera, cuello) y "parent" para crear jerarquia (brazos/cabeza hijos del torso). Esto hace que las animaciones se vean naturales.
- "position" es donde se VE la pieza. "pivot" es el punto desde donde rota. Ejemplo: un brazo en position [-1, 2.8, 0] con pivot [-1, 3.4, 0] (hombro) rota desde el hombro, no desde el centro del brazo.

### Reglas para las animaciones:
- "target" debe coincidir EXACTAMENTE con el "name" de una pieza del objeto
- "duration" es en segundos
- Los valores de rotacion son en radianes (PI = 3.14159, PI/2 = 1.5708)
- El primer y ultimo keyframe deberian tener el mismo valor si loop=true (para ciclo suave)
- Puedes animar multiples piezas con multiples tracks en una misma animacion
- Puedes incluir varias animaciones (idle, walk, attack, etc.)

### Ejemplo - Personaje con pivot, parent y animaciones:

Nota: TORSO es la raiz. Cabeza, brazos y piernas son hijos del torso (se mueven con el). Cada extremidad tiene un pivot en su articulacion (hombro, cadera, cuello) para que rote de forma natural.

{
  "name": "WARRIOR",
  "pieces": [
    {
      "geometry": { "type": "cube", "params": { "width": 1.2, "height": 1.5, "depth": 0.8 } },
      "color": "#cc3333",
      "name": "TORSO",
      "position": [0, 2.75, 0]
    },
    {
      "geometry": { "type": "sphere", "params": { "radius": 0.5, "widthSegments": 6, "heightSegments": 4 } },
      "color": "#ffcc88",
      "name": "CABEZA",
      "position": [0, 4, 0],
      "pivot": [0, 3.5, 0],
      "parent": "TORSO"
    },
    {
      "geometry": { "type": "cube", "params": { "width": 0.4, "height": 1.2, "depth": 0.4 } },
      "color": "#cc3333",
      "name": "BRAZO_IZQ",
      "position": [-1, 2.8, 0],
      "pivot": [-1, 3.4, 0],
      "parent": "TORSO"
    },
    {
      "geometry": { "type": "cube", "params": { "width": 0.4, "height": 1.2, "depth": 0.4 } },
      "color": "#cc3333",
      "name": "BRAZO_DER",
      "position": [1, 2.8, 0],
      "pivot": [1, 3.4, 0],
      "parent": "TORSO"
    },
    {
      "geometry": { "type": "cube", "params": { "width": 0.5, "height": 1.4, "depth": 0.5 } },
      "color": "#3344aa",
      "name": "PIERNA_IZQ",
      "position": [-0.35, 1, 0],
      "pivot": [-0.35, 1.7, 0],
      "parent": "TORSO"
    },
    {
      "geometry": { "type": "cube", "params": { "width": 0.5, "height": 1.4, "depth": 0.5 } },
      "color": "#3344aa",
      "name": "PIERNA_DER",
      "position": [0.35, 1, 0],
      "pivot": [0.35, 1.7, 0],
      "parent": "TORSO"
    }
  ],
  "animations": [
    {
      "name": "idle",
      "duration": 2.0,
      "loop": true,
      "tracks": [
        {
          "target": "TORSO",
          "property": "scale",
          "keyframes": [
            { "time": 0, "value": [1, 1, 1] },
            { "time": 1, "value": [1.02, 1.05, 1.02] },
            { "time": 2, "value": [1, 1, 1] }
          ]
        },
        {
          "target": "CABEZA",
          "property": "rotation",
          "interpolation": "smooth",
          "keyframes": [
            { "time": 0, "value": [0, 0, 0] },
            { "time": 1, "value": [0.05, 0.1, 0] },
            { "time": 2, "value": [0, 0, 0] }
          ]
        }
      ]
    },
    {
      "name": "walk",
      "duration": 1.0,
      "loop": true,
      "tracks": [
        {
          "target": "PIERNA_IZQ",
          "property": "rotation",
          "keyframes": [
            { "time": 0, "value": [0.5, 0, 0] },
            { "time": 0.5, "value": [-0.5, 0, 0] },
            { "time": 1, "value": [0.5, 0, 0] }
          ]
        },
        {
          "target": "PIERNA_DER",
          "property": "rotation",
          "keyframes": [
            { "time": 0, "value": [-0.5, 0, 0] },
            { "time": 0.5, "value": [0.5, 0, 0] },
            { "time": 1, "value": [-0.5, 0, 0] }
          ]
        },
        {
          "target": "BRAZO_IZQ",
          "property": "rotation",
          "keyframes": [
            { "time": 0, "value": [-0.4, 0, 0] },
            { "time": 0.5, "value": [0.4, 0, 0] },
            { "time": 1, "value": [-0.4, 0, 0] }
          ]
        },
        {
          "target": "BRAZO_DER",
          "property": "rotation",
          "keyframes": [
            { "time": 0, "value": [0.4, 0, 0] },
            { "time": 0.5, "value": [-0.4, 0, 0] },
            { "time": 1, "value": [0.4, 0, 0] }
          ]
        },
        {
          "target": "TORSO",
          "property": "position",
          "keyframes": [
            { "time": 0, "value": [0, 2.75, 0] },
            { "time": 0.25, "value": [0, 2.85, 0] },
            { "time": 0.5, "value": [0, 2.75, 0] },
            { "time": 0.75, "value": [0, 2.85, 0] },
            { "time": 1, "value": [0, 2.75, 0] }
          ]
        }
      ]
    }
  ]
}

Ahora crea: [DESCRIBE AQUI TU OBJETO/PERSONAJE]
```

---

## Como importar

1. Copia la respuesta JSON del LLM
2. En LowPoly64, haz clic en **IMPORTAR OBJETO JSON** en el panel izquierdo
3. Pega el JSON en el textarea — el editor detecta automaticamente si es un objeto, animacion, o ambos
4. Haz clic en **Importar**

El modal acepta tres formatos:
- **Objeto**: `{ "pieces": [...] }` — con o sin `"animations"`
- **Animacion sola**: `{ "name": "idle", "tracks": [...] }` — se aplica al grupo seleccionado
- **Batch de animaciones**: `{ "animations": [...] }` — varias animaciones a la vez al grupo seleccionado

Tambien puedes guardar el JSON como archivo `.json` y cargarlo con el boton de archivo.

## Exportar JSON

Una vez creado o importado un objeto, puedes:
- **COPIAR JSON**: copia al portapapeles el JSON del grupo seleccionado (objeto + animaciones) en el mismo formato compatible con importar
- **DESCARGAR**: descarga como archivo `.json`

Estos botones aparecen en el panel de propiedades cuando seleccionas un grupo, y tambien en el modo animacion.

## Modo Animacion

Selecciona un grupo y pulsa **MODO ANIMACION** en propiedades:
- Se oculta el resto de la escena, solo ves el objeto
- Panel dedicado con lista de animaciones, play individual, eliminar
- Importar nuevas animaciones directamente
- Exportar GLB o JSON del objeto con sus animaciones
- **ESC** para volver a la escena completa
