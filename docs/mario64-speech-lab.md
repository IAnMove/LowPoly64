# Mario N64 y laboratorio de bocas

## Usarlo

Con Retrovisor abierto, entra en **Character Studio → Mario / N64**. Puedes modificar las proporciones y colores, crear el personaje completo o reutilizar solo el cuerpo. El enlace **Laboratorio de bocas · 2D / 3D** abre `speech-lab.html`, incluido también en la compilación de producción.

En el laboratorio:

1. **Escuchar frase** carga una voz de ejemplo. Alterna **Intensidad** y **Gestos automáticos** para comparar ambas animaciones sobre el mismo audio y mantener la posición.
2. **Escuchar vocales** usa A, E, I, O, U, M y F con tiempos preparados, sin intentar reconocer fonemas.
3. **Cargar audio** permite usar un archivo propio de hasta 90 segundos y 16 MB. **Calcular gestos del audio** analiza sus formas labiales en este equipo con Rhubarb. La sensibilidad controla cuánto abre la boca.
4. **Explorar sin sonido** y los botones de gestos permiten inspeccionar cada forma. **Sobre Mario / Solo las bocas** facilita comparar los tres sistemas; arrastra para girar cada vista.
5. Cada tarjeta exporta un Mario completo a GLB con el clip `speech`. **Guardar movimientos** conserva una pista JSON; **Abrir movimientos** acepta esa pista o un JSON de cues.

El micrófono se activa solo al pulsarlo y aceptar el permiso del navegador. No tiene retorno a los altavoces. Su escucha en directo no se graba: las exportaciones usan la pista de audio o cues preparada. Parar, cambiar a reproducción o cerrar la página cancela también una solicitud pendiente de micrófono.

## Personaje y recetas

Mario es una interpretación geométrica inspirada en Super Mario 64, creada mediante el generador de Retrovisor; no es una extracción del modelo original. El cuerpo es redondo y reutilizable. Cabeza, gorra, nariz, bigote, ojos, peto, botones y guantes son piezas con anclajes. Tiene **5.122 triángulos** y los **13 clips** del rig humanoide existente.

- Receta canónica: `docs/examples/character-design/mario64.recipe.json`.
- Cloud preservado: `docs/examples/character-design/cloud-hero.recipe.json`.
- Assets y capturas: `artifacts/mario64-speech-lab/`.
- Archivos accesibles desde la página: `public/character-examples/mario64/`.
- Catálogo para el agente: `studio:mario64`. Usa el mismo flujo de borrador, corrección, revisión y confirmación de personajes que Cloud.

La receta de Cloud se conserva byte por byte: SHA-256 `5D44920515A9C228A582C6666C2FF2A431123813A32DBCEF7EA38B7DAF611588`.

Los nuevos perfiles del contrato `retrovisor-character-design` son `body.profile: "plumber"`, `head.profile: "plumber"`, `hair.style: "plumber_cap"` y `outfit.style: "overalls"`. El LLM puede escoger este punto de partida y modificar sus parámetros; la geometría la construye la aplicación. Esto no implica que cualquier personaje arbitrario alcance automáticamente el mismo parecido.

## Tres prototipos

| Sistema | Construcción | Qué aporta |
| --- | --- | --- |
| SVG | Ocho dibujos vectoriales propios, cargados en planos transparentes | Un estilo gráfico controlable y detalles dibujados. Los SVG fuente se entregan por separado; el GLB incorpora su rasterización. |
| Capas 2D | Contorno poligonal, labios, dientes y lengua planos | Formas editables sin texturas, con apertura y anchura animadas. |
| Mandíbula 3D | Cavidad con volumen, dientes, lengua, labios y mandíbula independiente | Profundidad visible de perfil y un primer movimiento de mandíbula exportable. |

La mandíbula 3D es un accesorio articulado de prueba. Todavía no abre un hueco en la malla de la cara ni deforma la piel y las mejillas. Las bocas 2D también pueden separarse visualmente de la superficie desde ángulos extremos. La siguiente fase sería integrar la abertura en la topología de la cabeza, asociar pesos o morph targets y sumar expresiones de ojos y cejas.

## Contrato de animación

Los tres sistemas consumen el mismo frame: `{time, open, wide, round, viseme}`. `open`, `wide` y `round` están entre 0 y 1. Los visemas son `rest`, `A`, `E`, `I`, `O`, `U`, `M` y `F`. El modo Intensidad aproxima abertura a partir del volumen; Gestos automáticos usa el reconocedor `phonetic` de Rhubarb para estimar formas labiales y tiempos. Ninguno transcribe la frase.

Las cues permiten dirigir las formas por separado:

```json
{
  "version": 1,
  "cues": [
    { "start": 0.2, "end": 0.6, "viseme": "A" },
    { "start": 0.9, "end": 1.3, "viseme": "O" },
    { "start": 1.5, "end": 1.7, "viseme": "M" }
  ]
}
```

