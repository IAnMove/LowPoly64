# Encargo para Grok: revisión completa y vídeo de Retrovisor

Preparado el 8 de septiembre de 2026. Ejecutar después de la revisión final de la candidata 0.9.0. Este documento prepara el encargo; no acredita que Grok haya revisado o grabado la app.

## Objetivo y orden

Primero recorre la aplicación real, detecta y documenta fallos y corrige los que bloquean los recorridos descritos. Después graba un vídeo en español que permita a una persona nueva crear, editar, animar y guardar un personaje. Usa capturas de la aplicación funcionando y archivos exportados por ella.

Empieza leyendo [la revisión de la candidata](release-0.9.0-review.md), [las notas de versión](../RELEASE.md) y [README](../README.md). El código, los resultados de esta ejecución y las pruebas actuales prevalecen sobre afirmaciones antiguas en documentos. No presentes una prueba simulada de proveedor como una conversación real ni una foto como prueba de que un modelo se anima.

Trabaja sobre una copia de prueba de las escenas del usuario. Conserva los cambios ajenos. No publiques etiquetas, releases, vídeos ni mensajes externos como consecuencia automática de esta revisión: entrega los archivos y el informe para decidir la publicación.

## Preparación

1. Anota commit, versión, sistema, navegador y resolución. Instala dependencias con `npm ci`. El editor arranca con `npm run dev` en `http://127.0.0.1:5176/`; usa la dirección que confirme el arranque. No cierres otra app para ocupar su puerto.
2. Para agente y MCP, usa `npm run agent:dev`, [README-MCP](../README-MCP.md) y [la guía del agente](retrovisor-agent.md). Los secretos van en el entorno del companion; no los muestres en pantalla ni los incluyas en el vídeo.
3. Para analizar grabaciones nuevas, instala el motor opcional con `npm run rhubarb:install`. La demo y las pistas ya analizadas funcionan sin él. Comprueba también ese estado sin instalación y una build servida como web estática.
4. Para comprobar la build local y estática sin API, usa `npm run build` y `node scripts/check-speech-build.mjs`; conserva el informe y las capturas. Instala Chromium de Playwright con `npx playwright install chromium`, o configura `PLAYWRIGHT_EXECUTABLE_PATH` con un navegador compatible instalado. Ejecuta `npm run verify`, `npm run test:e2e` y, cuando los recorridos sean correctos, `npm run capture:release`.
5. El GLB de Meshy lo proporciona el usuario y no forma parte del repositorio. Para las pruebas correspondientes configura `MESHY_TEST_GLB` con su ruta. Registra como **no probado**, nunca como aprobado, un caso omitido por falta del donante.

## Matriz de revisión de toda la app

En cada fila comprueba el recorrido con ratón y controles visibles, la consola, el resultado exportado y su reapertura. Guarda una captura útil por fallo. Prueba una ventana de escritorio normal y otra estrecha; verifica que se puede cerrar cada modal y volver al editor.

