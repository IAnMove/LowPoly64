## Why

Retrovisor ya tiene tres piezas tecnicas que encajan muy bien para un creador de avatares humanoides: moldes `CharacterModel` con arquetipo `HUMANOID`, sustitucion del slot `HEAD` mediante SVG inflado, y export GLB con perfiles de animacion. Lo que falta es un flujo guiado para combinar ojos, cejas, boca, pelo, forma de cabeza y tipo de cuerpo sin obligar al usuario a tocar SVG o a montar el personaje pieza a pieza.

Si queremos un resultado estilo "Mii-like" que exporte a GLB sin sorpresas, el creador no puede generar cuerpos arbitrarios ni romper el pipeline de rig. Debe producir siempre un humanoide compatible con el esqueleto base y con un perfil de animacion neutral.

## What Changes

- Anadir un nuevo modo `Avatar Forge` dentro del editor para crear y editar avatares humanoides desde presets.
- Crear bibliotecas curadas de presets para cuerpo, forma de cabeza, pelo, ojos, cejas, boca, accesorios simples y paletas.
- Introducir un `avatarRecipe` estructurado que compile la cabeza a un SVG inflado y genere un grupo humanoide listo para rig y export.
- Permitir tanto crear un avatar nuevo como reabrir y editar un avatar ya creado por este modo.
- Guardar el `avatarRecipe` en `SAVE`/`LOAD` para mantener la ficha editable despues de cerrar la escena.
- Asignar un perfil neutral `HUMANOID_AVATAR_BASE` para que la exportacion GLB salga con un set base coherente y no con perfiles de combate.

## Capabilities

### New Capabilities
- `avatar-forge-mode`: creador guiado de avatares humanoides basado en moldes de cuerpo y fragmentos SVG de cabeza/cara.

### Modified Capabilities
- `scene-persistence`: persistir y restaurar `avatarRecipe` junto a la metadata del `CharacterModel`.
- `glb-export`: exportar avatares creados en `Avatar Forge` usando un perfil humanoide neutral listo para animacion.

## Impact

- Codigo afectado: `index.html`, `src/bindings.js`, `src/modules/viewport/persistence.js`, y nuevos modulos bajo `src/modules/avatar/`.
- Datos nuevos: catalogos bajo `src/data/avatar/` y un perfil de animacion `HUMANOID_AVATAR_BASE`.
- Reutilizacion directa de piezas ya existentes: `generated-character-molds`, `CharacterModel`, `svg-head-integration`, `svg-extrusion` y el flujo actual de export GLB.
- No requiere un runtime 3D nuevo ni un segundo pipeline de exportacion.
