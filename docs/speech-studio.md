# Bocas y voz dentro de Retrovisor

Abre el editor en **http://127.0.0.1:5176/** y selecciona la pestaña **Bocas y voz** bajo la cabecera. Es un espacio de trabajo del editor, junto a **Escena 3D**, sin ventana flotante. Los accesos del panel izquierdo y de Character Studio llevan al mismo espacio. El enlace antiguo `speech-lab.html` también redirige aquí; la comparación técnica de prototipos se conserva en `speech-lab.html?comparison=1`.

## Tu primer vídeo

1. Elige un personaje. Si tenías seleccionado un humanoide compatible, aparecerá primero. También puedes usar Mario N64, Cloud PSX o Exploradora N64.
2. Elige una boca **SVG**, **de capas** o **mandíbula 3D**. Usa **Ajustar posición de la boca** si la cabeza necesita otro encaje.
3. Selecciona **Webcam · primer plano**, **Cuerpo completo** o **Toda mi escena**. Arrastra el escenario para girar y usa la rueda para acercarte. **Centrar cámara** recupera el encuadre.
4. Cambia el color de fondo, usa **Croma verde** o carga una imagen. La vista de escena incluye una copia de tus objetos 3D en su posición actual.
5. Pulsa **Probar una frase**, carga tu audio o pulsa **Activar micrófono**. El micro solo se solicita al pulsarlo y no se reproduce por los altavoces.
6. Mantén visible la pestaña y pulsa **Grabar vídeo**. Con un archivo de audio, comienza desde el principio; con el micro, graba lo que digas. Pulsa **Terminar grabación**. El límite es de 90 segundos.
7. En **Última toma grabada**, revisa el vídeo y guarda el vídeo, la voz o la toma completa en ZIP.

Al volver a **Escena 3D**, el micro y la reproducción se detienen y se termina la grabación en curso. **Bocas y voz** conserva la pista, el fondo, los ajustes de boca y el encuadre. Al regresar, actualiza los personajes de la escena; si has seleccionado otro humanoide compatible, lo muestra y lo reencuadra.

La toma anterior se sustituye al terminar otra grabación. Se conserva al cambiar de espacio de trabajo, pero **debes descargarla antes de recargar o cerrar la página**.

## Reutilizar el personaje

**Añadir copia a mi escena** importa un personaje con la animación `speech` al editor y permite deshacer esa inserción. La previsualización y los ajustes de boca no modifican el personaje original.

**Modelo + animación · GLB** guarda el personaje, su rig y sus clips, incluido `speech`. **Movimientos · JSON** guarda la pista facial. **Todo para reutilizar · ZIP** incluye esos archivos y el audio cargado, si lo hay.

Para reutilizar exactamente una actuación grabada, usa **Guardar toma completa · ZIP** en el apartado de la toma. Esa exportación conserva el modelo y los movimientos de esa grabación aunque después cambies de personaje.

El ZIP contiene:

| Archivo | Uso |
| --- | --- |
| `model.glb` | Personaje y animación `speech`; no contiene sonido |
| `speech.track.json` | Movimientos de boca y tiempos en segundos |
| `voice.wav`, `voice.webm` o `voice.mp4` | Voz separada, según su procedencia y navegador |
| `performance.webm` o `performance.mp4` | Vídeo compuesto, cuando procede de una toma |
| `manifest.json` | Nombres de archivos, duración y datos del encuadre |
| `character.recipe.json` | Receta de construcción, cuando está disponible |
| `background.*` | Imagen de fondo, si se utilizó |
| `LEEME.txt` | Instrucciones de reproducción |

En Retrovisor puedes importar el GLB, seleccionarlo y volver a abrir Bocas y voz. Para recuperar una actuación, carga primero la voz y después su JSON. Para cambiar lo que dice, carga otra grabación y calcula sus gestos.

En un juego o aplicación 3D, reproduce el clip `speech` una vez y arranca el audio al mismo tiempo. Lo ideal es usar el reloj del audio para avanzar la animación. El modelo exportado no escucha el micrófono por sí solo: la aplicación que lo carga necesita un controlador para ese uso en directo.

## Qué cubre esta beta

- El micro anima la boca según la intensidad del sonido. No reconoce fonemas en directo.
- **Calcular gestos del audio** usa el motor Rhubarb local para grabaciones. La demo incluye gestos preparados y funciona sin ese motor. Véase [configuración local](local-lip-sync.md).
- Se reutilizan humanoides con una cabeza reconocible o un anclaje de boca guardado. Las cabezas de proporciones diferentes pueden necesitar ajuste manual; no hay ajuste universal a cualquier GLB.
- **Toda mi escena** muestra una copia de su composición actual. El vídeo incluye el decorado; el GLB del estudio contiene solo el personaje. Para conservar también un decorado editable, guarda o exporta la escena desde el editor.
- «Webcam» es el encuadre del avatar dentro de Retrovisor. No activa la cámara física ni instala una cámara virtual en Windows para llamadas.
- Se usa el formato de vídeo que admita el navegador, normalmente WebM. El vídeo tiene fondo opaco; el verde permite recortarlo después con croma.
- El ZIP es un formato documentado, pero **todavía no hay un importador comprobado para Hocuspocus**.

La interfaz comparte la tipografía pixelada, los paneles negros y grises, los bordes amarillos y los colores de acción del editor. El fondo inicial del escenario es oscuro; puedes seguir eligiendo un color, croma o imagen para el vídeo.
