# Design — AI Texture Generation

## Architecture

```
index.html
  ├── TOP BAR: botón CONFIG (morado)
  ├── TEXTURE EDITOR MODAL (left panel)
  │   ├── <select> template suggestor → applyPromptTemplate()
  │   ├── <textarea readonly> tex-gen-prompt → onclick: openPromptExpandModal()
  │   └── GENERATE btn → texGenerate() (usa tex-gen-prompt)
  ├── PROMPT EXPAND MODAL (z-60)
  │   ├── <select> template suggestor (mismo set)
  │   ├── <textarea> tex-gen-prompt-full
  │   ├── ENHANCE btn (oculto si no hay Ollama model) → enhancePrompt()
  │   └── GENERATE btn → texGenerateFromModal() → closePromptExpandModal()
  └── CONFIG MODAL (z-50)
      ├── METHOD: [OPENAI] [LOCAL SD]
      ├── OPENAI section: API key (password), model, size, quality
      ├── LOCAL SD section: URL, width, height, steps
      └── OLLAMA section: endpoint, Load Models btn, model select

src/modules/texture-generator.js
  ├── getTexGenConfig() / saveTexGenConfig()   — localStorage R/W
  ├── generateTexture(prompt)                  — dispatcher
  ├── _generateOpenAI(prompt, cfg)             — fetch api.openai.com
  ├── _generateSD(prompt, cfg)                 — fetch localhost:7860
  ├── fetchOllamaModels(endpoint)              — GET /api/tags
  └── enhancePromptWithOllama(prompt)          — POST /api/generate

src/modules/texture-editor.js
  └── applyBase64ToCanvas(b64)                 — new export

src/main.js  (window functions)
  ├── openConfigModal / closeConfigModal / saveConfigModal
  ├── onConfigMethodChange
  ├── loadOllamaModels / _refreshOllamaModelSelect
  ├── openPromptExpandModal / closePromptExpandModal / applyPromptTemplate
  ├── texGenerate (small panel)
  ├── texGenerateFromModal (expand modal)
  ├── _runGenerate (shared async core)
  └── enhancePrompt
```

## Data Flow — Image Generation

```
User types prompt (or selects template)
  → texGenerate() / texGenerateFromModal()
    → _runGenerate(prompt, btn)
      → generateTexture(prompt)  [texture-generator.js]
        → fetch OpenAI / fetch SD
          → base64 PNG
      → applyBase64ToCanvas(b64) [texture-editor.js]
        → draws to paintCanvas (256×256)
        → applyCanvasToMesh()
        → applyCanvasToPreview()
```

## Data Flow — Prompt Enhancement

```
User types prompt in expand modal
  → enhancePrompt()
    → enhancePromptWithOllama(prompt)  [texture-generator.js]
      → POST {ollamaUrl}/api/generate
        → { response: "improved prompt..." }
    → tex-gen-prompt-full.value = improved prompt
```

## localStorage Keys

| Key | Default | Description |
|-----|---------|-------------|
| `lp64_texgen_method` | `openai` | Active generation method |
| `lp64_openai_key` | `""` | OpenAI API key (never displayed) |
| `lp64_openai_model` | `gpt-image-1` | OpenAI image model |
| `lp64_openai_size` | `1024x1024` | Output size |
| `lp64_openai_quality` | `low` | Generation quality |
| `lp64_sd_url` | `http://127.0.0.1:7860` | SD server URL |
| `lp64_sd_width` | `512` | SD output width |
| `lp64_sd_height` | `512` | SD output height |
| `lp64_sd_steps` | `20` | SD inference steps |
| `lp64_ollama_url` | `http://127.0.0.1:11434` | Ollama endpoint |
| `lp64_ollama_model` | `""` | Selected Ollama model |

## Security Considerations

- La API key de OpenAI se almacena en `localStorage` del navegador. Es el mismo nivel de seguridad que cualquier extensión de navegador con acceso a localStorage. Para un editor local/personal es aceptable.
- La key nunca aparece en el DOM (campo `type="password"`, placeholder enmascarado, nunca se pre-rellena).
- Todas las llamadas a APIs externas salen directamente del browser del usuario, no pasan por ningún servidor propio.
- Ollama y SD son servicios locales; sus llamadas no salen de la red del usuario.
