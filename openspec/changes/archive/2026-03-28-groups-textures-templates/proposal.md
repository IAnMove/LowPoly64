## Why

El editor LowPoly64 permite crear objetos individuales pero no tiene forma de agrupar múltiples objetos para moverlos/exportarlos como unidad. Las texturas se aplican de forma básica sin control de UV mapping (offset, repeat, rotación), y no se preservan correctamente en la exportación GLB. Además, la biblioteca de plantillas es limitada (5 templates) y añadir nuevas requiere tocar el código directamente, sin una estructura extensible. Se necesita también un sistema para importar objetos 3D definidos como JSON desde LLMs externos (Grok, Perplexity, etc.), con un prompt documentado para generar esas definiciones. Además hay problemas de UX: la carga de texturas no es intuitiva, los botones Save/Load no están claros, y los atajos de teclado en la barra superior no se ven bien.

## What Changes

- Añadir sistema de agrupación manual de objetos: seleccionar varios objetos y agruparlos en un Group, con opción de desagrupar
- Mejorar el sistema de texturas: controles de UV (offset, repeat, rotación), preview de textura en panel, y que las texturas se embutan correctamente en la exportación GLB
- Mejorar UX de carga de texturas: que sea más claro cómo cargar y aplicar texturas a objetos
- Expandir la biblioteca de plantillas con muchos más modelos (árbol, roca, casa, puerta, ventana, escalera, farola, valla, puente, vehículo, NPC, cofre, poción, espada, escudo, etc.)
- Refactorizar el sistema de plantillas para que sea declarativo/data-driven: las plantillas se definen como datos (JSON-like), no como funciones hardcodeadas
- Añadir importación de objetos desde JSON: el usuario puede pegar/cargar un JSON generado por un LLM externo y el editor crea el objeto 3D
- Crear `ask.md` con el prompt para pedir a LLMs externos que generen definiciones JSON de objetos 3D
- Crear un README.md del proyecto con documentación completa: arquitectura, uso, y prompt de ejemplo
- Corregir UX de Save/Load: añadir confirmación, notificación visual, y que quede claro qué hacen
- Mover los atajos de teclado a un tooltip centrado en el viewport que aparece al hover, en vez de texto comprimido en la barra superior

## Capabilities

### New Capabilities
- `object-grouping`: Agrupar/desagrupar objetos manualmente, selección de grupo vs pieza individual, mover grupo completo
- `template-registry`: Sistema declarativo de registro de plantillas, donde cada plantilla es un objeto de datos con piezas definidas, fácil de extender sin tocar lógica core
- `json-object-import`: Importar objetos 3D desde definiciones JSON (misma estructura que el template registry), con prompt documentado en ask.md para generarlos con LLMs externos
- `project-readme`: README.md y ask.md con documentación del proyecto, prompts para LLMs, y guía de plantillas

### Modified Capabilities
- `texture-system`: Añadir controles de UV mapping (offset, repeat, rotación), preview de textura en panel, mejorar UX de carga de textura, y asegurar que texturas se embutan en GLB exportado
- `glb-export`: Asegurar que texturas embebidas se incluyan correctamente en el .glb exportado
- `template-library`: Expandir con ~15 nuevas plantillas y migrar las existentes al nuevo sistema declarativo
- `object-selection`: Añadir soporte para selección de grupo completo (doble clic) además de selección de pieza individual
- `scene-persistence`: Corregir UX de Save/Load con confirmación y notificación visual
- `keyboard-shortcuts`: Mover indicador de atajos a tooltip centrado en viewport al hacer hover sobre un icono de ayuda

## Impact

- **`src/modules/templates.js`**: Reescritura completa — migrar de funciones hardcodeadas a sistema declarativo con registry
- **`src/modules/textures.js`**: Añadir controles UV, mejorar UX de carga, lógica de embedding para export
- **`src/modules/export.js`**: Modificar para embutir texturas en el GLB
- **`src/modules/selection.js`**: Añadir lógica de selección de grupo
- **`src/modules/actions.js`**: Añadir funciones groupSelected/ungroupSelected
- **`src/modules/ui.js`**: Añadir controles UV al panel, controles de grupo, notificaciones visuales
- **`src/modules/persistence.js`**: Añadir confirmación y feedback visual en Save/Load
- **`src/modules/json-import.js`**: Nuevo módulo para parsear e importar objetos JSON
- **`index.html`**: Nuevos botones, sección de plantillas dinámica, controles UV, modal de importación JSON, tooltip de atajos, mejora UX general
- **`README.md`**: Nuevo archivo con documentación completa del proyecto
- **`ask.md`**: Nuevo archivo con prompt para LLMs externos
- **`src/modules/shortcuts.js`**: Añadir atajos de grupo y mover indicador a tooltip
