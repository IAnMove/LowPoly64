# Prompt para generar objetos 3D con LLMs externos

Copia y pega el siguiente prompt en tu LLM favorito (Grok, Perplexity, ChatGPT, etc.) para generar objetos 3D importables en LowPoly64.

---

## Prompt

```
Quiero crear un objeto 3D low-poly estilo N64/PS1 para un editor 3D.

Devuelve SOLO un JSON válido (sin markdown, sin explicación) con esta estructura:

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
  ]
}

Tipos de geometría soportados y sus parámetros:

- cube: { width, height, depth }
- sphere: { radius, widthSegments, heightSegments }
- cylinder: { radiusTop, radiusBottom, height, radialSegments }
- cone: { radius, height, radialSegments }
- plane: { width, height }
- capsule: { radius, length, capSegments, radialSegments }
- torus: { radius, tube, radialSegments, tubularSegments }

Campos opcionales por pieza (tienen defaults):
- rotation: [0, 0, 0] (radianes)
- scale: [1, 1, 1]
- color: "#ffcc00" (usa colores retro saturados)
- name: "PIECE_N"

Reglas:
- Usa pocos segmentos para mantener el estilo low-poly (6-8 segmentos)
- Compón el objeto con múltiples piezas simples
- Las posiciones son en unidades (1 unidad ≈ 1 metro)
- El objeto debe estar centrado en X/Z y apoyado en Y=0
- Usa colores hex retro: saturados, brillantes, estilo N64

Ejemplo - Árbol low-poly:

{
  "name": "ARBOL",
  "pieces": [
    {
      "geometry": { "type": "cylinder", "params": { "radiusTop": 0.3, "radiusBottom": 0.5, "height": 3, "radialSegments": 6 } },
      "color": "#8b4513",
      "name": "TRONCO",
      "position": [0, 1.5, 0]
    },
    {
      "geometry": { "type": "cone", "params": { "radius": 2, "height": 3, "radialSegments": 6 } },
      "color": "#228b22",
      "name": "COPA_1",
      "position": [0, 4.5, 0]
    },
    {
      "geometry": { "type": "cone", "params": { "radius": 1.5, "height": 2.5, "radialSegments": 6 } },
      "color": "#2e8b57",
      "name": "COPA_2",
      "position": [0, 6.5, 0]
    }
  ]
}

Ahora crea: [DESCRIBE AQUÍ TU OBJETO]
```

---

## Cómo importar

1. Copia la respuesta JSON del LLM
2. En LowPoly64, haz clic en **IMPORTAR OBJETO** en el panel izquierdo
3. Pega el JSON en el textarea
4. Haz clic en **Importar**

También puedes guardar el JSON como archivo `.json` y cargarlo con el botón de archivo en el modal.
