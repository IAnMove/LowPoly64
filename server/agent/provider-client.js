import { PROVIDER_TOOLS } from '../../src/modules/agent/tool-catalog.js';

const PROVIDERS = Object.freeze({
  openai: {
    keyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.6-terra',
  },
  xai: {
    keyEnv: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4.5',
  },
});

export function getProviderStatus() {
  return Object.fromEntries(Object.entries(PROVIDERS).map(([id, config]) => [id, {
    configured: Boolean(process.env[config.keyEnv]),
    defaultModel: process.env[`RETROVISOR_${id.toUpperCase()}_MODEL`] || config.defaultModel,
  }]));
}

export function getProviderConfig(provider, model) {
  const config = PROVIDERS[provider];
  if (!config) {
    const error = new Error(`Unsupported provider: ${provider}`);
    error.code = 'PROVIDER_NOT_SUPPORTED';
    throw error;
  }
  const apiKey = process.env[config.keyEnv];
  if (!apiKey) {
    const error = new Error(
      `${config.keyEnv} is not configured. Set it in the companion process environment and restart the service.`,
    );
    error.code = 'PROVIDER_NOT_CONFIGURED';
    throw error;
  }
  return {
    ...config,
    apiKey,
    model: model || process.env[`RETROVISOR_${provider.toUpperCase()}_MODEL`] || config.defaultModel,
  };
}

export async function* streamProviderResponse(provider, model, input, signal) {
  const config = getProviderConfig(provider, model);
  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input,
      tools: PROVIDER_TOOLS,
      tool_choice: 'auto',
      parallel_tool_calls: false,
      store: false,
      stream: true,
    }),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      String(body?.error?.message || `${provider} returned HTTP ${response.status}.`).slice(0, 500),
    );
    error.code = 'PROVIDER_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    const body = await response.json();
    yield { type: 'response.completed', response: body };
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  while (true) {
    const { value, done } = await reader.read();
    buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffered.split(/\r?\n\r?\n/);
    buffered = done ? '' : blocks.pop();
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data || data === '[DONE]') continue;
      yield JSON.parse(data);
    }
    if (done) break;
  }
}

export function extractFunctionCalls(response) {
  return (response?.output || [])
    .filter((item) => item.type === 'function_call')
    .map((item) => ({
      callId: item.call_id,
      name: item.name,
      arguments: item.arguments || '{}',
      raw: item,
    }));
}

export function extractOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text) return response.output_text;
  return (response?.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text')
    .map((content) => content.text || '')
    .join('');
}
