## Why

Avatar Forge ya tiene el flujo nuevo de cabeza por molde, pero los rasgos y complementos todavia no tienen una forma suficientemente repetible de colocarse, revisarse y multiplicarse sin arrastrar offsets rotos. Antes de ampliar catalogo, necesitamos un workflow de authoring que coloque un primer elemento bien, lo valide visualmente en la app real y solo despues genere variantes a partir de esa base.

## What Changes

- Corregir el encuadre de revision de cabeza para que al seleccionar una cabeza o rasgo el preview mire el frontal canonico del avatar, no la espalda.
- Definir un flujo iterativo de placement por tipo de rasgo: empezar por un tipo concreto, validar un preset base, bloquear sus anchors/metricas y generar variantes desde ese patron.
- Usar ojos como primer candidato recomendado porque son simetricos, visibles, faciles de medir y permiten detectar rapido errores de frontal, escala, separacion y altura.
- Anadir diagnosticos de revision que combinen bounds geometricos, screenshots de Playwright y comparacion visual sobre recetas representativas.
- Formalizar cuando se necesita intervencion humana: aprobacion visual del primer preset base, aprobacion del lenguaje visual de cada familia y decision sobre cambios artisticos ambiguos.
- Preparar una fase final de import/export SVG de rasgos o complementos para que un objeto pueda salir como SVG editable, ser modificado por un LLM u otra herramienta, y volver a entrar manteniendo metadata de montaje.

## Capabilities

### New Capabilities
- `avatar-feature-authoring-workflow`: flujo de authoring, validacion visual, derivacion de variantes y futura ida/vuelta SVG para rasgos y complementos de Avatar Forge.

### Modified Capabilities
- `avatar-forge-mode`: el preview de cabeza debe reencuadrar hacia el frontal canonico del avatar y servir como superficie fiable de revision item a item.
- `avatar-style-library`: las variantes nuevas de rasgos y complementos deben derivarse de presets base validados, con metadata suficiente para auditoria y montaje repetible.

## Impact

- Codigo afectado: `src/modules/avatar/avatar-ui.js`, `src/modules/avatar/avatar-head-svg.js`, `src/data/avatar/catalog/`, `src/modules/svg/`, y `tests/e2e/avatar-forge.spec.js`.
- Datos afectados: presets de ojos, cejas, nariz, boca, orejas, pelo y accesorios; placement defaults; anchors por molde; metadata de import/export SVG.
- Verificacion: build de Vite, auditorias existentes de avatar, una prueba E2E de camara frontal y pruebas visuales/screenshot para cada primer preset aprobado.
- Riesgo principal: generar muchas variantes antes de tener una base correcta. La mitigacion es tratar cada familia como una cola secuencial con gate visual antes de multiplicar.
