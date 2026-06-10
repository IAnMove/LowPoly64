# Spec: texture-generation

## Overview
Módulo `src/modules/texture-generator.js` que genera texturas PNG via OpenAI Images API o Stable Diffusion local, y las aplica al canvas de pintura del editor de texturas.

## API

### `getTexGenConfig(): TexGenConfig`
Lee toda la configuración desde `localStorage`. Retorna objeto con:
- `method`: `'openai' | 'stable-diffusion'`
- `openaiKey`, `model`, `size`, `quality`
- `sdUrl`, `sdWidth`, `sdHeight`, `sdSteps`
- `ollamaUrl`, `ollamaModel`

### `saveTexGenConfig(cfg: Partial<TexGenConfig>): void`
Persiste la config en `localStorage`. La `openaiKey` solo se sobreescribe si `cfg.openaiKey` es un string no vacío.

### `generateTexture(prompt: string): Promise<string>`
Dispatcher principal. Retorna base64 PNG (sin prefijo `data:image/png;base64,`).
- Si `method === 'openai'`: llama a `_generateOpenAI`
- Si `method === 'stable-diffusion'`: llama a `_generateSD`

### `fetchOllamaModels(endpoint: string): Promise<string[]>`
GET `{endpoint}/api/tags`. Retorna array de nombres de modelos instalados.

### `enhancePromptWithOllama(prompt: string): Promise<string>`
POST `{ollamaUrl}/api/generate` con `stream: false`. Usa system prompt especializado en texturas PS1. Retorna el prompt mejorado como string limpio.

## OpenAI Integration
- Endpoint: `https://api.openai.com/v1/images/generations`
- Headers: `Authorization: Bearer {apiKey}`
- Body: `{ model, prompt, size, quality }`
- Response: `data[0].b64_json`

## Stable Diffusion Integration  
- Endpoint: `{sdUrl}/sdapi/v1/txt2img`
- Body: `{ prompt, steps, width, height }`
- Response: `images[0]` (base64)
- Compatible con Forge y AUTOMATIC1111

## Error Handling
- OpenAI: parsea `error.message` de la respuesta JSON, incluye el status HTTP.
- SD: incluye la URL en el mensaje de error para facilitar debugging.
- Ollama: mensajes descriptivos si el servidor no está disponible o el modelo no está configurado.
