## Why

Retrovisor ya puede construir modelos desde primitivas, plantillas y `custom` meshes, pero no tiene un flujo nativo para partir de SVGs. `3dsvg` ya demuestra un pipeline funcional para convertir SVG, texto y pixel art en geometría extruida; adaptarlo a nuestro stack permitiría crear logos, iconos, props planos y bloques estilizados sin salir del editor ni depender de JSON externo.

## What Changes

- Añadir un `svg-workbench` dentro del editor actual con modos de entrada `upload`, `svg code`, `pixel draw` y `text`, más preview antes de insertar en escena.
- Portar el núcleo del pipeline de `3dsvg` a módulos vanilla del repo actual: parseo de SVG, rasterizado de SVGs basados en `stroke`, conversión texto->SVG y extrusión a geometría Three.js.
- Convertir el resultado extruido a uno o varios meshes `custom` compatibles con el modelo interno del editor, insertados en la escena con undo/redo, selección, materiales, texturas y export GLB existentes.
- Persistir metadatos del origen SVG y de los ajustes de extrusión para poder reabrir el workbench y regenerar un modelo SVG ya insertado.
- Añadir guardrails de complejidad y feedback de progreso para que SVGs grandes no bloqueen la UI ni degraden el editor silenciosamente.

## Capabilities

### New Capabilities
- `svg-workbench`: crear, editar, previsualizar y reabrir fuentes SVG dentro del editor actual usando código SVG, subida de archivo, pixel editor y texto.
- `svg-model-import`: convertir fuentes SVG en grupos importados al editor como geometría `custom`, compatibles con transformación, materiales, texturas, guardado de escena y export GLB.

### Modified Capabilities
- `scene-persistence`: guardar y restaurar los metadatos del origen SVG y los parámetros de reconstrucción para que un modelo derivado de SVG siga siendo editable tras `SAVE`/`LOAD`.

## Impact

- Código afectado: `index.html`, `src/main.js`, `src/bindings.js`, `src/modules/viewport/persistence.js` y nuevos módulos bajo `src/modules/svg/`.
- Dependencias: reutilización de `three/examples/jsm/loaders/SVGLoader.js` y `BufferGeometryUtils`, y alta probabilidad de añadir `opentype.js` para igualar el modo texto de `3dsvg`.
- Arquitectura: no se integrará React/Next dentro de Retrovisor; se portarán únicamente funciones puras y algoritmos del repo `3dsvg`.
- Riesgos principales: SVGs complejos pueden producir mallas pesadas; el flujo debe incluir preflight, límites y UX de cancelación/progreso.
