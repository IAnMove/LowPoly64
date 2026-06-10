# Spec: prompt-templates

## Overview
Librería de prompts predefinidos para generación de texturas PS1/retro, accesible desde el panel del editor de texturas y desde el modal de prompt expandido.

## Categorías

| Categoría | Templates | Descripción |
|-----------|-----------|-------------|
| CHARACTER — FACE | 6 | Caras de personajes para UV face maps (goblin, humano, esqueleto, orco, elfo, enano) |
| CHARACTER — BODY | 4 | Torsos y armaduras (placa, robe, cuero, bárbaro) |
| ENVIRONMENT — GROUND | 8 | Suelos top-down (asfalto, hierba, piedra, tierra, arena, agua, lava, nieve) |
| ENVIRONMENT — WALLS | 5 | Paredes seamless (piedra, madera, metal, adobe, mazmorra) |
| PROPS & OBJECTS | 3 | Objetos planos unwrapped (cofre, barril, espada) |

## Estructura de cada template

Cada template es un string listo para enviar a OpenAI/SD. Incluye:
1. **Sujeto**: qué se quiere generar (ej: `goblin facial traits`)
2. **Características visuales**: colores, materiales, detalles (ej: `green skin, wide nose`)
3. **Parámetros de UV/vista**: orientación, simetría (ej: `front orthographic view, symmetrical`)
4. **Estilo retro**: siempre incluye `PS1 videogame texture, limited palette, visible dithering`
5. **Restricciones**: lo que NO debe aparecer (ej: `no background, no portrait`)

## Comportamiento en UI

- `<select>` con `<optgroup>` — versión compacta en el panel lateral del texture editor
- `<select>` con `<optgroup>` — versión completa en el modal expandido  
- Al seleccionar un template: `applyPromptTemplate(selectEl)` carga el valor en `tex-gen-prompt-full` y resetea el select a la opción vacía
- Los templates son puntos de partida: el usuario puede editar el prompt resultante antes de generar
