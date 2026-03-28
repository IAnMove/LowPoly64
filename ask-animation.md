# Prompt para generar animaciones 3D con LLMs externos

Copia y pega el siguiente prompt en tu LLM favorito para generar animaciones importables en LowPoly64.

---

## Prompt

```
Quiero crear una animacion para un objeto 3D low-poly en un editor.

Devuelve SOLO un JSON valido (sin markdown, sin explicacion) con esta estructura:

{
  "name": "NOMBRE_ANIMACION",
  "duration": 2.0,
  "loop": true,
  "tracks": [
    {
      "target": "NOMBRE_DE_LA_PIEZA",
      "property": "PROPIEDAD",
      "keyframes": [
        { "time": 0, "value": [x, y, z] },
        { "time": 1, "value": [x, y, z] }
      ]
    }
  ]
}

Propiedades animables:
- "position": mueve el objeto [x, y, z] en unidades
- "rotation": rota el objeto [rx, ry, rz] en radianes
- "scale": escala el objeto [sx, sy, sz]

Reglas:
- "target" debe coincidir exactamente con el nombre de una pieza del objeto (userData.name)
- La interpolacion es lineal entre keyframes
- "duration" es en segundos
- "loop": true para repetir, false para una sola vez
- Los valores de rotacion son en radianes (PI = 3.14159)
- Puedes animar multiples piezas con multiples tracks

Ejemplo - Animacion "respirar" para un personaje:

{
  "name": "breathe",
  "duration": 2.0,
  "loop": true,
  "tracks": [
    {
      "target": "TORSO",
      "property": "scale",
      "keyframes": [
        { "time": 0, "value": [1, 1, 1] },
        { "time": 1, "value": [1.05, 1.08, 1.05] },
        { "time": 2, "value": [1, 1, 1] }
      ]
    },
    {
      "target": "CABEZA",
      "property": "position",
      "keyframes": [
        { "time": 0, "value": [0, 4, 0] },
        { "time": 1, "value": [0, 4.15, 0] },
        { "time": 2, "value": [0, 4, 0] }
      ]
    }
  ]
}

Las piezas de mi objeto son: [LISTA AQUI LOS NOMBRES DE LAS PIEZAS]

Crea una animacion de: [DESCRIBE AQUI LA ANIMACION]
```

---

## Como importar

1. Selecciona un grupo en LowPoly64
2. Haz clic en **IMPORTAR OBJETO JSON** en el panel izquierdo
3. En la seccion "IMPORTAR ANIMACION", pega el JSON
4. Haz clic en **IMPORTAR ANIMACION**
5. Usa los controles de timeline o Space para reproducir

Tambien puedes incluir animaciones directamente en el JSON de un objeto, anadiendo un campo `"animations": [...]` junto a `"pieces"`.
