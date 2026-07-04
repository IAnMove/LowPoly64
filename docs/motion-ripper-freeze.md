# Motion Ripper: congelación del retargeting universal (2026-07-02)

## Qué se congeló

El botón **IMPORT INTO CURRENT MODEL** del capturador de vídeo (Motion Ripper) queda
limitado a dos casos donde el mapeo de huesos es 1:1 por construcción:

1. Personajes generados por la propia captura (`isCaptureGeneratedGroup`).
2. Grupos que declaran `skeletonId: "HUMANOID_STANDARD"` y contienen físicamente
   todos los huesos del esqueleto estándar (verificado por nombre de nodo).

Para cualquier otro modelo el botón aparece deshabilitado con un mensaje que explica
la alternativa: crear un personaje de captura y exportar el clip.

Implementación: `resolveImportEligibility()` en
`src/modules/animation/motion-ripper-target-config.js`, aplicada en
`motionRipperImportCapture()` y en el estado del botón
(`updateImportButtonState()` en `motion-ripper-ui.js`).

## Por qué

Diagnóstico completo en `task.md` (Problema 1). Resumen: el retargeting rest-delta
(`final = targetRest * (frame * inverse(referenceFrame))`) solo es válido si los ejes
locales del rig de captura y del rig destino coinciden. Nuestros templates son
jerarquías de PivotGroups con pivots y orientaciones arbitrarias y distintas entre sí,
así que el resultado "casi funciona" en un modelo y se rompe en otro. Un ciclo previo
de 27 tareas (`normalize-humanoid-video-animation-pipeline`) atacó exactamente esto y
no bastó: no es un bug, es un problema estructural.

## Qué NO hacer

- No abrir más iteraciones de "mejorar el retargeting" (estabilización, constraints,
  heurísticas de compensación). Esa vía está agotada.
- No ampliar el gate de `resolveImportEligibility` con nuevas heurísticas.

La única vía de mejora es migrar modelos a `HUMANOID_STANDARD` (Fase 3 de
`newtask.md`): con rigs idénticos en convención, aplicar un clip es copiar curvas.

## Criterio de reevaluación

Tras completar la Fase 3 (moldes generados conformes a HUMANOID_STANDARD y librería
de clips), probar: captura de vídeo → rig canónico → clip estándar → molde migrado.

- Si convence: mantener solo ese camino y borrar `motion-ripper-retargeting.js` y
  código muerto asociado.
- Si no convence: borrar el subsistema `motion-ripper-*` completo (~40 ficheros,
  el módulo más grande del repo). Es autocontenido y barato de eliminar.

Decisión registrada como T3.4 en `newtask.md`.

## Decision T3.4 (2026-07-02)

La reevaluacion se cierra manteniendo Motion Ripper solo como generador de clips
estandar:

1. Captura de video / frames grabados.
2. Rig canonico `HUMANOID_CAPTURE`.
3. Conversion declarativa a `clip.json` `HUMANOID_STANDARD`.
4. Aplicacion al molde mediante la tuberia T3.2 (`translateAnimForMesh`), donde
   solo se escala el root position por estatura y las rotaciones se copian.

El retargeting a modelos arbitrarios queda eliminado. Se borro
`motion-ripper-retargeting.js`, la aplicacion de esqueletos capturados sobre
grupos/JSON serializados y el generador legacy no-skinned
`buildCaptureCharacterGroup`. Se conserva la ruta de personaje skinned creado por
captura porque no retargetea a un modelo arbitrario: el modelo se genera con el
propio esqueleto capturado.

Evidencia de la reevaluacion:

- `tests/e2e/motion-ripper-half-body.spec.js` hidrata frames sinteticos de captura,
  produce el clip estandar con targets como `Hips`, `Spine` y `Right_Hand`, lo
  importa en `psx_humanoid_chibi_mold_cm` y parsea el GLB exportado para confirmar
  que la animacion sale del editor.
- La misma suite mantiene las capturas half-body, neutral pose, orientacion del
  root motion y la ruta skinned capture-generated.
- `rg --files src tests docs | rg "motion-ripper-retargeting|retargeting"` no
  encuentra el modulo de retargeting arbitrario eliminado.
- Revalidado tras T3.2/T3.3 con
  `playwright test tests/e2e/motion-ripper-half-body.spec.js --project=smoke`,
  `npm run check` y `npm run build`.

Regla vigente: no reintroducir adaptacion rest-delta hacia modelos con pivots/ejes
propios. Si un modelo debe recibir capturas, primero debe conformar a
`HUMANOID_STANDARD` o generarse desde la propia captura.
