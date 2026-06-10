# Spec: ollama-integration

## Overview
Integración opcional con un servidor local Ollama para mejorar automáticamente los prompts de generación de texturas usando un LLM.

## Configuración
- **Endpoint**: URL del servidor Ollama (default: `http://127.0.0.1:11434`)
- **Model**: modelo seleccionado de los disponibles en el servidor
- Ambos campos se persisten en `localStorage` (`lp64_ollama_url`, `lp64_ollama_model`)

## Descubrimiento de modelos
- Botón "LOAD MODELS" en la sección Ollama del CONFIG modal
- GET `{endpoint}/api/tags` → `{ models: [{ name, ... }] }`
- Popula el `<select>` con los nombres de los modelos instalados
- Si hay un modelo guardado en config y no está en la lista, se añade como opción con sufijo "(saved)"

## Mejora de prompts
- Función `enhancePromptWithOllama(prompt)` en `texture-generator.js`
- POST `{ollamaUrl}/api/generate` con `stream: false`
- System prompt especializado:
  > "You are an expert at writing prompts for AI image generation, specialized in retro PS1/N64-style game textures. Improve the given prompt to produce better results. Be specific about style (PS1, pixel art, dithering, limited palette), viewing angle, and seamlessness. Return ONLY the improved prompt text, no explanation, no quotes, no preamble."
- El resultado reemplaza el contenido del textarea en el modal expandido

## UI
- El botón ENHANCE en el prompt expand modal solo se muestra (`classList.remove('hidden')`) si `cfg.ollamaModel` está configurado
- Se comprueba en `openPromptExpandModal()` cada vez que se abre el modal
- El botón se deshabilita durante la llamada y muestra "ENHANCING..."

## Uso futuro
Esta integración está diseñada para ser extensible. En el futuro se podrá usar el mismo LLM local para:
- Generar prompts de personaje completo a partir de una descripción
- Sugerir paletas de colores
- Describir una textura existente para editarla con instrucciones en lenguaje natural
