# LowPoly64

Editor 3D en navegador para crear objetos low-poly estilo N64/PS1, exportables como `.glb`.

## Características

- **6 primitivas**: cubo, esfera, cilindro, cono, plano, cápsula, torus
- **~25 plantillas** organizadas por categoría (Mobiliario, Naturaleza, Arquitectura, Props, Personajes)
- **Selección múltiple** con Ctrl+Click y agrupación/desagrupación de objetos
- **4 tipos de material**: Basic, Lambert, Phong, Standard
- **Texturas**: carga por drag-and-drop, controles UV (offset, repeat, rotación)
- **Exportación GLB** con texturas embebidas
- **Importación JSON** de objetos generados por LLMs externos
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
    ├── ui.js                # Panel de propiedades, UV controls, toasts
    ├── export.js            # Exportación GLB con conversión de materiales
    ├── persistence.js       # Serialización de escena, localStorage, JSON export/import
    ├── json-import.js       # Importación de objetos desde JSON externo
    ├── shortcuts.js         # Atajos de teclado
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
- **Ctrl+D**: duplicar
- **Ctrl+G**: agrupar selección
- **Ctrl+Shift+G**: desagrupar

### Texturas
1. Selecciona un objeto
2. Arrastra una imagen al área "CARGAR TEXTURA" en el panel derecho
3. Ajusta UV: offset, repeat, rotación
4. La textura se embebe al exportar GLB

### Exportar
- **Exportar GLB**: descarga la escena como `.glb` (compatible con cualquier visor 3D)
- **Exportar JSON**: guarda la escena como JSON reutilizable

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

## Tech Stack

- [Three.js](https://threejs.org/) — motor 3D
- [Vite](https://vitejs.dev/) — bundler
- Vanilla JS — sin frameworks
