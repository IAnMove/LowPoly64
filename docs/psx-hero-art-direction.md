# Héroe PSX: cuerpo, cabeza y equipo reutilizables

El ejemplo de Cloud se ha reconstruido con secciones de geometría diseñadas para el personaje: torso con cintura y pecho, extremidades con cambios de volumen, botas, mandíbula, ojos angulares, pelo asimétrico, uniforme, hombrera y espada ancha.

## Probarlo en la aplicación

1. Abrir **Estudio de personajes**.
2. Pulsar **Nuevo · Héroe PSX / Cloud**.
3. Ajustar las proporciones o los colores y pulsar **Crear personaje**.
4. Para reutilizar el cuerpo, pulsar **Crear solo el cuerpo**. Con él seleccionado, abrir de nuevo el creador y pulsar **Aplicar esta cabeza al seleccionado**. El cambio se puede deshacer.
5. Usar los controles habituales **Exportar JSON** o **Exportar GLB**. Ambos formatos conservan el modelo; la receta permite volver a generar sus piezas.

El panel muestra una pose de presentación. El personaje se inserta en su postura de reposo para trabajar con el rig y las animaciones.

## Recetas y agente

El catálogo de herramientas ofrece `studio:cloud-psx`. La receta completa está en [cloud-hero.recipe.json](examples/character-design/cloud-hero.recipe.json). Los nuevos controles son:

- `body.profile: "heroic"`, con factores independientes `shoulders`, `waist`, `arms`, `legs` y `boots` entre 0.7 y 1.35.
- `head.profile: "heroic"` y `head.jaw` entre 0.75 y 1.2, además de la escala de cabeza existente.
- `hair.style: "hero_spikes"` para mechones orientados con volumen.
- `outfit.style: "soldier"` para cuello, correas, cinturón, guantes y acabados de botas.
- `equipment.sword.profile: "buster"` y `equipment.pauldron.profile: "shell"`.

Los valores predeterminados de recetas anteriores siguen siendo los perfiles clásicos. Las piezas del nuevo perfil se crean dentro de los mismos slots y articulaciones humanoides. Los cambios de cuerpo ajustan la ropa y sus anclajes; cambiar el color de la camisa conserva los materiales de guantes, cinturón y hebillas. Las sustituciones por partes conservan los identificadores, transformaciones y añadidos manuales cuando la pieza continúa existiendo.

## Qué se ha conseguido y qué queda por mejorar

El preset tiene **2.383 triángulos**, 78 piezas incluidas las articulaciones sin geometría, y utiliza los 13 clips del rig estándar. Es una interpretación geométrica estilizada, no una reproducción exacta de la malla original de FF7. La ropa y el pelo aportan una silueta reconocible, pero no hay texturas pintadas ni animación facial. Los rangos extremos de proporciones o de longitud de espada pueden requerir ajustar la pose o alguna pieza manualmente.

La exportación GLB hornea las normales de las superficies planas, para conservar el aspecto facetado al abrir el archivo en otras aplicaciones. Las superficies suaves mantienen su sombreado.

El perfil se compone con las primitivas y mallas editables de Retrovisor; no depende de un modelo externo ni de una imagen generada. La compatibilidad con animaciones externas sigue pasando por el sistema de copia animada/retargeting del rig humanoide existente.

## Comprobaciones reproducibles

- `node scripts/render-hero-study.mjs 1` a `5`: capturas del cuerpo, cabeza, pelo, equipo y pose usando el render real.
- `node scripts/verify-heroic-studio.mjs`: creación desde la interfaz, cambio de proporciones, cuerpo sin cabeza, aplicación de cabeza y undo.
- `node scripts/run-playwright.mjs tests/e2e/heroic-character-design.spec.js --project=smoke`: exportación/reimportación JSON y GLB y edición por partes.
- `npm run test:unit` y `npm run build`.

Las capturas y entregables se guardan en `artifacts/psx-hero-art-direction/`. `cloud-hero.json` y `cloud-hero.glb` contienen la postura reutilizable; las capturas `05-pose-*` muestran la pose de presentación.
