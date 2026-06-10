# Problemas identificados y plan de acción

Estado del repo al hacer el diagnóstico: branch `fable/fixing_problems`, `npm run check` y `npm run build` pasan en verde. Los problemas no son de build, son de diseño, de resultado visual y de versionado.

---

## Problema 0 (URGENTE): las cabezas hechas a mano no están en control de versiones

Es el arreglo más barato y el riesgo más grave, por eso va primero.

**Diagnóstico**

- `src/data/avatar/catalog/head-meshes.js` importa la geometría de las cabezas desde `artifacts/white_mesh180.legacy.json` y `artifacts/cabezas/*.legacy.json` (normal175, cabezon175, duro175, duro250, gordo175, gordo275).
- `artifacts/` está en `.gitignore` y git no trackea **ninguno** de sus 1836 ficheros. Las cabezas que "dan el pego" solo existen en este disco: si se pierde la carpeta, se pierden, y un clon limpio del repo **no compila**.
- Además `.gitignore` contiene la línea `openspec`, así que solo 8 ficheros de `openspec/` están versionados; todas las propuestas y specs activas (incluidas las de avatar y la del pipeline de captura) tampoco están en git.
- Hay 4 logs `.tmp-*.log` trackeados por accidente (entraron antes de añadir `.tmp*` al ignore).

**Plan**

- [ ] Mover los `*.legacy.json` de cabezas a `src/data/avatar/heads/` (datos de runtime viven en `src/data`, no en una carpeta de volcados) y actualizar los imports de `head-meshes.js`.
- [ ] Commitear las cabezas. Verificar con un `git clean -xdn` mental / clon de prueba que el build ya no depende de nada ignorado.
- [ ] Quitar `openspec` de `.gitignore` y commitear `openspec/` completo (o decidir explícitamente que no se versiona, pero entonces sacar las decisiones importantes a `docs/`).
- [ ] `git rm --cached` de los 4 logs `.tmp-*.log` trackeados.

---

## Problema 1: capturador de skeletons desde vídeo (Motion Ripper)

**Diagnóstico (por qué nunca funciona bien)**

No es un bug puntual: es un problema estructural de retargeting. La cadena es:

```
landmarks MediaPipe (monoculares, ruidosos, sin profundidad fiable)
  → pose solver heurístico (motion-ripper-pose-solver.js)
  → rotaciones Euler XYZ por articulación
  → retargeting "rest-delta" sobre el modelo seleccionado (motion-ripper-retargeting.js)
```

El retargeting rest-delta (`final = targetRest * (frame * inverse(referenceFrame))`) asume que la rotación delta del rig de captura es válida en el espacio local del hueso destino. Eso solo es cierto si los **ejes locales** de ambos rigs coinciden. Nuestros modelos no son skeletons reales: son jerarquías de `PivotGroup`s donde cada template tiene pivots, orientaciones y rest poses arbitrarias y distintas entre sí. Por eso "casi funciona" en un modelo y se rompe en otro. A esto se suman tres contratos de huesos conviviendo (`HUMANOID_DEFAULT`, `HUMANOID_CAPTURE`, `HUMANOID_STANDARD`) unidos por una capa de aliases.

La evidencia de que esto no se arregla iterando: el change `normalize-humanoid-video-animation-pipeline` (27 tareas, todas completadas, 25+ commits) atacó exactamente esto — proporciones, rest-delta, aliases, supresión de tracks ruidosos — y el resultado sigue sin convencer. El subsistema ocupa ~290 KB en ~40 ficheros (`motion-ripper-*`, `capture-skinned-character.js`, `animateur-animation-import.js`): es el módulo más grande del proyecto y el que menos valor entrega.

**Decisión recomendada: congelar el retargeting universal, no tirar todo**

La mitad de la feature sí funciona y es recuperable: capturar a un rig canónico. Lo que no funciona y no va a funcionar sin reescribir los rigs es "importar a cualquier modelo seleccionado".

**Plan**

