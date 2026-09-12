# Personajes PSX y N64 reutilizables

En el panel izquierdo, abre **CREAR PERSONAJES / CHARACTER STUDIO**.

1. Elige el estilo del cuerpo y el de la cabeza. Pueden ser distintos.
2. Ajusta altura, anchura, tamaño de cabeza, pelo y colores en la vista previa.
3. Usa **CREAR PERSONAJE** para insertar el conjunto o **CREAR CUERPO REUTILIZABLE** para conservar solo el cuerpo y su articulación de cabeza.
4. Selecciona un cuerpo existente y abre **EDITAR PERSONAJE / CABEZA**. **APLICAR CABEZA AL SELECCIONADO** cambia únicamente los descendientes de la articulación HEAD: conserva las piezas, colores y ajustes manuales del cuerpo. Se puede deshacer y rehacer.

## Archivos

- Con el personaje seleccionado, **EXPORT JSON** guarda el modelo editable. **IMPORT OBJECT** acepta ese JSON y recetas compactas como las de `docs/examples/retro-characters/`.
- **EXPORT GLB** guarda geometría, materiales, jerarquía y animaciones. En **IMPORT OBJECT**, usa **CARGAR .JSON / .GLB** para recuperarlo.
- El GLB debe llevar texturas y buffers incrustados; el límite de carga es 25 MB.
- Un GLB importado se guarda como un modelo completo, incluidas sus animaciones. Su exportación JSON usa el contenedor `retrovisor-gltf`; se puede importar de nuevo en la misma entrada.
- **SAVE/LOAD** y la exportación de escena conservan las piezas reales, además de las recetas. Los archivos antiguos de Avatar Forge siguen siendo legibles.

## Rig

Los nuevos cuerpos usan HUMANOID_STANDARD y sus animaciones de reposo, caminar y otras acciones. Son personajes articulados por piezas rígidas: hombros, codos, caderas, rodillas, manos, pies, cuello y cabeza. El GLB conserva esta jerarquía y las animaciones de nodos; no necesita una deformación suave de la malla para moverse.

La cabeza mantiene nombres estables y se monta en HEAD. Para reutilizar un cuerpo, conserva sus nombres de articulación. Puedes cambiar el tamaño o color de sus piezas y guardarlo para usarlo más adelante.

## Recetas

Una receta describe las elecciones del generador. El JSON completo describe las piezas resultantes y es el formato adecuado cuando ya has hecho modificaciones manuales.

```json
{
  "format": "retrovisor-character",
  "version": 1,
  "label": "Mi personaje N64",
  "style": "n64",
  "headStyle": "n64",
  "includeHead": true,
  "headScale": 1,
  "bodyHeight": 4,
  "bodyWidth": 1.55,
  "hair": "short"
}
```

El segundo estilo es `psx`. Los peinados son `short`, `spiky` y `none`. `includeHead: false` crea un cuerpo reutilizable. `colors` permite definir `skin`, `hair`, `shirt`, `pants` y `shoes` con colores hexadecimales.
