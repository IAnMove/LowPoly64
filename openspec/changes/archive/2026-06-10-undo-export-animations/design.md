## Context

LowPoly64 es un editor 3D en navegador con Three.js y Vite. Actualmente soporta primitivas, plantillas, agrupación, texturas con UV, exportación GLB y persistencia. El estado compartido vive en `state.js` y las acciones se ejecutan directamente sobre la escena. No hay historial de acciones ni sistema de animación.

Three.js provee nativamente: `AnimationMixer`, `AnimationClip`, `KeyframeTrack` (VectorKeyframeTrack, QuaternionKeyframeTrack), y `GLTFExporter` soporta la exportación de clips de animación.

## Goals / Non-Goals

**Goals:**
- Undo/Redo fiable para todas las operaciones destructivas del editor
- Exportación GLB selectiva (seleccionados o todo)
- Selector de color mejorado: paleta de swatches + input color HTML nativo
- Sistema de animación por keyframes definible vía JSON
- Exportación de animaciones embebidas en GLB
- Prompt `ask-animation.md` para generar animaciones con LLMs

**Non-Goals:**
- Editor de animación visual completo (timeline con drag de keyframes) — solo preview play/pause/stop
- Animación skeletal/bones — solo transform animations (position, rotation, scale)
- Undo infinito — límite razonable de ~50 acciones
- Animación de propiedades de material (color, opacity) — solo transforms
- Curvas de interpolación custom — solo linear y step

## Decisions

### D1: Undo — Command Pattern con snapshots ligeros

**Decisión**: Implementar un Command Pattern donde cada acción registra un objeto `{ type, undo(), redo() }` en un stack. Cada comando captura solo el delta necesario (posición antes/después, referencia al objeto creado/eliminado).

**Alternativas consideradas**:
- Full scene snapshot por acción: simple pero inviable con muchos objetos/texturas por coste de memoria
- Diff-based: complejo de implementar correctamente para transforms 3D

**Implementación**: `src/modules/undo.js` expone `pushAction(action)`, `undo()`, `redo()`. Los módulos existentes (`actions.js`, `selection.js`, etc.) llaman a `pushAction` tras cada operación.

Stack máximo: 50 acciones. Al superar el límite se descarta la acción más antigua.

### D2: Qué acciones son undoable

**Decisión**: Las siguientes acciones se registran en el historial:
- Crear primitiva/template/importación
- Eliminar objeto(s)
- Mover/Rotar/Escalar (al soltar TransformControls, no en cada frame)
- Cambiar color/material
- Agrupar/Desagrupar
- Aplicar/quitar textura

**No undoable** (por diseño): cambios de vista de cámara, toggle wireframe/flat, snap toggle, save/load.

### D3: Transform undo — captura en mousedown, registro en mouseup

**Decisión**: Al iniciar un drag con TransformControls (`dragging-changed` → true), capturar posición/rotación/escala actuales. Al soltar (`dragging-changed` → false), registrar acción con before/after. Esto evita registrar cientos de micro-acciones durante un drag.

### D4: Exportación selectiva — modificar `exportGLB()` existente

**Decisión**: Modificar `export.js` para que:
1. Si `state.selectedMeshes.size > 0` → exportar solo los objetos en selectedMeshes
2. Si `state.selectedMesh` y no multi-select → exportar solo selectedMesh
3. Si no hay selección → exportar `state.userObjects` completo (comportamiento actual)

Se crea un Group temporal con clones de los seleccionados para la exportación. El texto del botón cambia dinámicamente: "EXPORTAR SELECCIÓN" vs "EXPORTAR TODO".

### D5: Color picker — paleta + selector HTML nativo

**Decisión**: Añadir un `<input type="color">` junto a los swatches de la paleta en el viewport. Comportamiento:
1. Los swatches de la paleta aplican color al mesh seleccionado al hacer clic (comportamiento actual de `quickColor`)
2. El `<input type="color">` también aplica color al mesh seleccionado al cambiar su valor
3. Cuando se selecciona un objeto, el color picker se sincroniza con el color actual del objeto
4. El color picker del viewport y el del panel de propiedades se sincronizan bidireccionalmente
5. El color elegido con el picker se registra como acción undoable