- [ ] 1.1 Congelar la rama "IMPORT INTO CURRENT MODEL" para modelos arbitrarios: ocultar/deshabilitar el botón salvo que el grupo seleccionado declare `skeletonId: HUMANOID_STANDARD` con bindings completos. Mensaje claro en UI cuando no aplica.
- [ ] 1.2 Mantener solo el camino que sí es fiable: captura → modelo canónico de captura (`capture_humanoid` / `HUMANOID_STANDARD`) → exportar clip como asset Fast Poser. Sin retargeting creativo: mismos huesos, mapeo 1:1.
- [ ] 1.3 No abrir más iteraciones de "mejorar el retargeting" (estabilización, constraints, heurísticas). Esa vía está agotada; cualquier mejora futura pasa por migrar modelos a `HUMANOID_STANDARD`, no por más matemática de compensación.
- [ ] 1.4 Criterio de reevaluación en 1 mes: si tras migrar 2-3 personajes propios a `HUMANOID_STANDARD` la importación 1:1 funciona bien, la feature se queda en ese alcance reducido. Si ni eso convence, borrar los ~40 ficheros `motion-ripper-*` y el botón de captura (es un subsistema aislado; eliminarlo es barato y se lleva de paso los dos ficheros más gordos del repo, `motion-ripper-ui.js` 46 KB y parte de `anim-mode-ui.js`).
- [ ] 1.5 Documentar la decisión en `docs/` (qué se congeló, por qué, y el criterio de reevaluación) para no volver a caer en otro ciclo de 27 tareas.

---

## Problema 2: generador de caras/personajes lejos del look N64/PSX

**Diagnóstico**

Las cabezas manuales nuevas son buenas, pero el sistema que coloca rasgos sobre ellas hereda tres defectos de diseño:

1. **Anchors compartidos entre cabezas distintas.** En `head-molds.js`, los 7 molds (normal, cabezón, duro, gordo…) usan **el mismo** `MESH_PORTRAIT_MOUNT_ANCHORS` y los mismos `MESH_PORTRAIT_PART_PRESET_OFFSETS`, todos calibrados para `white_mesh180`. Y en `head-meshes.js` cada cabeza se encaja con escala uniforme dentro de `WHITE_MESH180_TARGET_BOX`. Un cabezón y un gordo tienen los ojos/boca/pelo en sitios distintos del cráneo: con anchors clonados, los rasgos quedan mal colocados por construcción. Este es el fallo concreto de "los templates previos están mal colocados".
2. **Offsets manuales combinatorios.** Cada preset (peinado, ojos, accesorio) necesita su offset afinado a mano por mold (`partPresetOffsets`). Con 7 cabezas × decenas de presets, cada cabeza o preset nuevo multiplica el trabajo manual. Eso es lo contrario de "que otros modelos puedan crear los ajustes".
3. **Dos rutas conviviendo.** La ruta legacy de "cara SVG completa" (head-shapes, familias PSX/N64/Bridge) sigue viva junto a la ruta mold. La propia propuesta `avatar-head-mold-feature-controls` ya reconoce que el catálogo de head-shapes hay que abandonarlo. Mantener ambas duplica el coste de cada cambio.

Además, estéticamente, los rasgos como capas SVG proyectadas tiran a "Mii/avatar plano". El look N64 real (Mario 64, Banjo) es: cráneo low-poly con silueta fuerte + ojos/boca como **textura o decal plano** + nariz/orejas como geometría simple. Eso ya lo concluiste tú mismo en `docs/mario64-head-limitations.md`.

**Replanteamiento propuesto (reescritura asumida y bienvenida)**

Principio rector: **cada cabeza es autodescriptiva y todo es JSON declarativo validable**, para que un LLM pueda generar tanto cabezas como ajustes sin tocar JS.

