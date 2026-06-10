## Why

Crear texturas manualmente píxel a píxel es lento. Los modelos de generación de imágenes (OpenAI, Stable Diffusion) pueden generar texturas retro con estilo PS1/N64 a partir de un prompt de texto. Integrar esta capacidad directamente en el editor acelera el flujo de trabajo y abre la posibilidad de texturizar personajes y entornos con un solo clic. Adicionalmente, un LLM local (Ollama) puede mejorar automáticamente los prompts, haciendo que usuarios menos expertos obtengan resultados de calidad.

## What Changes

- **Sistema de generación de texturas** (`texture-generation`): módulo `texture-generator.js` que conecta con OpenAI Images API o un servidor local de Stable Diffusion (Forge/AUTOMATIC1111). La imagen generada se aplica directamente al canvas del editor de texturas y al mesh seleccionado.
- **Sistema de configuración** (`config-system`): modal CONFIG con selector de método (OpenAI / Local SD), campo de API key guardada solo en `localStorage` del navegador (nunca en servidor), y configuración de parámetros de cada backend.
- **Templates de prompt** (`prompt-templates`): librería de prompts predefinidos agrupados por categoría (caras de personajes, torsos, suelos, paredes, props) con estilo PS1/retro incorporado. Selector tipo `<select>` con `<optgroup>` para carga instantánea.
- **Editor de prompt expandido** (`prompt-expand-modal`): modal full-size con textarea grande, selector de templates, botón ENHANCE y botón GENERATE. La textarea pequeña del panel lateral es de solo lectura y abre el modal al hacer clic.
- **Integración con Ollama** (`ollama-integration`): sección en CONFIG para configurar un endpoint Ollama local. Botón "Load Models" descubre los modelos instalados vía `/api/tags`. El botón ENHANCE en el modal de prompt llama a `/api/generate` con un system prompt especializado en texturas PS1 y reemplaza el prompt con la versión mejorada.

## Capabilities

### New Capabilities
- `texture-generation`: Genera texturas PNG via OpenAI (`gpt-image-1`, configurable) o Stable Diffusion local (`/sdapi/v1/txt2img`). Resultado en base64 aplicado al canvas de pintura.
- `config-system`: Modal de configuración persistente en `localStorage`. API key OpenAI almacenada solo en el browser, mostrada enmascarada con `type="password"`. Configuración de SD: URL, width, height, steps.
- `prompt-templates`: 20+ templates predefinidos en 5 categorías: CHARACTER FACE, CHARACTER BODY, ENVIRONMENT GROUND, ENVIRONMENT WALLS, PROPS. Todos con estilo PS1 incorporado (limited palette, dithering, pixel shadows).
- `prompt-expand-modal`: Editor de prompt full-size. Sincroniza texto con la textarea compacta del panel lateral.
- `ollama-integration`: Descubrimiento de modelos instalados en Ollama. Mejora de prompts via `/api/generate` con system prompt especializado en texturas retro.

### Modified Capabilities
- `texture-editor`: Se añade sección "AI GENERATE" al panel izquierdo con selector de templates, textarea compacta (abre modal) y botón GENERATE directo.

## Impact

- **Archivos principales afectados**: `src/modules/texture-generator.js` (nuevo), `src/modules/texture-editor.js` (nueva export), `src/main.js` (nuevas window functions), `index.html` (modal CONFIG, modal prompt editor, sección AI en texture editor).
- **Sin dependencias externas nuevas**: Solo `fetch` nativo del browser.
- **Seguridad**: La API key de OpenAI nunca sale del browser (va directamente a `api.openai.com` en el cliente). No hay proxy de servidor.
- **Ollama es opcional**: Si no está configurado, el botón ENHANCE no aparece.

## Non-goals

- No se implementa generación de texturas inpainting ni img2img en esta versión.
- No se cachean las imágenes generadas (se aplican directamente al canvas y pueden descargarse o guardarse con el escenario).
- No hay historial de generaciones.