**Implementación**: Añadir un `<input type="color" id="palette-color-picker">` en la zona de la paleta del viewport. Escuchar evento `input` para aplicar color en tiempo real. La función `quickColor` y el picker comparten la misma lógica de `setColor`.

### D6: Animación — formato JSON declarativo con keyframes

**Decisión**: Las animaciones se definen como un array de tracks, cada track referencia un objeto por nombre y define keyframes con tiempos y valores:

```json
{
  "name": "walk-cycle",
  "duration": 2.0,
  "loop": true,
  "tracks": [
    {
      "target": "PIERNA_IZQ",
      "property": "rotation",
      "keyframes": [
        { "time": 0, "value": [0, 0, 0] },
        { "time": 0.5, "value": [-0.5, 0, 0] },
        { "time": 1.0, "value": [0, 0, 0] },
        { "time": 1.5, "value": [0.5, 0, 0] },
        { "time": 2.0, "value": [0, 0, 0] }
      ]
    }
  ]
}
```

Properties animables: `position` (VectorKeyframeTrack), `rotation` (euler → QuaternionKeyframeTrack), `scale` (VectorKeyframeTrack).

### D7: Animación — AnimationMixer + Clock para reproducción

**Decisión**: Usar `THREE.AnimationMixer` asociado al grupo/objeto animado. Un `THREE.Clock` en el render loop actualiza el mixer. Estado de reproducción en `state.js`: `animationMixer`, `animationAction`, `animationPlaying`.

Controles: Play/Pause (Space), Stop (doble Space o botón). Timeline visual muestra una barra de progreso con el tiempo actual.

### D8: Animación → GLB — usar AnimationClip nativo

**Decisión**: Convertir el JSON de animación a `THREE.AnimationClip` con `KeyframeTrack`s. GLTFExporter acepta `animations: [clip]` en sus opciones. Los tracks referencian objetos por `node.name`, que ya se establece como `userData.name` en nuestros objetos.

Al exportar: buscar AnimationClips asociados al grupo exportado y pasarlos al exporter.

### D9: Almacenamiento de animaciones — en userData del grupo

**Decisión**: Las animaciones se almacenan en `group.userData.animations = [animDef]` (el JSON original) y `group.userData.animationClips = [THREE.AnimationClip]` (los clips compilados). Esto mantiene las animaciones vinculadas al objeto y permite serialización/deserialización.

### D10: Importación de animaciones — extensión del formato existente

**Decisión**: Extender el formato JSON de importación de objetos para aceptar un campo opcional `animations`:

```json
{
  "name": "ROBOT",
  "pieces": [...],
  "animations": [
    { "name": "idle", "duration": 2, "loop": true, "tracks": [...] }
  ]
}
```

Si `animations` está presente, se compilan los clips y se asocian al grupo.

### D11: Timeline UI — barra de progreso minimalista

**Decisión**: Una barra horizontal sobre el viewport (solo visible cuando hay animación seleccionada) con:
- Botones: Play/Pause, Stop
- Barra de progreso mostrando tiempo actual / duración
- Nombre de la animación activa
- Sin drag de keyframes (non-goal)

## Risks / Trade-offs

- **Undo de transforms complejos en grupos**: Los transforms de children dentro de grupos se manejan relativos al grupo. El undo captura el transform del objeto directo que se mueve (sea grupo o mesh), no los children.
  → Mitigation: Solo capturar transform del objeto al que está attached TransformControls.

- **Animaciones con objetos renombrados**: Si el usuario renombra un objeto después de definir una animación, los tracks no encontrarán su target.
  → Mitigation: Resolver tracks por nombre en el momento de compilar el clip, avisar con toast si un target no se encuentra.

- **Memoria del undo stack**: Objetos eliminados se mantienen en el stack para poder restaurarlos.
  → Mitigation: Límite de 50 acciones. Al limpiar acciones antiguas, hacer dispose de geometrías/materiales de objetos eliminados que ya no son restaurables.

- **Euler vs Quaternion en animaciones**: Three.js usa QuaternionKeyframeTrack internamente pero el JSON es más intuitivo con euler angles.
  → Mitigation: Convertir euler→quaternion al compilar el clip. El JSON acepta [rx, ry, rz] en radianes.
