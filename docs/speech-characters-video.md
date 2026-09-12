# Lip sync con varios personajes

El vídeo `public/speech-demo/cast/lip-sync-personajes.mp4` muestra Mario N64, Cloud PSX y una exploradora original N64. Los tres usan la misma grabación y los mismos tiempos de boca. Cada capítulo cambia el sistema de boca: dibujo SVG, capas recortadas y mandíbula con volumen.

## Desde Retrovisor

1. Pulsa **BOCAS Y VOZ · BETA** en la barra lateral (**SPEECH LAB · BETA** en inglés).
2. También está en **Character Studio → Laboratorio de bocas · 2D / 3D**. La demo funciona sin instalar el motor; para analizar audio nuevo sigue [la guía local](local-lip-sync.md) y comprueba su indicador.
3. Elige un personaje en **Personaje**. Las tres tarjetas muestran distintas bocas sobre ese personaje.
4. Pulsa **Escuchar frase** y **Gestos automáticos** para usar la demostración ya analizada.
5. Para una grabación propia, pulsa **Cargar audio**, espera a que esté preparada y pulsa **Calcular gestos del audio**. Después reproduce el audio. Se admiten archivos de hasta 90 segundos y 16 MB; el análisis se realiza en el equipo local.
6. Compara las tres tarjetas, gira las vistas y explora el tiempo sin sonido. Cambiar de personaje conserva el audio y sus movimientos.
7. **Guardar [nombre del personaje] hablando · GLB** guarda el modelo seleccionado con su animación de boca. **Guardar movimientos · JSON** conserva la pista de movimientos.

El GLB incluye el movimiento y conserva el rig del personaje. El sonido permanece en un archivo separado. El micrófono en directo mueve la boca por volumen; el análisis automático de formas se aplica a grabaciones.

## Alcance actual

El selector ofrece estos tres personajes preparados. Todavía no coloca automáticamente una boca en cualquier GLB importado en la escena principal. Cada cabeza tiene su tamaño y anclaje de boca ajustados. La mandíbula sigue siendo un accesorio articulado: aún no deforma la piel de la cara. El reconocimiento es aproximado y sus tiempos pueden necesitar correcciones.

## Reproducir el vídeo

`node scripts/render-speech-cast.mjs --sample` genera una imagen de cada capítulo para revisar las caras. Sin `--sample`, el script renderiza todos los fotogramas a 24 FPS y combina la animación con la grabación original mediante FFmpeg. Esto conserva los tiempos aunque el renderizado tarde más que la duración del vídeo. No se reproduce sonido por los altavoces durante la creación.

El vídeo utiliza las recetas, bocas, anclajes y analizador que usa el laboratorio. Los informes de duración, fotogramas y comprobaciones de la aplicación están en `artifacts/speech-cast/`.
