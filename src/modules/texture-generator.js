// ── Texture Generator ─────────────────────────────────────────────
// Supports OpenAI (gpt-image-1) and local Stable Diffusion (Forge/AUTOMATIC1111)
// Config is stored exclusively in localStorage — no server involved.

const KEY_METHOD      = 'lp64_texgen_method';   // 'openai' | 'stable-diffusion'
const KEY_API_KEY     = 'lp64_openai_key';
const KEY_MODEL       = 'lp64_openai_model';
const KEY_SIZE        = 'lp64_openai_size';
const KEY_QUALITY     = 'lp64_openai_quality';
const KEY_SD_URL      = 'lp64_sd_url';
const KEY_SD_W        = 'lp64_sd_width';
const KEY_SD_H        = 'lp64_sd_height';
const KEY_SD_STEPS    = 'lp64_sd_steps';
const KEY_OLLAMA_URL  = 'lp64_ollama_url';
const KEY_OLLAMA_MODEL= 'lp64_ollama_model';

export function getTexGenConfig() {
  return {
    method:       localStorage.getItem(KEY_METHOD)        || 'openai',
    openaiKey:    localStorage.getItem(KEY_API_KEY)       || '',
    model:        localStorage.getItem(KEY_MODEL)         || 'gpt-image-1',
    size:         localStorage.getItem(KEY_SIZE)          || '1024x1024',
    quality:      localStorage.getItem(KEY_QUALITY)       || 'low',
    sdUrl:        localStorage.getItem(KEY_SD_URL)        || 'http://127.0.0.1:7860',
    sdWidth:      parseInt(localStorage.getItem(KEY_SD_W)     || '512'),
    sdHeight:     parseInt(localStorage.getItem(KEY_SD_H)     || '512'),
    sdSteps:      parseInt(localStorage.getItem(KEY_SD_STEPS) || '20'),
    ollamaUrl:    localStorage.getItem(KEY_OLLAMA_URL)    || 'http://127.0.0.1:11434',
    ollamaModel:  localStorage.getItem(KEY_OLLAMA_MODEL)  || '',
  };
}

export function saveTexGenConfig(cfg) {
  localStorage.setItem(KEY_METHOD,       cfg.method      || 'openai');
  localStorage.setItem(KEY_MODEL,        cfg.model       || 'gpt-image-1');
  localStorage.setItem(KEY_SIZE,         cfg.size        || '1024x1024');
  localStorage.setItem(KEY_QUALITY,      cfg.quality     || 'low');
  localStorage.setItem(KEY_SD_URL,       cfg.sdUrl       || 'http://127.0.0.1:7860');
  localStorage.setItem(KEY_SD_W,         cfg.sdWidth     || '512');
  localStorage.setItem(KEY_SD_H,         cfg.sdHeight    || '512');
  localStorage.setItem(KEY_SD_STEPS,     cfg.sdSteps     || '20');
  localStorage.setItem(KEY_OLLAMA_URL,   cfg.ollamaUrl   || 'http://127.0.0.1:11434');
  if (cfg.ollamaModel) localStorage.setItem(KEY_OLLAMA_MODEL, cfg.ollamaModel);
  // Only overwrite the OpenAI key if the user actually typed something new
  if (cfg.openaiKey) localStorage.setItem(KEY_API_KEY, cfg.openaiKey);
}

// Fetch available models from an Ollama endpoint
export async function fetchOllamaModels(endpoint) {
  const base = (endpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const res = await fetch(`${base}/api/tags`);
  if (!res.ok) throw new Error(`Ollama error ${res.status}. Is the server running at ${base}?`);
  const data = await res.json();
  return (data.models || []).map((m) => m.name);
}

// Use Ollama to enhance a prompt for texture/image generation
export async function enhancePromptWithOllama(prompt) {
  const cfg = getTexGenConfig();
  if (!cfg.ollamaUrl) throw new Error('Ollama URL not configured. Open CONFIG.');
  if (!cfg.ollamaModel) throw new Error('No Ollama model selected. Open CONFIG to pick one.');

  const base = cfg.ollamaUrl.replace(/\/$/, '');
  const system = `You are an expert at writing prompts for AI image generation, specialized in retro PS1/N64-style game textures. Improve the given prompt to produce better results. Be specific about style (PS1, pixel art, dithering, limited palette), viewing angle, and seamlessness. Return ONLY the improved prompt text, no explanation, no quotes, no preamble.`;

  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.ollamaModel, prompt, system, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama generate error ${res.status}`);
  const data = await res.json();
  return (data.response || '').trim();
}

// Returns a base64-encoded PNG string (no data-URL prefix)
export async function generateTexture(prompt) {
  const cfg = getTexGenConfig();
  if (cfg.method === 'openai') {
    return _generateOpenAI(prompt, cfg);
  }
  return _generateSD(prompt, cfg);
}

async function _generateOpenAI(prompt, cfg) {
  if (!cfg.openaiKey) throw new Error('OpenAI API key not set. Open CONFIG to add it.');

  const body = {
    model: cfg.model,
    prompt,
    size: cfg.size,
    quality: cfg.quality,
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.openaiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `OpenAI error ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json();
  return data.data[0].b64_json;
}

async function _generateSD(prompt, cfg) {
  const base = (cfg.sdUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');

  const res = await fetch(`${base}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      steps:  cfg.sdSteps,
      width:  cfg.sdWidth,
      height: cfg.sdHeight,
    }),
  });

  if (!res.ok) throw new Error(`Stable Diffusion error ${res.status}. Is the server running at ${base}?`);

  const data = await res.json();
  if (!data.images || !data.images[0]) throw new Error('SD returned no images.');
  return data.images[0];
}
