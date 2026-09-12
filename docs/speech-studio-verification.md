# Verificación del estudio integrado — 9–10 de septiembre de 2026

Esta ampliación corresponde a `integrated-speech-webcam`. No publica una release en GitHub.

## Comprobaciones realizadas

- **13 pruebas unitarias** de captura, audio y ZIP: reloj de grabación, cierre de boca, límite de duración, stop repetido, errores, limpieza, permisos tardíos, decodificación obsoleta, salida de audio, transición de archivo a micro y referencias del manifiesto.
- **3 recorridos nuevos en Edge**: escena y personaje seleccionados, fondo de color e imagen, micrófono simulado con MediaRecorder real, grabación desde archivo, ZIP, tres bocas exportadas/reimportadas con movimiento, anclajes reutilizados, pista sin voz, cierre pendiente y conservación de la última toma.
- **8 regresiones existentes**: accesos del editor y Character Studio, Mario/JSON/GLB, laboratorio de comparación y ausencia del servicio de análisis. Los once recorridos quedaron correctos tras corregir la exportación y ajustar las expectativas de intensidad y latencia del audio de prueba; no son once pruebas adicionales a las tres anteriores.
- **Compilación correcta**. El aviso previo sobre paquetes grandes permanece; no se ha cambiado el presupuesto global de tamaño.
- **Distribución local y estática verificadas**: apertura directa mediante `/?studio=speech`, inicio silencioso, exportación con 14 clips (13 corporales y `speech`), ocho canales de boca SVG, ayuda integrada y ningún error de página.
- **Rhubarb real desde el estudio compilado**: análisis local de la frase, con 52 segmentos. La demo guardada conserva sus 54 segmentos preparados; la diferencia procede del WAV decodificado y normalizado por el navegador.

## Integración como espacio de trabajo

La corrección solicitada sustituye el popup por **Escena 3D / Bocas y voz**, bajo una cabecera compartida. Se verificaron cuatro recorridos nuevos: diseño y cámara en pantalla normal y estrecha, conservación de pista y tamaño de boca, nueva selección de escena, aislamiento de atajos y suspensión del micro, redirección del enlace antiguo, detección del motor al volver y finalización/cancelación de grabaciones al cambiar de modo.

Los cuatro recorridos nuevos y los once anteriores quedaron correctos en las ejecuciones dirigidas. Se ajustó la comparación de cámara a la precisión decimal de Three.js; el acceso de Mario se repitió tras una carga de módulo interrumpida y pasó sin cambios de producto.

## Grabaciones inspeccionadas

El vídeo de micrófono simulado contiene VP9 a **1280 × 720** y audio Opus. Su archivo de voz separado tiene señal (nivel medio aproximado de −17,9 dB).

La toma desde archivo contiene también VP9 y Opus. En la comprobación de captura inicial, el vídeo dura aproximadamente **8,79 s**, el audio separado **8,76 s** y la pista de boca **8,85 s**. Son tiempos de captura del navegador; no se promete sincronía exacta a la muestra. La voz tiene señal (nivel medio aproximado de −21,3 dB). Los movimientos registrados conservan la actuación y terminan en reposo.

Las pruebas de micrófono usan un oscilador y un stream de audio del navegador. **No equivalen a una prueba con el micrófono físico del usuario**. La activación real requiere pulsar el botón y aceptar el permiso.

## Reproducir la verificación

```text
node --test tests/speech-recorder.test.js tests/speech-studio-audio.test.js tests/speech-bundle.test.js
node scripts/run-playwright.mjs --project=smoke integrated-speech-studio.spec.js speech-workspace.spec.js speech-workspace-lifecycle.spec.js speech-availability.spec.js mario-speech-lab.spec.js
npm run build
node scripts/check-speech-studio-build.mjs
```

En equipos sin Chromium de Playwright, indica el ejecutable compatible mediante `PLAYWRIGHT_EXECUTABLE_PATH`. Ejecuta los recorridos y la comprobación del paquete de forma sucesiva, para evitar competencia entre renderizadores de software.

Evidencia local bajo `artifacts/integrated-speech/`: capturas, dos ZIP de actuaciones, vídeos/voz separados, métricas de movimiento y `production-verification.json`.

La compatibilidad con Hocuspocus, una cámara virtual del sistema, otros navegadores y el ajuste a cualquier GLB siguen fuera de lo verificado. [Guía de uso y reutilización](speech-studio.md).

## Catálogo con miniaturas

El generador captura los **305 modelos** del registro con sus constructores reales y comprueba que ninguna imagen esté vacía. La prueba `template-thumbnails.spec.js` verifica todas las imágenes, dimensiones, carga diferida y colocación a la derecha; comprueba además que ratón y teclado siguen creando el modelo elegido y que se puede volver desde Bocas y voz. [Generación y uso](template-thumbnails.md).

## Estética retro — 12 de septiembre de 2026

Se revisaron capturas de la versión compilada a 1440 × 1080, 1024 × 768 y 520 × 900. Los controles usan Press Start 2P, bordes rectos y la paleta del editor; no hay desplazamiento horizontal de página. Se comprobaron reproducción/parada de voz y descarga de JSON. Evidencia en `artifacts/speech-retro-theme/`, incluido `verification.json`.