Los huecos entre cues quedan en reposo. Rhubarb ya se conecta a este contrato sin sustituir los tres renderizadores. Su reconocimiento es aproximado; una alineación más precisa y la corrección de tiempos siguen siendo mejoras futuras.

Las funciones puras están en `speech/speech-core.js`. `createSpeechMouth()` en `speech/speech-mouths.js` devuelve `object`, `ready`, `update(frame)`, `createClip(track, name)` y `dispose()`. La boca mira hacia +Z y debe añadirse al anclaje de la cabeza. En Mario se usa `HEAD`, posición local `[0, 0.32, 0.55]`, inclinación X de 0.65 radianes, anchura `0.70`, altura `0.45` y profundidad `0.16`.

Las animaciones exportadas usan transformaciones estándar de nodos. La rotación de mandíbula se guarda como cuaterniones, no como Euler. No dependen de extensiones de animación de texturas. **GLB conserva el movimiento, no el audio**: los WAV y tiempos se entregan por separado. La importación GLB de Retrovisor conserva estos clips nativos.

## Verificación y reproducción

Se comprueban recetas, geometría finita, padres, orientación de los dos tirantes, conservación de Cloud, silencios, visemas explícitos y estado del micrófono. Las pruebas de navegador exportan y reimportan Mario y los tres sistemas, comprueban movimiento real, texturas y controles. Los informes JSON junto a los assets recogen el resultado.

Para regenerar assets:

```text
node scripts/render-mario-study.mjs
node scripts/capture-speech-lab.mjs
node scripts/record-speech-preview.mjs
node scripts/package-mario-study.mjs
```

Los scripts de captura usan Edge en Windows o `PLAYWRIGHT_EXECUTABLE_PATH`. Los WAV ya están guardados; para recrearlos en Windows se puede ejecutar `scripts/build-speech-demo.ps1` y después `node scripts/build-speech-demo.mjs`. La voz de muestra es Microsoft Helena Desktop; no intenta imitar al actor de ningún personaje.

La versión compilada se ha comprobado recorriendo laboratorio → editor → Mario → crear, mediante los controles reales y sin errores de página. La construcción pasa; Vite avisa del tamaño de un módulo compartido (aproximadamente 1,13 MB antes de compresión), que queda como trabajo de optimización.

## Segunda pasada visual (revisión anterior)

La gorra tiene una copa cerrada que deja visibles las cejas, una visera más corta y una insignia algo mayor. Los ojos tienen reflejos más pequeños; el bigote usa dos superficies con contorno festoneado en lugar de seis bolas. Las patillas se adaptan a la sien y el pelo cubre la nuca. Se conservan los anclajes, el cuerpo, los parámetros de receta y las tres bocas. Comparación de vistas: `artifacts/mario64-refinement/`.

Validación de esta revisión: 35 pruebas unitarias y las cuatro pruebas de navegador de Mario y el laboratorio. La copa de la gorra tiene 240 caras, sin degeneraciones ni orientación invertida; conserva su anclaje al escalar la cabeza.

La vista previa del creador dibuja solo al cambiar receta o cámara, con damping y un máximo de 30 FPS durante la interacción. La comprobación del editor compilado ha creado Mario sin errores; también se han comprobado Cloud, cuerpo sin cabeza, aplicación de cabeza y deshacer.

## Gorra abombada

La tercera pasada separa una copa de base estrecha y laterales abombados, una banda fina y una visera curva con grosor. La insignia y sus trazos se proyectan sobre los polígonos reales de la copa. Las superficies de copa, banda y visera están cerradas, sin caras degeneradas ni orientación invertida. Se conservan los anclajes HEAD y los parámetros de la receta. Comparación: `artifacts/mario64-cap-study/comparison.png`.

## Gestos automáticos locales

Rhubarb Lip Sync 1.14.0 analiza grabaciones con su reconocedor `phonetic`. La frase incluida genera 54 segmentos con ocho formas diferentes. `speech-phrase.webm` y `speech-phonetic.webm` muestran la misma voz con los dos métodos. Los archivos `mario-phonetic-*.glb` incluyen el movimiento automático como clip `speech`; `phonetic.track.json` conserva la pista editable. El sonido sigue entregándose por separado.

El motor está instalado bajo `tools/rhubarb-lip-sync/` y no se distribuye en el ZIP. En otro equipo se instala con `npm run rhubarb:install`. La frase ya analizada se puede reproducir sin instalarlo. El micrófono en directo sigue funcionando por intensidad. Detalles de instalación, uso, correspondencias y límites en `docs/local-lip-sync.md` (incluido como `LIP-SYNC.md` en el kit).

Verificación de esta entrega: 23 pruebas unitarias específicas y seis pruebas de navegador pasan. Incluyen audio propio analizado por el motor instalado, conservación de tiempo al alternar modos, importación de movimientos JSON, movimiento del GLB reimportado y rechazo de resultados tardíos al cancelar. La versión compilada abre el ejemplo automático y crea Mario desde los controles del editor sin errores de página.
