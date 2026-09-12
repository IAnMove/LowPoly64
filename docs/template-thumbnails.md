# Miniaturas del catálogo

Cada entrada de **Plantillas**, en **Escena 3D**, muestra una miniatura a la derecha. El nombre, la categoría y la acción de crear el modelo siguen siendo los mismos. También se puede elegir una fila con el teclado y pulsar Intro.

Las imágenes se obtienen de la geometría real del registro de plantillas, incluidos sus moldes generados. El navegador carga las que necesita al desplazarse por el catálogo. Son archivos estáticos: la aplicación no vuelve a renderizar cientos de modelos al abrirse.

## Actualizar las imágenes

Después de modificar o añadir plantillas:

```text
node scripts/build-template-thumbnails.mjs --format webp
```

En Windows se usa Edge; se puede indicar otro Chromium mediante `PLAYWRIGHT_EXECUTABLE_PATH`. El generador abre un servidor local temporal y lo cierra al terminar. Guarda imágenes de 144 × 112 en `public/template-thumbnails/` y un `manifest.json` con el resultado de cada captura. La propiedad `complete` solo es verdadera cuando cubre todo el registro sin fallos.

La interfaz utiliza `/template-thumbnails/<id>.webp`; conserva el formato WebP y el identificador de cada plantilla al actualizarla. Los recursos se incluyen en la compilación y funcionan también en una distribución estática.

Para comprobar imágenes, posición en las filas y creación de modelos:

```text
node scripts/run-playwright.mjs --project=smoke template-thumbnails.spec.js
```

La revisión de esta entrega cubre **305 de 305 modelos**, sin imágenes ausentes. La prueba de navegador comprueba cada archivo, su posición a la derecha y la creación con ratón y teclado. También se revisaron los encuadres de personajes, objetos planos y efectos pequeños.

Para regenerar la lámina de contacto con todas las categorías:

```text
node scripts/build-template-contact-sheet.mjs
```

El resultado se guarda en `artifacts/template-thumbnails/contact-sheet.html`. Se puede abrir localmente y filtrar por nombre, identificador o categoría.
