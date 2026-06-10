## Why

El enfoque actual de `Avatar Forge` sigue intentando resolver demasiado volumen craneal con variantes de `head shape` y con caras SVG completas. Eso ha dejado un catálogo grande pero frágil: muchas cabezas leen mal en perfil, el pelo no abraza bien el cráneo y cada ajuste obliga a retocar offsets globales en vez de trabajar sobre una geometría base correcta.

Ya tenemos una base mejor: el nuevo `PSX Mesh Portrait` derivado del GLB ligero que sí ofrece un cráneo útil. El siguiente paso no es seguir multiplicando cabezas ni forzar un "match" perfecto de caras SVG completas, sino pasar a un sistema de `head mold + features` donde ojos, cejas, nariz, boca, orejas y pelo se coloquen por separado con controles tipo Mii.

## What Changes

- Introducir un nuevo sistema canónico de cabeza basado en un único `head mold` 3D para `Avatar Forge`, usando la nueva cabeza mesh como base por defecto.
- Separar `eyes`, `brows`, `nose`, `mouth`, `ears` y `hair` en piezas o grupos independientes que se montan sobre el `head mold` en vez de compilar siempre una cara SVG completa.
- Añadir controles por avatar para mover y escalar rasgos faciales: `size`, `up/down`, `left/right`, y para ojos también `spacing`.
- Crear una librería real de `nose presets` y formalizar el montaje separado de orejas y pelo sobre la cabeza base.
- Mantener el sistema actual de "cara SVG completa" como ruta `legacy/fallback` para compatibilidad y migración, sin seguir tratándolo como la base del sistema nuevo.
- Replantear el catálogo de `head shape` para que el builder deje de depender de familias amplias de cráneos (`PSX`, `N64`, `Bridge`) como eje principal de construcción.
- **BREAKING**: la experiencia principal de `Avatar Forge` dejará de asumir que la selección de cabeza se resuelve desde múltiples cráneos equivalentes; el nuevo flujo partirá siempre del `head mold` canónico salvo cuando el usuario abra o mantenga una receta `legacy`.

## Capabilities

### New Capabilities
- `avatar-head-feature-placement`: sistema de cabeza canónica con `head mold` base, rasgos separados, presets de nariz y controles de colocación/escala por avatar.

### Modified Capabilities
- `avatar-forge-mode`: el builder pasa a usar el `head mold` canónico como base principal, expone controles faciales tipo Mii y conserva el flujo de cara SVG completa como fallback heredado.
- `avatar-style-library`: la librería deja de tratar la variedad de cráneos como el centro del sistema y pasa a priorizar un molde base más presets de rasgos separados y estados `legacy`.
- `scene-persistence`: `avatarRecipe` debe persistir el modo de construcción (`mold` o `legacy`), el `head mold` activo, los rasgos seleccionados y sus controles de colocación para reabrir el avatar sin deriva.

## Impact

- Código afectado: `src/modules/avatar/`, `src/modules/svg/svg-head-integration.js`, `src/data/avatar/catalog/`, `src/modules/viewport/persistence.js`, y las pruebas de `tests/e2e/avatar-forge.spec.js`.
- Datos nuevos: catálogos de `head molds`, `nose presets`, anchors o mounts de rasgos, y estructura expandida de `avatarRecipe` para placement controls.
- Riesgo principal: convivir durante un tiempo con dos rutas de construcción (`mold` nueva y `legacy` completa), por lo que el cambio debe quedar claramente seccionado y reversible por receta.
- Beneficio esperado: menos combinatoria de offsets globales, mejor lectura frontal y lateral, y una base preparada para authoring posterior desde Blender/GLB sin rehacer el flujo del usuario cada vez.
