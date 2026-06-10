## Context

El proyecto `retrovisor` tiene un archivo `index.html` monolítico con ~700 líneas que incluye HTML (Tailwind), CSS inline, y JavaScript embebido en un `<script type="module">`. Usa Three.js vía CDN (unpkg, v0.168.0) con OrbitControls, TransformControls y GLTFExporter. La UI está completa visualmente (barra superior, panel izquierdo de primitivas/plantillas, viewport central, panel derecho de propiedades), pero el JavaScript tiene funciones incompletas y no es mantenible. Las funciones están expuestas como globales vía `window.*` al final del módulo, lo cual es frágil.

El usuario necesita un editor 3D funcional para crear assets low-poly exportables a .glb para su juego retro. No necesita un Blender — necesita una herramienta rápida de blockout con acabado retro.

## Goals / Non-Goals

**Goals:**
- Proyecto Node.js con Vite para dev server y build estático
- Código modular en archivos JS separados por responsabilidad
- Toda la funcionalidad operativa: primitivas, selección, transformación, materiales, texturas, exportación GLB, plantillas, guardado/carga
- Rendimiento fluido en navegador
- Exportación .glb realmente funcional y compatible con pipelines glTF estándar
- UX retro-moderna, rápida y sin fricción

**Non-Goals:**
- Edición de vértices/caras individuales (esto es Blender territory)
- Sistema de iluminación avanzado (bake, lightmaps, etc.)
- Undo/redo (valorado pero no obligatorio en primera versión)
- Multiplayer o colaboración
- Backend o servidor — todo es client-side
- Importación de modelos 3D externos (solo exportación)

## Decisions

### 1. Vite como bundler (no Webpack, no plain HTML)

**Decisión**: Usar Vite con vanilla JS (no framework).

**Rationale**: Vite ofrece HMR instantáneo, soporte nativo de ES modules, y build optimizado sin configuración compleja. Webpack sería overkill. Mantener el HTML monolítico con CDN impide modularidad, tree-shaking, y hace imposible mantener el proyecto.

**Alternativa descartada**: Seguir con un solo HTML + CDN. No escala, no se puede testear, no se puede extender.

### 2. Estructura modular por responsabilidad

**Decisión**: Separar en módulos: `scene.js`, `selection.js`, `materials.js`, `textures.js`, `primitives.js`, `templates.js`, `export.js`, `persistence.js`, `ui.js`, `shortcuts.js`, `main.js`.

**Rationale**: Cada módulo tiene una responsabilidad clara. El state compartido (scene, camera, selected object) se gestiona via un módulo `state.js` central que exporta getters/setters. Esto evita globals y permite que cada módulo importe solo lo que necesita.

**Alternativa descartada**: Arquitectura con clases/singleton pattern. Sobreingeniería para una herramienta de este tamaño.

### 3. Three.js como dependencia npm (no CDN)

**Decisión**: `npm install three` y usar imports de `three` y `three/addons/...`.

**Rationale**: Vite lo bundlea con tree-shaking. Permite autocompletado en editors, versión fija, y builds reproducibles. Los addons (OrbitControls, TransformControls, GLTFExporter) se importan desde `three/addons/`.

### 4. Selección: raycasting recursivo sobre userObjects Group

**Decisión**: Raycaster intersecta `userObjects.children` con `recursive: true`. Al detectar hit, se sube al mesh directo (no al Group padre) para permitir edición pieza por pieza en plantillas.

**Rationale**: El usuario quiere poder editar cada pieza de una plantilla individualmente. Seleccionar el Group completo impediría mover una pata de silla por separado.

### 5. Exportación GLB via Blob + descarga automática

**Decisión**: GLTFExporter en modo binario genera un ArrayBuffer → Blob → URL.createObjectURL → link click automático → URL.revokeObjectURL.

**Rationale**: Es el patrón estándar para descargar archivos generados en cliente. No requiere backend.

### 6. Persistencia via JSON en localStorage + opción de archivo

**Decisión**: Serializar la escena (posiciones, rotaciones, escalas, colores, tipos de geometría, materiales, nombres, jerarquía de groups) a JSON propio. No usar `scene.toJSON()` de Three.js.

**Rationale**: `scene.toJSON()` incluye datos internos que no necesitamos y es frágil entre versiones. Un formato JSON propio y simple es más controlable y ligero. Almacenamos en localStorage para persistencia automática, con botones de exportar/importar JSON como archivo.

### 7. CSS: mantener Tailwind via CDN para la UI

**Decisión**: Seguir usando Tailwind CDN para los estilos de UI. El HTML base se mantiene similar al existente.

**Rationale**: La UI existente ya está bien diseñada con Tailwind. Migrar a Tailwind npm añadiría complejidad sin beneficio real para una herramienta de este tipo.

## Risks / Trade-offs

- **[Risk] Viewport sizing hardcoded** → Usar CSS flexbox real para el viewport, calculando dimensiones dinámicamente en `onResize()` basándose en el contenedor real, no en porcentajes hardcoded del window.

- **[Risk] Conflicto OrbitControls / TransformControls** → Ya resuelto en el código existente con el listener `dragging-changed`. Mantener este patrón y verificar que funciona en todos los modos (translate/rotate/scale).

- **[Risk] GLTFExporter no exporta vertex colors correctamente** → Usar `MeshStandardMaterial` como fallback para exportación si el material original no es compatible con glTF. Convertir materiales Basic/Lambert/Phong a Standard antes de exportar.

- **[Risk] Texturas grandes degradan rendimiento** → No hay mitigación especial — el usuario debería usar texturas pequeñas (pixel-art). Documentar en la UI.

- **[Risk] localStorage tiene límite de ~5MB** → Suficiente para escenas low-poly sin texturas embebidas. Las texturas se referencian, no se serializan en el save.
