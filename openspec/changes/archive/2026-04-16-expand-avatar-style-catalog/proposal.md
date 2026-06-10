## Why

El catálogo actual de `Avatar Forge` todavía es demasiado corto y desigual para sostener un creador de avatares convincente. Antes de seguir añadiendo piezas sueltas, hace falta definir un catálogo objetivo por tipo, un criterio visual claro y un flujo de creación por pasadas con validación real en la app.

## What Changes

- Definir un catálogo objetivo ampliado para los tipos de estilo visibles en `Avatar Forge`, con un mínimo de 15 presets curados por tipo en `head shape`, `hair`, `eyes`, `brows`, `mouth`, `accessory` y `palette`.
- Introducir una librería de estilos con metadatos de familia visual, compatibilidad y estado de validación para que el catálogo no crezca de forma caótica.
- Planificar la implementación por pasadas, empezando por la definición editorial de todos los presets y continuando con bloques verificables de creación y revisión visual en la app.
- Actualizar `Avatar Forge` para consumir el catálogo ampliado sin degradar la experiencia: defaults legibles, lectura clara por familia y validación del resultado en preview.

## Capabilities

### New Capabilities
- `avatar-style-library`: Define el catálogo ampliado de presets, su taxonomía visual, las reglas de curación y el flujo de rollout/validación por pasadas.

### Modified Capabilities
- `avatar-forge-mode`: Cambia los requisitos del builder para soportar un catálogo de estilos mucho más amplio, defaults útiles y revisión consistente de presets durante la creación.

## Impact

- `src/data/avatar/catalog.js` y posible división del catálogo en módulos por tipo/familia.
- `src/modules/avatar/avatar-recipe.js`, `avatar-ui.js`, `avatar-head-svg.js` y builders que consumen presets.
- `tests/e2e/avatar-forge.spec.js` y QA visual basada en capturas de `127.0.0.1:5178`.
- Nuevos artefactos de auditoría visual y seguimiento de pasadas para marcar presets como validados.
