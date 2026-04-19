# Prompt para generar animaciones 3D con LLMs externos

Copia y pega el siguiente prompt en tu LLM favorito para generar animaciones importables en LowPoly64.

Si el modelo es un personaje, vehiculo o criatura con `archetype` + `slots`, el flujo preferido ya no es este formato de tracks por pieza. En ese caso usa **CharacterModel** en `ask.md` y anima el rig via **Skeleton JSON** y **Animation Profile JSON**.

Este documento queda para:

- objetos legacy sin rig
- prototipos rapidos
- props que se animan por piezas propias

Para modelos con rig:

1. crea o ajusta el modelo en formato **CharacterModel**
2. define o edita animaciones en el **Skeleton JSON**
3. expone el subset final con **Animation Profile JSON**

---

## Prompt (animacion sola, formato legacy por piezas)

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
      "interpolation": "linear",
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
- "visible": muestra/oculta el objeto [1] o [0]

Interpolacion (campo opcional):
- "linear" (default): transicion recta entre keyframes
- "smooth": transicion suave catmull-rom (no aplica a rotation)
- "step": salto discreto, sin transicion

Reglas:
- "target" debe coincidir exactamente con el nombre de una pieza del objeto (userData.name)
- La interpolacion es lineal por defecto
- "duration" es en segundos
- "loop": true para repetir, false para una sola vez
- Los valores de rotacion son en radianes (PI = 3.14159)
- Puedes animar multiples piezas con multiples tracks
- El primer y ultimo keyframe deberian coincidir si loop=true
- Si las piezas tienen "pivot", la rotacion ocurre alrededor del punto de pivote (articulacion), no del centro de la pieza. Esto permite animaciones naturales de extremidades (brazos desde hombro, piernas desde cadera).
- Si las piezas tienen "parent", al animar el padre los hijos se mueven con el (ej: rotar TORSO mueve brazos/cabeza automaticamente).

Para varias animaciones a la vez, usa este formato batch:

{
  "animations": [
    { "name": "idle", "duration": 2, "loop": true, "tracks": [...] },
    { "name": "walk", "duration": 1, "loop": true, "tracks": [...] }
  ]
}

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

Hay varias formas de importar animaciones:

### Desde el modal (IMPORTAR OBJETO JSON)
1. Pega el JSON de la animacion en el textarea principal
2. El editor detecta automaticamente que es una animacion (no un objeto)
3. Se aplica al grupo seleccionado

### Desde el Modo Animacion
1. Selecciona un grupo y entra al **MODO ANIMACION**
2. Pega el JSON en el textarea del panel de animaciones
3. Haz clic en **IMPORTAR**

### Embebido en un objeto
Incluye `"animations": [...]` junto a `"pieces"` en el JSON del objeto (ver `ask.md`).

---

## Para CharacterModel / rig

No pidas tracks contra nombres arbitrarios de piezas como formato principal. Lo preferido es:

- `ask.md` seccion **CharacterModel (CM)** para el modelo
- `ask.md` seccion **Skeleton JSON** para bones, bindings y clips
- `ask.md` seccion **Animation Profile JSON** para elegir que animaciones exponer en la UI
