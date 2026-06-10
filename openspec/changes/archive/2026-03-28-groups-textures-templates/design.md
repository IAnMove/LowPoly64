## Context

LowPoly64 es un editor 3D low-poly funcional con proyecto Node.js/Vite. Actualmente tiene 12 módulos JS en `src/modules/`. Las plantillas están hardcodeadas como funciones `buildChair()`, `buildTable()`, etc. en `templates.js`. Las texturas se aplican sin control de UV. La exportación GLB convierte materiales a Standard pero no gestiona el embedding de texturas correctamente. La selección siempre selecciona el mesh individual, sin opción de seleccionar el Group padre. Hay problemas de UX: la carga de texturas solo es visible en el panel derecho (que está oculto sin selección), Save/Load no dan feedback, y los atajos en la barra superior están comprimidos y no se leen bien.

## Goals / Non-Goals

**Goals:**
- Sistema de agrupación: agrupar objetos seleccionados, desagrupar, seleccionar grupo completo o pieza
- Texturas con control UV: offset X/Y, repeat X/Y, rotación, y embedding correcto en GLB
- UX de texturas mejorada: que sea claro cómo cargar y colocar texturas
- ~20 plantillas totales (5 existentes + ~15 nuevas) cubiertas por categorías
- Sistema declarativo de plantillas: cada plantilla es un objeto de datos, fácil de extender
- Importación de objetos JSON generados por LLMs externos, con prompt documentado en ask.md
- README.md y ask.md completos
- Corregir UX de Save/Load (feedback visual, confirmación)
- Atajos de teclado como tooltip flotante en el viewport, no comprimidos en la barra

**Non-Goals:**
- Edición de UV per-vertex (eso es territory de Blender)
- Multi-selección con box select (solo Ctrl+click)
- Sistema de plugins para plantillas de terceros
- Importar archivos .glb/.obj (solo JSON declarativo)

## Decisions

### 1. Sistema declarativo de plantillas (template registry)

**Decisión**: Cada plantilla se define como un objeto JS plano con un array de `pieces`, cada pieza siendo `{ geometry: { type, params }, color, name, position, rotation, scale }`. Un registry central (`TEMPLATE_REGISTRY`) almacena todas las definiciones. La función `addTemplate(id)` lee del registry y construye el Group.

**Rationale**: Las funciones `buildChair()`, `buildTable()` etc. tienen mucho código repetitivo. Un formato declarativo permite: (1) añadir plantillas sin escribir funciones, (2) serializar/mostrar el catálogo dinámicamente en la UI, (3) documentar el formato para que un LLM pueda generar nuevas plantillas, (4) reusar el mismo formato para la importación JSON.

### 2. Importación de objetos JSON (mismo formato que template registry)

**Decisión**: Reusar exactamente el mismo formato declarativo de las plantillas para la importación JSON. El usuario puede pegar JSON en un textarea modal o cargar un archivo .json. El sistema parsea el JSON, valida que tiene la estructura correcta (`name`, `pieces[]`), y construye el Group igual que si fuera una plantilla del registry.

**Rationale**: Un solo formato para plantillas internas e importación externa. El prompt en `ask.md` le dice al LLM externo exactamente qué estructura JSON generar. Zero ambigüedad.

**Alternativa descartada**: Formato custom separado para importación. No tiene sentido si ya tenemos un formato declarativo que funciona.

### 3. ask.md con prompt para LLMs externos

**Decisión**: Crear `ask.md` en la raíz del proyecto con un prompt completo que el usuario copia y pega en Grok/Perplexity/ChatGPT. El prompt incluye: (1) el schema JSON con todos los campos, (2) los tipos de geometría soportados, (3) un ejemplo completo de un objeto, (4) instrucciones de que debe devolver SOLO el JSON.

**Rationale**: El usuario quiere un flujo: copiar prompt → pegar en otro LLM → describir el objeto → copiar el JSON de respuesta → pegar en LowPoly64 → ver el objeto. Debe ser lo más frictionless posible.

### 4. Plantillas organizadas por categorías

**Decisión**: Agrupar las plantillas en categorías: Mobiliario, Naturaleza, Arquitectura, Props de juego, Personajes. La UI del panel izquierdo muestra secciones colapsables por categoría.

**Rationale**: Con ~20 plantillas, una lista plana es inmanejable. Las categorías dan estructura.

### 5. Agrupación manual con Ctrl+Click para multi-selección

**Decisión**: Multi-selección con Ctrl+Click (añade/quita). Botón "Agrupar" (Ctrl+G) crea Group. "Desagrupar" (Ctrl+Shift+G) disuelve. Doble clic selecciona grupo completo; clic simple selecciona pieza.

**Rationale**: Patrón estándar en herramientas de diseño.

### 6. Controles UV simplificados (offset, repeat, rotation)

**Decisión**: Añadir al panel de propiedades controles numéricos para: texture offset X/Y, repeat X/Y, rotation. Se mapean directamente a `texture.offset`, `texture.repeat`, y `texture.rotation` de Three.js.

**Rationale**: Control suficiente para colocar texturas sin UV editor completo.

### 7. Embedding de texturas en GLB

**Decisión**: Asegurar que las texturas tienen `flipY = false` y `colorSpace = SRGBColorSpace` al cargarlas. GLTFExporter maneja el embedding automáticamente si el texture tiene un image source válido.

**Rationale**: El problema actual es que usamos `new THREE.Texture(img)` sin configurar flipY y colorSpace para glTF.

### 8. Mejora UX de carga de texturas

**Decisión**: Además del input de archivo en el panel de propiedades, añadir un botón "CARGAR TEXTURA" visible en la zona superior del panel derecho que siempre esté accesible cuando hay un objeto seleccionado. Añadir feedback visual cuando la textura se aplica (flash del borde del objeto o notificación).

### 9. Save/Load con feedback visual

**Decisión**: Al pulsar Save, mostrar una notificación toast "Escena guardada" durante 2 segundos. Al pulsar Load, mostrar confirmación "¿Cargar escena guardada? Se perderán los cambios actuales" antes de proceder. Si no hay escena guardada, mostrar toast "No hay escena guardada".

**Rationale**: El usuario no sabe qué pasa cuando pulsa los botones. Feedback visual da confianza.

### 10. Atajos de teclado como tooltip en viewport

**Decisión**: Quitar el texto de atajos de la barra superior. Añadir un icono de teclado (?) en el viewport que al hacer hover muestra un tooltip/panel centrado con todos los atajos formateados legiblemente.

**Rationale**: Los atajos no caben en la barra superior con la fuente retro. Un tooltip on-hover es limpio y no ocupa espacio permanente.

## Risks / Trade-offs

- **[Risk] Multi-selección complica la UI de propiedades** → En multi-selección, panel muestra solo acciones de grupo.
- **[Risk] UV controls no sirven para geometrías sin UV** → Las primitivas de Three.js ya incluyen UVs.
- **[Risk] Muchas plantillas sobrecargan el panel izquierdo** → Categorías colapsables lo mitigan.
- **[Risk] JSON import con formato inválido** → Validar el JSON antes de construir: comprobar que tiene `pieces[]`, que cada pieza tiene `geometry.type` válido. Mostrar error claro si falla.
- **[Risk] LLMs externos pueden generar JSON con errores** → El prompt en ask.md debe ser muy preciso y el importador debe ser tolerante (defaults para campos opcionales).
