# Spec: config-system

## Overview
Modal de configuración accesible desde el botón CONFIG en la top bar. Gestiona toda la configuración de generación AI, persistida exclusivamente en `localStorage` del navegador.

## Acceso
- Botón CONFIG (borde morado `#aa00ff`) en la top bar, junto a HELP y el toggle de idioma
- `openConfigModal()` / `closeConfigModal()` expuestas en `window`

## Secciones

### IMAGE GENERATION METHOD
- Toggle visual: botones [OPENAI] [LOCAL SD]
- `<input type="hidden" id="cfg-method-select">` guarda el valor seleccionado
- Al cambiar método: resalta el botón activo en amarillo, muestra/oculta las secciones correspondientes

### OPENAI
Visible cuando `method === 'openai'`:
- **API Key**: `<input type="password">` — nunca se pre-rellena; si hay key guardada el placeholder muestra `••••••••••••••••••••`; el valor del campo solo se guarda si es no vacío
- **Model**: text input (default `gpt-image-1`)
- **Size**: select (1024×1024, 512×512, 256×256)
- **Quality**: select (low, medium, high)

### LOCAL SD
Visible cuando `method === 'stable-diffusion'`:
- **Server URL**: text input (default `http://127.0.0.1:7860`)
- **Width / Height / Steps**: number inputs

### LOCAL LLM — OLLAMA
Siempre visible (sección separada para prompt enhancement):
- **Ollama Endpoint**: text input (default `http://127.0.0.1:11434`)
- **Load Models btn**: llama a `fetchOllamaModels()`, popula el select
- **Model select**: `<select id="cfg-ollama-model-select">`

## Guardar
- Botón SAVE: llama a `saveTexGenConfig(cfg)` con todos los valores del formulario
- Muestra toast "Config saved"
- Cierra el modal

## Seguridad
- La API key de OpenAI se envía directamente desde el browser a `api.openai.com` — nunca pasa por ningún servidor propio
- No se muestra en el DOM más allá de un campo password vacío
- `localStorage` es accesible para extensiones de navegador con permisos de página; el usuario debe ser consciente de esto
