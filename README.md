# LowPoly64

Editor 3D en navegador para crear objetos low-poly estilo N64/PS1, exportables como `.glb`.

## Características

- **6 primitivas**: cubo, esfera, cilindro, cono, plano, cápsula, torus
- **~25 plantillas** organizadas por categoría (Mobiliario, Naturaleza, Arquitectura, Props, Personajes)
- **Selección múltiple** con Ctrl+Click y agrupación/desagrupación de objetos
- **4 tipos de material**: Basic, Lambert, Phong, Standard
- **Texturas**: carga por drag-and-drop, controles UV (offset, repeat, rotación)
- **Exportación GLB** con texturas embebidas y animaciones
- **Exportación selectiva**: exporta solo los objetos seleccionados o toda la escena
- **Importación JSON** de objetos generados por LLMs externos
- **Sistema de animaciones**: keyframes por JSON, timeline de reproducción, exportación GLB con AnimationClip
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z con historial de 50 acciones
- **Selector de color**: paleta de swatches + color picker HTML nativo
- **Persistencia**: guardado/carga en localStorage + export/import JSON de escenas
- **Paleta retro** de colores saturados estilo N64
- **Snap** configurable para posición, rotación y escala
- **Atajos de teclado** para todas las operaciones comunes

## Setup

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
```

## Arquitectura

El proyecto usa Vite + Three.js con módulos ES6:

```
src/
├── main.js                  # Entry point, wiring de eventos y window bindings
└── modules/
    ├── state.js             # Estado compartido (scene, camera, selectedMesh, config)
    ├── scene.js             # Inicialización de escena, luces, grid, render loop
    ├── primitives.js        # Creación de primitivas geométricas
    ├── template-registry.js # Registro declarativo de ~25 plantillas
    ├── templates.js         # Builder genérico + generación de UI de plantillas
    ├── selection.js         # Click, Ctrl+Click, doble-click, highlight
    ├── materials.js         # Creación y modificación de materiales
    ├── textures.js          # Carga, configuración y drag-drop de texturas
    ├── actions.js           # Duplicar, eliminar, agrupar, desagrupar, reset
    ├── ui.js                # Panel de propiedades, UV controls, toasts, color sync
    ├── undo.js              # Sistema undo/redo con command pattern (50 acciones max)
    ├── animation.js         # Compilación, reproducción y control de animaciones
    ├── animation-import.js  # Importación y validación de animaciones JSON
    ├── export.js            # Exportación GLB selectiva con materiales y animaciones
    ├── persistence.js       # Serialización de escena con animaciones, localStorage
    ├── json-import.js       # Importación de objetos+animaciones desde JSON externo
    ├── shortcuts.js         # Atajos de teclado (incl. Ctrl+Z, Space)
    └── snap.js              # Sistema de snap para TransformControls
```

## Uso

### Añadir objetos
- Panel izquierdo: clic en una primitiva o plantilla
- **IMPORTAR OBJETO**: pega JSON generado por un LLM (ver `ask.md`)

### Selección y transformación
- **Click**: seleccionar objeto
- **Ctrl+Click**: añadir/quitar de selección múltiple
- **Doble-click**: seleccionar grupo completo
- **W/E/R**: modo mover/rotar/escalar
- **Supr**: eliminar seleccionado
- **Ctrl+Z**: deshacer
- **Ctrl+Shift+Z**: rehacer
- **Ctrl+D**: duplicar
- **Ctrl+G**: agrupar selección
- **Ctrl+Shift+G**: desagrupar
- **Space**: play/pausa animación

### Texturas
1. Selecciona un objeto
2. Arrastra una imagen al área "CARGAR TEXTURA" en el panel derecho
3. Ajusta UV: offset, repeat, rotación
4. La textura se embebe al exportar GLB

### Exportar
- **Exportar GLB**: si hay objetos seleccionados, exporta solo esos; si no, exporta toda la escena
- **Exportar JSON**: guarda la escena como JSON reutilizable (incluye animaciones)

## Crear nuevas plantillas

Las plantillas usan un formato declarativo en `src/modules/template-registry.js`:

```js
{
  id: 'mi-objeto',
  name: 'Mi Objeto',
  category: 'Props',
  pieces: [
    {
      geometry: { type: 'cube', params: { width: 2, height: 3, depth: 2 } },
      color: '#ffcc00',
      name: 'CUERPO',
      position: [0, 1.5, 0]
    },
    {
      geometry: { type: 'sphere', params: { radius: 1, widthSegments: 8, heightSegments: 6 } },
      color: '#ff6600',
      name: 'CABEZA',
      position: [0, 4, 0]
    }
  ]
}
```

### Tipos de geometría soportados

| Tipo | Parámetros |
|------|-----------|
| `cube` | `width`, `height`, `depth` |
| `sphere` | `radius`, `widthSegments`, `heightSegments` |
| `cylinder` | `radiusTop`, `radiusBottom`, `height`, `radialSegments` |
| `cone` | `radius`, `height`, `radialSegments` |
| `plane` | `width`, `height` |
| `capsule` | `radius`, `length`, `capSegments`, `radialSegments` |
| `torus` | `radius`, `tube`, `radialSegments`, `tubularSegments` |

### Campos opcionales por pieza

- `rotation`: `[rx, ry, rz]` en radianes (default: `[0, 0, 0]`)
- `scale`: `[sx, sy, sz]` (default: `[1, 1, 1]`)
- `color`: hex string (default: `'#ffcc00'`)
- `name`: string (default: `'PIECE_N'`)

Para añadir una plantilla, agrégala al array `TEMPLATE_REGISTRY` en `template-registry.js`. Aparecerá automáticamente en el panel izquierdo bajo su categoría.

## Importar objetos con LLMs

Puedes generar objetos 3D usando cualquier LLM externo:

1. Copia el prompt de `ask.md`
2. Añade la descripción de tu objeto al final
3. Pega la respuesta JSON en el modal **IMPORTAR OBJETO**

El formato JSON es el mismo que usan las plantillas internamente, así que cualquier JSON válido de plantilla funciona como importación.

El campo opcional `animations` permite incluir animaciones en el JSON del objeto:
```json
{
  "name": "ROBOT",
  "pieces": [...],
  "animations": [
    { "name": "idle", "duration": 2, "loop": true, "tracks": [...] }
  ]
}
```

## Animaciones

Los objetos pueden tener animaciones por keyframes (position, rotation, scale):

1. Genera una animación con el prompt de `ask-animation.md`
2. Selecciona un grupo en el editor
3. En el modal de importación, usa la sección "IMPORTAR ANIMACION"
4. Usa Space o los controles del timeline para reproducir
5. Al exportar GLB, las animaciones se incluyen como AnimationClip

Las animaciones se guardan con la escena (save/load) y se exportan en el GLB.

## Tech Stack

- [Three.js](https://threejs.org/) — motor 3D
- [Vite](https://vitejs.dev/) — bundler
- Vanilla JS — sin frameworks
