## Context

Retrovisor es un editor Vite + Three.js vanilla que organiza los objetos como `Group`, `PivotGroup` y meshes con primitivas o geometría `custom`. El repo `3dsvg` resuelve un problema cercano, pero lo hace con un motor React/R3F y un editor Next.js que no encajan de forma directa en este proyecto.

El punto útil de `3dsvg` no es su UI como tal, sino su pipeline:

- parsear SVG con `SVGLoader`
- detectar `fill` frente a `stroke`
- rasterizar SVGs problemáticos cuando hace falta
- convertir texto y pixel art en SVG válido
- extruir shapes y centrarlos para render 3D

La integración debe respetar el stack actual del repo, mantener undo/redo, aprovechar la exportación GLB ya existente y no forzar una migración a React.

## Goals / Non-Goals

**Goals:**
- Añadir un flujo nativo SVG -> modelo dentro de Retrovisor.
- Reutilizar el método de `3dsvg` portando funciones puras, no componentes React.
- Insertar el resultado como geometría compatible con el editor actual.
- Mantener roundtrip suficiente para reabrir y regenerar modelos SVG dentro de la misma escena guardada.
- Añadir controles de complejidad y una UX razonable para SVGs grandes.

**Non-Goals:**
- No incrustar el editor web de `3dsvg` ni su stack Next.js/React en este cambio.
- No replicar sus materiales PBR, export de vídeo, export de PNG o canvas interactivo completo.
- No prometer una decimación lowpoly avanzada o una reconstrucción automática en primitivas.
- No resolver en este mismo cambio todas las limitaciones del export/import JSON externo de meshes `custom` muy grandes.

## Decisions

### 1. Portar el pipeline puro de `3dsvg`, no sus componentes

**Decision:** crear módulos propios bajo `src/modules/svg/` y portar la lógica reutilizable de `3dsvg` (`parseShapesFromSVG`, rasterizado, texto->SVG, pixel->SVG y extrusión).

**Why:**
- Nuestro editor es vanilla JS con bindings `window.*`, HTML inyectado y control directo de Three.js.
- `3dsvg` depende de `react`, `react-dom`, `@react-three/fiber` y `@react-three/drei`.
- Incrustar el editor React dentro del stack actual añade complejidad estructural sin aportar valor al objetivo principal.

**Alternatives considered:**
- Embutir el editor de `3dsvg` en un iframe o microfrontend: descartado por coste de integración, puente de estado y UX partida.
- Montar una isla React dentro de Vite: viable técnicamente, pero introduce dos patrones de UI y complica el mantenimiento para una feature que puede resolverse con funciones puras.

### 2. Integrar el flujo como modal/workbench nativo

**Decision:** seguir el patrón de `texture-editor` y `ai-gen-ui`, con HTML inyectado, funciones de binding dedicadas y un modal propio del dominio SVG.

**Why:**
- Ya existe una convención clara para herramientas auxiliares complejas dentro del editor.
- Permite abrir el workbench desde el panel izquierdo y reabrirlo sobre un objeto seleccionado.
- Evita tocar el viewport principal más de lo necesario.

**Alternatives considered:**
- Un panel permanente en el sidebar: ocupa demasiado espacio para una herramienta de creación puntual.
- Un flujo solo de import sin preview: reduce calidad y empeora la iteración.

### 3. Insertar el resultado directamente como grupo `custom` en escena

**Decision:** el workbench generará un `Group` listo para añadir a `state.userObjects`, con uno o varios meshes `custom`, sin pasar por el modal de `json-import`. Para roundtrip externo de objetos, `exportObjectJSON` serializará el `svgSource` y los ajustes de importación para regenerar la geometría al reimportar.

**Why:**
- Evita depender de los límites actuales del validador JSON durante el MVP.
- Reusa el mismo modelo interno que ya soportan guardado de escena, materiales, texturas y export GLB.
- Mantiene el resultado inmediatamente editable con las herramientas existentes.
- Permite que el JSON externo viaje ligero y estable, igual que otros recursos-fuente del editor.

**Alternatives considered:**
- Convertir primero a JSON y reimportar por `json-import`: más simple conceptualmente, pero se estrella antes con los límites de `custom` geometry y añade serialización innecesaria.
- Generar primitivas aproximadas: no es fiel al método de `3dsvg` y reduce mucho la calidad.