- [ ] 2.1 Definir el formato `head.json`: geometría (`vertices`/`faces`, como los templates) + **landmarks 3D propios** en el espacio del propio mesh: `eyeL`, `eyeR`, `noseTip`, `mouth`, `earL`, `earR`, `hairline`, `crown`, `chin`. Sin caja de fit común, sin heredar anchors de otra cabeza. Convertir las 7 cabezas actuales a este formato (los landmarks se colocan una vez por cabeza, a mano o con un helper en el editor).
- [ ] 2.2 Definir el formato `feature.json`: cada rasgo declara a qué landmark se monta, su tamaño relativo al cráneo (proporcional a la distancia inter-ocular o al bounding del cráneo, no píxeles absolutos) y su tipo de render: `decal` (quad con textura — ojos, boca, cejas) o `geometry` (pieza low-poly — nariz, orejas, pelo).
- [ ] 2.3 Reescribir el montaje en `avatar-builder.js`/`svg-head-integration.js` sobre landmarks: posición = landmark + offset relativo del preset; escala = proporción declarada × medida del cráneo. Esto elimina `MESH_PORTRAIT_MOUNT_ANCHORS`, `partPresetOffsets` y el fit a `WHITE_MESH180_TARGET_BOX`.
- [ ] 2.4 Pelo como casco geométrico que se ajusta a `hairline`/`crown` del mesh real (no a una silueta 2D), con 4-6 formas base N64: bowl, picos, coleta, gorra.
- [ ] 2.5 Controles tipo Mii por avatar (ya planteados en el openspec activo): size / up-down / left-right / spacing, aplicados como deltas sobre el landmark. Persisten en `avatarRecipe`.
- [ ] 2.6 Borrar la ruta legacy: catálogo amplio de `head-shapes`, cara SVG completa como base, y las familias PSX/N64/Bridge como eje del builder. Migrar las recetas guardadas o aceptar la rotura (estamos pre-1.0).
- [ ] 2.7 Auditoría visual automática: script (apoyado en los audit scripts y Playwright que ya existen) que renderice cada cabeza × preset base de frente y de perfil, compruebe que cada rasgo cae dentro de una tolerancia de su landmark, y guarde screenshots de comparación. Que falle en CI/`npm run check` si un rasgo se sale.
- [ ] 2.8 Escribir `docs/HEADS.md` + un prompt tipo `ask.md` ("ask-head.md"): instrucciones para que un LLM externo genere una `head.json` (con sus landmarks) o un `feature.json` válidos, con ejemplos completos, los rangos de proporción aceptados y el checklist de la auditoría 2.7. Mismo patrón que ya funciona para objetos y animaciones.
- [ ] 2.9 Actualizar los 2 changes openspec activos de avatar (`avatar-head-mold-feature-controls`, `avatar-forge-feature-placement-workflow`) para reflejar este diseño por landmarks, o cerrarlos y abrir uno nuevo limpio que los sustituya.

Orden sugerido: 2.1 → 2.3 con **una sola cabeza y un solo rasgo (ojos)** hasta validarlo visualmente, y solo entonces migrar el resto. (Es exactamente el gate que ya proponía `avatar-forge-feature-placement-workflow`: validar la base antes de multiplicar variantes.)

---

## Problema 3: trabajo en curso sin cerrar (higiene de openspec y del branch)

**Diagnóstico**

- 6 changes openspec activos a la vez. Cuatro están al 100 % sin archivar: `undo-export-animations` (71/71), `refactor-large-ui-modules` (14/14), `avatar-head-mold-feature-controls` (22/22), `normalize-humanoid-video-animation-pipeline` (27/27). `production-hardening-help-center` está casi sin empezar (2/23). `avatar-forge-feature-placement-workflow` va por 14/24.
- La punta del branch es un commit "work in progress" sin descripción.

**Plan**

- [ ] 3.1 Archivar los 4 changes completados (`openspec archive`), una vez `openspec/` esté versionado (Problema 0).
- [ ] 3.2 Decidir el destino de `production-hardening-help-center`: o se prioriza o se cierra; 21 tareas pendientes paradas solo generan ruido.
- [ ] 3.3 Reemplazar el commit "work in progress" por commits con mensaje real antes de seguir construyendo encima (o al menos no repetir el patrón).

---

## Orden de ejecución propuesto

1. **Problema 0** — una sesión corta, elimina riesgo de pérdida de datos y arregla el clon limpio.
2. **Problema 1 (1.1–1.2)** — congelar el mocap es quitar trabajo, no añadirlo; libera foco inmediatamente.
3. **Problema 3** — archivar y limpiar, media sesión.
4. **Problema 2** — el grueso del trabajo nuevo y donde está el valor del producto. Empezar por el spike de una cabeza + ojos sobre landmarks (2.1–2.3) antes de comprometerse con la migración completa.