| Área | Recorrido que hay que completar | Evidencia y aceptación |
| --- | --- | --- |
| Inicio y ayuda | Arranque limpio → ayuda → idioma ES/EN → configuración → vuelta al editor. | Sin errores de página; texto legible, controles accesibles y enlaces válidos. |
| Construcción | Primitivas y plantillas de varias categorías → seleccionar/multiseleccionar → mover, girar, escalar → agrupar/desagrupar → duplicar → Undo/Redo. | Transformaciones y jerarquía correctas. Undo/Redo restaura el estado esperado. |
| Materiales y texturas | Material, transparencia, color → importar textura → pintar/borrar → UV por cara → spritesheet → guardar/reabrir. | Se conservan píxeles, UV y transparencia en escena, JSON y GLB. Proveedores de textura externos se prueban solo si están configurados. |
| PNG a modelo | Imagen transparente o pez de ejemplo → grosor/borde → pintar relieve → crear → reabrir origen → exportar/reimportar. | Volumen 2.5D cerrado, sin huecos evidentes; se conserva la edición local. Prueba un archivo inválido y cancelar cambios pendientes. |
| SVG y Head Lab | SVG, texto y pixel art → extrusión/inflado → crear → editar origen → JSON/GLB. | Fuente editable al reabrir donde el formato la conserva; materiales y geometría coherentes; mensaje claro si la entrada no es válida. |
| Character Studio | PSX y N64 → cuerpo sin cabeza → cambiar cabeza → proporciones, pelo, ropa y equipo → crear. Repetir con espadachín PSX, Mario y Exploradora. | Vistas frontal, perfil y 3/4. Cabeza en HEAD, espada en HAND_R. Cambiar cabeza no borra accesorios o ajustes manuales ajenos. Receta, JSON y GLB reabren. |
| Avatar Forge | Nora, Ivo, Mara y Bruno → ojos/cejas/boca/pelo → mezclar gafas, pendiente y adorno → seis moldes corporales → crear y reabrir. | Rasgos apoyados en la cara, accesorios independientes, sin ocultaciones graves; texturas conservadas; editar receta sigue disponible. |
| Rig y biblioteca | Mostrar huesos → bindings → animación estándar → cambiar clip → pausar/reiniciar → guardar y cargar escena. | Movimiento real de la geometría, sin deformación explosiva o pérdida de clips. |
| Animar con GLB | Cuerpo PSX/N64 y Forge → ANIMAR CON GLB → donante compatible → caminar/correr/bailar → JSON/GLB → reimportar. Usar ese GLB exportado como nuevo donante. | 24 huesos en el perfil soportado, pesos finitos y normalizados, caras unidas a Head, movimientos conservados. El original editable sigue disponible. Un rig ajeno se rechaza de forma comprensible. |
| Motion Ripper | Abrir → vídeo local → avanzar frames/velocidad → pose neutra → grabar → importar → reproducir. Probar captura de pestaña si el entorno lo permite. | Movimiento utilizable con duración coherente; cancelar libera recursos. Anota dependencias de red/MediaPipe y permisos. |
| Agente y MCP | Conectar → inspeccionar → cubo azul → transformar → captura → Undo/Redo. Después receta → borrador → tres vistas → cambiar espada/cabeza → commit → JSON/GLB. | Herramientas reales, archivos completos y una acción deshacible por commit. Conflicto si cambió el original. Capacidades y visión comprobadas por modelo; sin fallback a nube no solicitado. |
| Bocas y voz · beta | Acceso directo lateral → frase demo → Intensidad/Gestos automáticos → Mario/Cloud/Exploradora → SVG/capas/mandíbula → audio propio → JSON/GLB. | Mismo audio y tiempo al cambiar modo/personaje; silencios cierran la boca; movimientos sobreviven a reimportación; ver prueba detallada debajo. |
| Guardado e intercambio | Guardar/cargar escena, objeto JSON, GLB con textura y animación, importación inválida, cancelar y Undo/Redo. | No se pierde el trabajo existente por una importación fallida; diferencia clara entre receta, objeto, escena y pista de voz. |

Pruebas reutilizables: `tests/e2e/smoke.spec.js`, `png-model-io-v2.spec.js`, `retro-reusable-body.spec.js`, `heroic-character-design.spec.js`, `avatar-forge-original-faces.spec.js`, `avatar-forge-persistence.spec.js`, `compatible-humanoid-rig.spec.js`, `llm-character-control.spec.js`, `llm-character-panel.spec.js`, `mario-speech-lab.spec.js`, `rhubarb-speech-lab.spec.js`, `speech-characters.spec.js` y `speech-availability.spec.js`. La lista completa sale con `npx playwright test --list --project=smoke`.

## Prueba central de Bocas y voz

1. Seleccionar **Bocas y voz** en las pestañas del editor. Debe ocupar el área de trabajo bajo la cabecera, sin popup ni iframe, con inicio silencioso y estado del motor visible. Volver a **Escena 3D** y regresar debe conservar pista, ajustes y cámara para el mismo personaje, sin alterar la escena. Comprobar ambos espacios en pantalla estrecha.
2. Pulsar **Probar una frase** y revisar Intensidad y Gestos calculados. La frase preparada tiene 54 segmentos y aproximadamente 8,83 segundos.
3. Cambiar entre un personaje de la escena, Mario N64, Cloud PSX y Exploradora N64. Comparar bocas SVG/capas/3D y ajustar anclajes. Probar primer plano, cuerpo, escena completa, color, croma e imagen. La comparación antigua de tarjetas permanece en speech-lab.html?comparison=1; speech-lab.html debe redirigir al espacio integrado.
4. Cargar una grabación propia de menos de 90 s/16 MB. Con motor instalado, **Calcular gestos del audio** debe producir una pista nueva. Parar durante el análisis y cargar otra grabación: un resultado antiguo no debe reemplazarla.
5. Guardar movimientos JSON y reabrirlos. Cargar primero el audio correspondiente y después el JSON para recuperar una actuación; un audio de duración incompatible debe separarse. El JSON contiene movimientos, no sonido.
6. Exportar los tres tipos de boca a GLB, importarlos en Retrovisor y reproducir el clip `speech`. Verificar dientes, lengua y movimiento; para estos presets se conservan también sus 13 clips corporales. El audio se usa aparte.
7. Sin motor o servicio, verificar que el botón de cálculo no promete funcionar y que se muestran instrucciones. Las demos, intensidad, JSON y exportaciones siguen disponibles. Tras instalarlo, reabrir el estudio debe detectar el motor.
8. Probar micrófono con permiso, permiso denegado y cierre mientras se pide permiso. Grabar vídeo con el micro y con un archivo de voz; revisar sincronía, silencio y finalización. Descargar el ZIP y verificar modelo, voz, pista y vídeo. Cambiar entre espacios detiene el micro y conserva la última toma durante la sesión; recargar la página la pierde. Probar micrófonos reales manualmente y anotar las plataformas cubiertas.
9. Añadir una copia hablada a la escena, volver a Escena 3D y deshacer. Confirmar que el personaje original y el decorado no cambiaron. La grabación de toda la escena incluye el decorado en el vídeo, mientras model.glb exporta el personaje.

