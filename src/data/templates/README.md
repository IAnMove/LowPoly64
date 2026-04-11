# Templates

Cada asset reutilizable vive en su propio JSON dentro de esta carpeta.

Estructura actual:

- `src/data/templates/furniture/*.json`
- `src/data/templates/nature/*.json`
- `src/data/templates/architecture/*.json`
- `src/data/templates/props/*.json`
- `src/data/templates/characters/*.json`

## Dos formatos distintos

`Import object` minimo:

```json
{
  "name": "RETRO CHEST",
  "pieces": []
}
```

`Template file` reutilizable:

```json
{
  "id": "hero",
  "name": "Heroe",
  "category": "Personajes",
  "pieces": [],
  "animations": []
}
```

Regla practica:

- Si vas a importar algo puntual, basta con `name` + `pieces`.
- Si va a formar parte de la libreria del juego, usa `id` + `name` + `category` + `pieces`.
- Si el asset es un personaje, enemigo, animal o interactuable con movimiento, normalmente debe conservar `animations`.

## Campos por pieza

Cada entrada de `pieces` puede usar:

- `name`: nombre unico y estable.
- `geometry`: `{ "type": "...", "params": { ... } }`
- `color`: hex como `#ffcc00`
- `vertexColors`: gradiente `{ "top": "#...", "bottom": "#..." }` o array por vertice.
- `faceColors`: array opcional por cara para look PSX/N64 mas marcado.
- `opacity`: numero entre `0` y `1`.
- `position`: `[x, y, z]`
- `rotation`: opcional, en radianes.
- `scale`: opcional.
- `pivot`: opcional, origen real de giro.
- `parent`: opcional, nombre exacto de otra pieza existente.
- `texture`: opcional. Usa la misma estructura serializada que exporta la escena para aplicar una textura por defecto a una pieza.

Tipos soportados:

- `cube`
- `sphere`
- `cylinder`
- `cone`
- `plane`
- `capsule`
- `torus`
- `wedge`
- `pyramid`
- `custom`

## Campos por pieza en CharacterModel

Cada entrada de `slots[].pieces` puede usar, ademas de lo basico:

- `params`: override opcional para parametros extra de geometria.
  Ejemplo: `radialSegments`, `widthSegments`, `heightSegments`.
- `vertexColors`
- `faceColors`
- `opacity`
- `texture`

Regla practica:

- Usa `template` + `size` como base del slot.
- Usa `template: "CUSTOM"` con `params.vertices` + `params.faces` cuando la silueta necesite escapar del look cubico puro.
- Usa `params` solo cuando necesites afinar la geometria.
- Usa `vertexColors` o `faceColors` cuando el template ya merezca acabado final y no una simple caja base.
- Usa `texture` solo en piezas concretas y dedicadas, por ejemplo una placa facial para personajes mascota o portada.

## Campos de animacion

Cada entrada de `animations` puede usar:

- `name`
- `duration`
- `loop`
- `tracks`

Cada `track` usa:

- `target`: nombre exacto de una pieza ya existente.
- `property`: `position`, `rotation`, `scale` o `visible`
- `keyframes`: array de `{ "time": number, "value": [...] }`

Notas importantes:

- `rotation` usa `[rx, ry, rz]` en radianes.
- `visible` usa `[1]` o `[0]`.
- Si el `target` no coincide exactamente con una pieza, ese track no funcionara.

## Formas recomendadas de crear JSON

1. Escribirlo a mano.
   Mejor cuando quieres control total de nombres, pivots y jerarquia.
2. Duplicar un template cercano.
   Mejor cuando el asset es una variante directa.
3. Construir dentro del editor y exportar JSON.
   Mejor cuando prefieres modelar visualmente primero.
4. Pedir a un LLM primero el objeto y despues la animacion.
   Mejor cuando quieres la maxima calidad y menos roturas.
5. Pedir a un LLM un template completo.
   Mejor cuando ya sabes `id`, `category` y el set de animaciones que debe traer.

## Flujo recomendado para assets buenos

1. Decide si el asset es estatico o animado antes de generarlo.
2. Define los nombres de pieza y el plan de pivots.
3. Genera o modela el objeto.
4. Corrige estructura y proporciones.
5. Genera animaciones solo cuando la estructura ya este cerrada.
6. Guarda el resultado final como template reutilizable.

## Calidad

Checklist de objeto:

- Silueta legible.
- Colores diferenciados por funcion.
- Numero de piezas razonable.
- Nombres semanticos y estables.
- Pivots correctos donde haya movimiento.

Checklist de animacion:

- Solo animar lo que importa.
- Idle para assets vivos o activos.
- One-shot para ataques, daño, muerte, abrir, cerrar o activar.
- Contactos coherentes respecto a pivots.
- No quitar `animations` de un personaje solo para simplificar el JSON.

## Edicion diaria

Flujo simple:

1. Abre el JSON del asset que quieras cambiar.
2. Modifica `pieces` y, si aplica, `animations`.
3. Guarda el fichero.
4. Recarga la app.

Los templates se detectan automaticamente en la siguiente carga si el fichero esta dentro de `src/data/templates/**` y tiene los campos requeridos.
