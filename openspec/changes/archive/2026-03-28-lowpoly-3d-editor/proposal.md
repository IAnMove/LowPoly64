## Why

El proyecto tiene un `index.html` estático (creado por Grok) con la estructura HTML/CSS y JavaScript parcial para un editor 3D low-poly, pero carece de funcionalidad real: la exportación GLB no funciona correctamente, la gestión de escena es incompleta, el guardado/carga no existe, y la arquitectura monolítica en un solo HTML hace imposible mantenerlo o extenderlo. Necesitamos convertirlo en un proyecto Node.js modular con toda la funcionalidad implementada y operativa, listo para crear assets low-poly estilo N64/PS1 y exportarlos a `.glb` para uso en un juego 3D retro.

## What Changes

- Reestructurar el proyecto como aplicación Node.js con Vite como bundler para desarrollo y build
- Modularizar el código JavaScript en módulos ES separados (escena, selección, materiales, exportación, plantillas, UI, etc.)
- Implementar completamente la exportación GLB binaria funcional y descargable
- Implementar sistema de texturas con carga de imagen, toggle on/off, y filtrado nearest para look retro/pixelado
- Implementar guardado y carga de escena en JSON local (localStorage o archivo)
- Implementar todas las plantillas procedurales (silla, mesa, personaje, caja, barril) como Groups editables pieza a pieza
- Implementar sistema de snap configurable para translate/rotate/scale
- Implementar atajos de teclado completos (W/E/R/Supr/Ctrl+D)
- Corregir el viewport sizing para que use el espacio real disponible (no hardcoded 60%)
- Asegurar que OrbitControls se desactiva durante drag de TransformControls
- Panel de propiedades completo y bidireccional (editar en panel actualiza mesh y viceversa)

## Capabilities

### New Capabilities
- `scene-management`: Inicialización de escena Three.js, cámara, luces, grid, floor, axes, render loop y resize responsivo
- `primitive-creation`: Creación de primitivas low-poly (cubo, esfera, cilindro, cono, plano, cápsula) con geometrías de pocos polígonos
- `object-selection`: Selección de objetos por raycasting, resaltado visual, deselección, y navegación por Groups
- `transform-controls`: Mover/rotar/escalar objetos con TransformControls, snap configurable, atajos de teclado W/E/R
- `material-system`: Materiales Basic/Lambert/Phong/Standard con flat shading, wireframe toggle, colores retro, y paleta predefinida
- `texture-system`: Carga de texturas desde archivo, aplicar al objeto seleccionado, toggle on/off, filtrado nearest para pixel-art
- `properties-panel`: Panel lateral derecho con edición bidireccional de nombre, posición, rotación, escala, color, material y textura
- `template-library`: Plantillas procedurales (silla, mesa, personaje, caja, barril) construidas con primitivas Three.js en Groups
- `glb-export`: Exportación de escena completa o selección a .glb binario descargable via GLTFExporter
- `scene-persistence`: Guardado y carga del estado completo de la escena en JSON (localStorage y/o archivo)
- `keyboard-shortcuts`: Atajos de teclado (W mover, E rotar, R escalar, Supr borrar, Ctrl+D duplicar)

### Modified Capabilities
_(ninguna — es proyecto nuevo, no hay specs existentes)_

## Impact

- **Estructura de proyecto**: Pasa de un solo `index.html` a un proyecto Node.js con `package.json`, Vite, y módulos ES
- **Dependencias**: Three.js pasa de CDN a dependencia npm; se añade Vite como dev dependency
- **Archivos existentes**: `index.html` se reemplaza por la nueva estructura; `retro.html` no se modifica
- **Build/Deploy**: Se puede servir con `npm run dev` (desarrollo) y `npm run build` (producción estática)
- **Compatibilidad**: El .glb exportado debe ser compatible con Blender, motores 3D, y pipelines glTF estándar