### 4. Persistir `svgSource` y `svgImportSettings` en `userData`

**Decision:** cuando un objeto provenga del workbench SVG, el grupo guardará metadatos opcionales con el SVG fuente, modo de entrada, flags de rasterización y ajustes de extrusión/import.

**Why:**
- Sin esos metadatos, el flujo sería de un solo sentido.
- El usuario ha pedido integrar también el editor, no solo el import.
- `scene-persistence` ya serializa metadatos opcionales de grupos; extenderlo es incremental.

**Alternatives considered:**
- No guardar la fuente y dejar solo la malla final: más simple, pero elimina el valor del editor reabrible.
- Guardar solo el SVG sin settings: insuficiente para regenerar de forma predecible.

### 5. Soportar `fill` y `stroke` con dos caminos de conversión

**Decision:** usar extrusión directa cuando el SVG ya tenga shapes rellenables y añadir fallback de rasterizado para SVGs de iconos/strokes o entradas pixeladas.

**Why:**
- `3dsvg` ya tiene ambos caminos porque muchos SVGs de iconos no producen volumen útil solo con `createShapes`.
- Esto cubre tanto logos rellenados como iconografía lineal y dibujos en pixel grid.

**Alternatives considered:**
- Aceptar solo SVGs con fill: demasiado restrictivo.
- Rasterizar siempre: simplifica el pipeline, pero pierde fidelidad en SVGs buenos.

### 6. Manejar la complejidad como preflight + progreso + cancelación

**Decision:** antes de insertar el objeto, el pipeline calculará complejidad aproximada (número de shapes, vértices y caras), mostrará progreso y permitirá abortar o advertir si el SVG supera umbrales seguros.

**Why:**
- El mayor riesgo real no es la viabilidad técnica, sino bloquear el navegador con una extrusión costosa.
- Nuestros límites actuales de `custom` geometry sugieren que ya existía preocupación por tamaño y estabilidad.

**Alternatives considered:**
- Sin límites: mala UX y potencial freeze.
- Rechazo duro con umbrales bajos: demasiado conservador y frustrante.

## Risks / Trade-offs

- [Risk] SVGs complejos generan demasiada geometría y degradan el editor. -> Mitigation: preflight, progreso visible, umbrales configurables y posibilidad de cancelar o sugerir rasterizado/smoothness menor.
- [Risk] El modo texto depende de fuentes remotas si seguimos la estrategia de `3dsvg`. -> Mitigation: cachear fuentes, degradar con mensaje claro si fallan y mantener `upload/code/pixel` como caminos alternativos.
- [Risk] El resultado como mesh `custom` no será tan editable como una plantilla construida con primitivas. -> Mitigation: dejar claro que el objetivo es import editable a nivel de transform/material/texture, no reconstrucción semántica.
- [Risk] Un SVG muy complejo seguirá generando mucha geometría aunque el JSON externo viaje como `svgSource`. -> Mitigation: mantener el preflight, el progreso/cancelación y medir tamaños reales antes de decidir si conviene subir límites del camino legacy de `custom` meshes.
- [Risk] Portar código de `3dsvg` en vez de depender del paquete puede divergir con futuras versiones. -> Mitigation: aislar el dominio SVG en módulos propios y documentar qué funciones fueron adaptadas.

## Migration Plan

1. Añadir dependencias y módulos SVG sin activar la UI.
2. Integrar el workbench en el HTML y bindings existentes detrás de un nuevo entrypoint visible.
3. Conectar inserción/update con undo/redo y selección.
4. Extender `scene-persistence` para metadatos SVG opcionales; verificar compatibilidad con escenas antiguas.
5. Validar manualmente casos representativos: SVG con fill, icono con stroke, pixel art, texto y save/load.

Rollback:
- Ocultar el botón/entrypoint del workbench desactiva la feature sin migraciones destructivas.
- Los nuevos metadatos deben ser opcionales para que escenas antiguas y objetos no SVG sigan cargando igual.

## Open Questions

- ¿El MVP debe crear un único mesh fusionado o preservar capas/fills como piezas separadas cuando el SVG original ya trae color?
- ¿Queremos conservar a futuro un modo opcional de exportar también la malla resultante además del `svgSource`, o basta con que el roundtrip externo regenere desde la fuente?
- ¿Conviene mantener el catálogo de fuentes remoto como en `3dsvg` o congelar un set pequeño de fuentes locales/bundled?
