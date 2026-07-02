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
