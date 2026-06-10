## Why

El editor LowPoly64 carece de tres capacidades fundamentales para un flujo de trabajo productivo: no hay forma de deshacer errores (un delete o move accidental obliga a recargar la escena), la exportación GLB siempre exporta toda la escena sin opción de exportar solo lo seleccionado, y no existe sistema de animación — los objetos son completamente estáticos, lo que limita su utilidad en juegos retro.

## What Changes

- **Sistema Undo/Redo**: historial de acciones con Ctrl+Z / Ctrl+Shift+Z que permite deshacer/rehacer operaciones (crear, eliminar, mover, rotar, escalar, cambiar material, agrupar/desagrupar, importar)
- **Exportación selectiva**: si hay objetos seleccionados, exportar GLB solo con esos objetos; si no hay selección, exportar todo (comportamiento actual)
- **Selector de color mejorado**: paleta de swatches previsualizados + selector HTML nativo `<input type="color">` para elegir cualquier color. El color picker se sincroniza con la paleta y el panel de propiedades
- **Sistema de animaciones**:
  - Definición de animaciones vía JSON (mismo enfoque que la importación de objetos con `ask.md`)
  - Tipos de animación: translate, rotate, scale con keyframes
  - Timeline visual básico para previsualizar animaciones
  - Compatibilidad con GLB: las animaciones se exportan como AnimationClip en el archivo .glb
  - Prompt `ask-animation.md` para generar animaciones con LLMs externos

## Capabilities

### New Capabilities
- `undo-system`: Sistema de undo/redo con historial de acciones, command pattern, Ctrl+Z / Ctrl+Shift+Z
- `animation-system`: Definición, reproducción y exportación de animaciones por keyframes en objetos 3D
- `animation-json-import`: Importación de definiciones de animación desde JSON externo (generado por LLMs)

### Modified Capabilities
- `object-selection`: Añadir selector de color HTML junto a la paleta de swatches en el viewport, sincronizado con el panel de propiedades
- `glb-export`: Añadir exportación selectiva (solo seleccionados) y embedding de AnimationClips en el GLB
- `keyboard-shortcuts`: Añadir Ctrl+Z, Ctrl+Shift+Z, Space (play/pause animación)
- `json-object-import`: Extender el formato JSON para soportar animaciones opcionales en las definiciones de objetos

## Impact

- **Nuevos módulos**: `src/modules/undo.js`, `src/modules/animation.js`, `src/modules/animation-import.js`
- **Módulos modificados**: `export.js` (selectivo + animations), `shortcuts.js` (undo/redo + play), `json-import.js` (animaciones opcionales), `actions.js` (registrar acciones en historial), `selection.js` (registrar en historial), `main.js` (wiring), `state.js` (undo stack, animation state)
- **HTML**: Timeline UI en viewport, controles de animación, color picker + paleta mejorada, actualización del tooltip de atajos
- **Dependencias**: Ninguna nueva — Three.js ya incluye AnimationMixer, AnimationClip, KeyframeTrack y GLTFExporter los soporta nativamente
- **Nuevo archivo**: `ask-animation.md` con prompt para LLMs
