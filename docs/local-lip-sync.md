# Sincronización labial local

El laboratorio permite comparar **Intensidad** y **Gestos automáticos** sobre el mismo audio. El primero sigue el volumen. El segundo usa Rhubarb Lip Sync 1.14.0 para estimar formas labiales y sus tiempos, y las convierte al contrato de bocas que ya utiliza Retrovisor.

## Probarlo

1. Selecciona la pestaña **Bocas y voz** junto a **Escena 3D** y carga la frase de ejemplo. La [guía del estudio integrado](speech-studio.md) explica grabación, fondos y reutilización. La página `speech-lab.html` redirige al espacio integrado; `speech-lab.html?comparison=1` conserva la comparación de prototipos.
2. Alterna **Intensidad** y **Gestos automáticos**. Se mantiene el audio y la posición del reproductor.
3. Para una grabación propia, pulsa **Cargar audio** y después **Calcular gestos del audio**. El navegador prepara un WAV y lo analiza un proceso de este equipo.
4. Revisa el resultado sobre tu personaje compatible, Mario N64, Cloud PSX o Exploradora N64. Guarda movimientos JSON, exporta el personaje con el clip `speech` a GLB o descarga el ZIP con la voz separada.

Los JSON nuevos conservan también el origen de los gestos automáticos y sus formas originales. Al reabrirlos se mantiene ese modo; las pistas antiguas siguen siendo compatibles. Un JSON sin audio permite reproducir los movimientos guardados, pero no recalcular la sensibilidad de una grabación ausente.

El audio se entrega separado del GLB. El micrófono en directo sigue usando intensidad: este experimento analiza grabaciones, no añade reconocimiento fonético en tiempo real.

## Ejemplo reproducible

`public/speech-demo/phrase.rhubarb.json` contiene el resultado real de analizar `phrase.wav`: 54 segmentos durante 8,82 segundos, con las ocho formas disponibles. La grabación conserva su duración completa de aproximadamente 8,83 segundos. Este ejemplo ya analizado funciona también en una página estática, sin instalar el motor.

El modo `phonetic` de Rhubarb sirve para idiomas distintos del inglés. Estima formas de boca; **no transcribe la frase ni garantiza fonemas o sincronización perfectos**. Los tiempos se pueden conservar y corregir mediante JSON.

## Instalar y ejecutar el motor

Desde la carpeta del proyecto, instala primero las dependencias:

```text
npm ci
npm run rhubarb:install
npm run dev
```

Abre la dirección local del servidor (por defecto `http://127.0.0.1:5176/?studio=speech`). El estudio indica si el análisis local está disponible. Tras instalar el motor, cambia a **Escena 3D** y vuelve a **Bocas y voz** para comprobarlo de nuevo; se conserva la pista.

Para analizar un WAV fuera de la interfaz: `npm run rhubarb:analyze -- entrada.wav salida.json`.

La instalación queda bajo `tools/rhubarb-lip-sync/v1.14.0/`, con un manifiesto de versión, procedencia y hashes. No se incluye el ejecutable en `public/` ni en el kit de personajes. El servicio de análisis se incorpora al servidor de desarrollo y a la vista previa de Vite; una web alojada sin ese servicio puede reproducir e importar pistas ya preparadas.

El servicio recibe WAV PCM por `/api/speech/rhubarb` y solo acepta peticiones locales. Limita tamaño, duración, concurrencia y tiempo de proceso. Las grabaciones no se envían a proveedores externos; los archivos temporales se eliminan al terminar o cancelar.

## Correspondencia de formas

| Forma de Rhubarb | Gesto de Retrovisor |
| --- | --- |
| X | Reposo |
| A | M: cierre labial |
| B | I |
| C | E |
| D | A |
| E | O |
| F | U |
| G | F: labio inferior y dientes |
| H | E, aproximación: todavía no hay una forma específica para L |

Los mismos tiempos controlan las bocas SVG, de capas y de mandíbula. Mejorar el reconocimiento no sustituye el trabajo de integrar labios y mandíbula en la malla de la cara: las bocas siguen siendo prototipos superpuestos.

Fuentes: [documentación oficial de Rhubarb](https://github.com/DanielSWolf/rhubarb-lip-sync/blob/master/README.adoc), [versión 1.14.0](https://github.com/DanielSWolf/rhubarb-lip-sync/releases/tag/v1.14.0), [licencia MIT](https://github.com/DanielSWolf/rhubarb-lip-sync/blob/master/LICENSE.md).