## Afirmaciones que el vídeo debe respetar

- Bocas y voz es una **beta integrada** con personajes preparados, humanoides compatibles de la escena y tres tipos de boca. Puede requerir colocación manual. No instala una boca automáticamente en cualquier GLB importado, ni una cámara virtual de Windows. Hocuspocus aún necesita un importador.
- Rhubarb estima formas labiales aproximadas de grabaciones locales. No transcribe, no produce audio y no garantiza sincronía perfecta.
- SVG se convierte en texturas para el modelo; la boca de volumen todavía es un accesorio. No se deforma la piel facial completa ni hay un rig facial universal.
- El perfil de animación compatible es el de 24 huesos analizado. No garantiza compatibilidad universal con Meshy u otros proveedores. La copia animada se reproduce/exporta; para editar las piezas se vuelve al original.
- Un LLM dirige recetas y herramientas existentes. La validación estructural no garantiza parecido artístico. Ollama/LM Studio y los proveedores API necesitan pruebas reales independientes por modelo.
- La web estática conserva edición y demos; calcular nuevos gestos requiere el servicio local. Motion Ripper y proveedores opcionales tienen sus propias dependencias.

## Vídeo, después de corregir los bloqueos

Duración orientativa: 8–12 minutos, 1080p, narración española clara, cursor visible y sin credenciales. Usa preferentemente un personaje original como Exploradora para la explicación general; Mario y Cloud pueden ilustrar los estudios visuales existentes sin prometer copias exactas.

| Capítulo | Demostración en pantalla |
| --- | --- |
| 00:00 — Qué puedes hacer | Un personaje creado, animado y hablando; resultado exportado. |
| 00:40 — Orientarse | Escena, paneles, selección, propiedades, ayuda y guardado. |
| 02:00 — Crear | Character Studio y cuerpo reutilizable; cabeza/equipo. Breve comparación con Avatar Forge. |
| 04:00 — Modelar y decorar | PNG/SVG, textura y una modificación manual concreta. |
| 05:15 — Animar | Biblioteca y ANIMAR CON GLB. Breve ejemplo de Motion Ripper si fue validado. |
| 06:45 — Bocas y voz | Misma frase y tres bocas/personajes; grabación propia, estado del motor y exportación `speech`. |
| 09:00 — Agente y guardar | Una edición mediante receta/LLM validada, Undo, JSON y GLB reabierto. Si el proveedor no está disponible, indicarlo y mostrar el flujo manual. |
| 10:30 — Próximo paso | Dónde abrir la ayuda y límites de la beta que afectan al uso. |

No reutilices el pequeño vídeo de bocas como si fuera esta revisión completa. Puede servir como inserto identificado. Graba la aplicación y explica los clics necesarios, evitando una sucesión de pantallas sin un objetivo.

## Entregables y criterio de cierre

- `artifacts/grok-release-review/report.md`: tabla de recorridos con aprobado/fallo/no probado, entorno, pasos, evidencia y limitaciones.
- Registro de incidencias con gravedad, reproducción, esperado/obtenido y estado. Pérdida de datos, exportación rota, arranque fallido y bloqueos del recorrido anunciado impiden recomendar publicación.
- `artifacts/grok-release-review/video/retrovisor-tour.mp4`, subtítulos `.srt`, guion y capítulos. Añade los proyectos/recetas/JSON/GLB usados para repetir el vídeo.
- Capturas y logs, con un resumen pequeño versionable en `docs/releases/v0.9.0/`; no añadir carpetas temporales, ejecutables locales, secretos ni el donante privado al release.
- Veredicto final: publicar, publicar con límites explícitos o bloquear; enumera únicamente lo que quedó pendiente de verdad.

La publicación es un paso posterior: preparar el commit con todos los archivos de la entrega, confirmar versión y lock, ejecutar las comprobaciones sobre ese commit y crear la etiqueta solo tras decidir publicar. El workflow actual lee `RELEASE.md` **desde la etiqueta**, y no ejecuta pruebas ni adjunta una build automáticamente. Empujar a `main` sin una etiqueta nueva no publica estos cambios como una versión nueva.
