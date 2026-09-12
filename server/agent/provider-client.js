import { LOCAL_CHAT_TOOLS } from './local-tool-schema.js';

import { PROVIDER_TOOLS } from '../../src/modules/agent/tool-catalog.js';

const DEFAULT_TIMEOUT_MS = 120_000;
const PROBE_TIMEOUT_MS = 20_000;
const PROBE_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGP4z8AAR0jM/wxDSwIA6TA/wRjsoYgAAAAASUVORK5CYII=';
const PROBE_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    value: { type: 'string' },
  },
  required: ['ok', 'value'],
  additionalProperties: false,
});
const PROBE_TOOL = Object.freeze({
  type: 'function',
  function: {
    name: 'retrovisor_probe_echo',
    description: 'Return the supplied probe value without changing any scene or file.',
    parameters: {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      additionalProperties: false,
    },
  },
});

const PROVIDERS = Object.freeze({
  openai: {
    kind: 'api',
    keyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    baseUrlEnv: 'RETROVISOR_OPENAI_URL',
    defaultModel: 'gpt-5.6-terra',
    protocol: 'responses',
    modelsPath: '/models',
  },
  xai: {
    kind: 'api',
    keyEnv: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    baseUrlEnv: 'RETROVISOR_XAI_URL',
    defaultModel: 'grok-4.5',
    protocol: 'responses',
    modelsPath: '/models',
  },
  ollama: {
    kind: 'local',
    baseUrl: 'http://127.0.0.1:11434',
    baseUrlEnv: 'RETROVISOR_OLLAMA_URL',
    defaultModel: '',
    protocol: 'ollama-chat',
    modelsPath: '/api/tags',
  },
  lmstudio: {
    kind: 'local',
    baseUrl: 'http://127.0.0.1:1234/v1',
    baseUrlEnv: 'RETROVISOR_LMSTUDIO_URL',
    defaultModel: '',
    protocol: 'chat-completions',
    modelsPath: '/models',
  },
});



function getOllamaContext() {
  const value = Number(process.env.RETROVISOR_OLLAMA_CONTEXT || 16_384);
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 8_192), 65_536) : 16_384;
}

const capabilityCache = new Map();
const latestCapabilityCache = new Map();

function makeError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  if (status !== undefined) error.status = status;
  return error;
}

function publicUrl(value) {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').replace(/[?#].*$/, '').replace(/\/$/, '');
  }
}

function normalizeBaseUrl(provider, value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  if (provider === 'lmstudio') {
    try {
      const url = new URL(trimmed);
      if (!url.pathname || url.pathname === '/') url.pathname = '/v1';
      return url.toString().replace(/\/+$/, '');
    } catch {
      return trimmed.endsWith('/v1') ? trimmed : trimmed + '/v1';
    }
  }
  return trimmed;
}

function providerEnvName(provider, suffix) {
  return 'RETROVISOR_' + provider.toUpperCase() + '_' + suffix;
}

function capabilityKey(provider, model) {
  return provider + ':' + (model || '');
}

function unknownCapabilities() {
  return {
    tools: null,
    vision: null,
    structuredJson: null,
    checkedAt: null,
  };
}

function cloneCapabilities(capabilities) {
  return { ...unknownCapabilities(), ...(capabilities || {}) };
}

function getCachedCapabilities(provider, model, allowLatest = true) {
  return cloneCapabilities(
    capabilityCache.get(capabilityKey(provider, model))
      || (allowLatest ? latestCapabilityCache.get(provider) : null)
      || null,
  );
}

function rememberCapabilities(provider, model, capabilities) {
  const value = cloneCapabilities({ ...capabilities, checkedAt: new Date().toISOString() });
  capabilityCache.set(capabilityKey(provider, model), value);
  latestCapabilityCache.set(provider, value);
  return value;
}

function configuredModel(provider, definition) {
  return process.env[providerEnvName(provider, 'MODEL')] || definition.defaultModel || '';
}

function configuredBaseUrl(provider, definition) {
  return normalizeBaseUrl(
    provider,
    process.env[definition.baseUrlEnv] || definition.baseUrl,
  );
}

export function getProviderStatus() {
  return Object.fromEntries(Object.entries(PROVIDERS).map(([id, definition]) => {
    const model = configuredModel(id, definition);
    return [id, {
      kind: definition.kind,
      local: definition.kind === 'local',
      configured: definition.kind === 'local' || Boolean(process.env[definition.keyEnv]),
      defaultModel: model || null,
      baseUrl: publicUrl(configuredBaseUrl(id, definition)),
      capabilities: model ? getCachedCapabilities(id, model, false) : unknownCapabilities(),
    }];
  }));
}

export function getProviderCapabilities(provider, model = null) {
  if (!PROVIDERS[provider]) return null;
  return model ? getCachedCapabilities(provider, model, false) : getCachedCapabilities(provider, configuredModel(provider, PROVIDERS[provider]), false);
}

export function getProviderConfig(provider, model) {
  const definition = PROVIDERS[provider];
  if (!definition) throw makeError('PROVIDER_NOT_SUPPORTED', 'Unsupported provider: ' + provider);

  const apiKey = definition.keyEnv ? process.env[definition.keyEnv] : null;
  if (definition.kind === 'api' && !apiKey) {
    throw makeError(
      'PROVIDER_NOT_CONFIGURED',
      definition.keyEnv + ' is not configured. Set it in the companion process environment and restart the service.',
    );
  }

  return {
    ...definition,
    provider,
    apiKey,
    baseUrl: configuredBaseUrl(provider, definition),
    model: model || configuredModel(provider, definition) || null,
  };
}

function timeoutMsFromEnv(fallback = DEFAULT_TIMEOUT_MS) {
  const value = Number(process.env.RETROVISOR_PROVIDER_TIMEOUT_MS || fallback);
  return Number.isFinite(value) ? Math.min(Math.max(value, 250), 300_000) : fallback;
}

function signalWithTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

async function fetchWithDeadline(url, options, signal, timeoutMs) {
  const deadline = signalWithTimeout(signal, timeoutMs);
  try {
    return await fetch(url, { ...options, signal: deadline.signal });
  } catch (error) {
    if (signal?.aborted) throw makeError('ASSISTANT_CANCELLED', 'Provider request was cancelled.');
    if (deadline.timedOut()) throw makeError('PROVIDER_TIMEOUT', 'Provider request timed out.');
    throw error;
  } finally {
    deadline.dispose();
  }
}

async function readResponseBody(response) {
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) return response.json().catch(() => ({}));
  const text = await response.text().catch(() => '');
  try { return JSON.parse(text); } catch { return { message: text.slice(0, 500) }; }
}

function providerErrorMessage(body) {
  const candidate = body?.error ?? body?.message;
  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      return String(parsed?.error?.message || parsed?.message || candidate);
    } catch {
      return candidate;
    }
  }
  return String(candidate || '');
}

async function ensureResponseOk(response, provider) {
  if (response.ok) return response;
  const body = await readResponseBody(response);
  throw makeError(
    'PROVIDER_REQUEST_FAILED',
    (providerErrorMessage(body) || (provider + ' returned HTTP ' + response.status + '.')).slice(0, 500),
    response.status,
  );
}

function authorizationHeaders(config) {
  return config.apiKey ? { authorization: 'Bearer ' + config.apiKey } : {};
}

function normalizeToolArguments(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeChatResponse(body, idPrefix = 'local') {
  const message = body?.choices?.[0]?.message || body?.message || {};
  const output = [];
  const text = typeof message.content === 'string' ? message.content : '';
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  toolCalls.forEach((toolCall, index) => {
    const fn = toolCall?.function || toolCall;
    const name = fn?.name;
    if (!name) return;
    output.push({
      type: 'function_call',
      call_id: toolCall.id || idPrefix + '-call-' + index,
      name,
      arguments: typeof fn.arguments === 'string'
        ? fn.arguments
        : JSON.stringify(normalizeToolArguments(fn.arguments)),
    });
  });
  if (text) {
    output.push({
      type: 'message',
      content: [{ type: 'output_text', text }],
    });
  }
  return {
    id: body?.id || idPrefix + '-response',
    output,
    output_text: text,
    usage: body?.usage,
    raw: body,
  };
}

function mergeToolCall(target, index, call, idPrefix) {
  const key = String(index ?? target.length);
  let entry = target.find((candidate) => candidate.index === key);
  const fn = call?.function || call || {};
  if (!entry) {
    entry = {
      index: key,
      id: call?.id || idPrefix + '-call-' + key,
      name: fn.name || '',
      arguments: '',
    };
    target.push(entry);
  }
  if (call?.id) entry.id = call.id;
  if (fn.name) entry.name = fn.name;
  if (fn.arguments !== undefined) {
    entry.arguments += typeof fn.arguments === 'string'
      ? fn.arguments
      : JSON.stringify(normalizeToolArguments(fn.arguments));
  }
}

function normalizedResponseFromToolParts(text, toolParts, idPrefix) {
  return normalizeChatResponse({
    id: idPrefix + '-response',
    choices: [{
      message: {
        content: text,
        tool_calls: toolParts.map((part) => ({
          id: part.id,
          type: 'function',
          function: { name: part.name, arguments: part.arguments || '{}' },
        })),
      },
    }],
  }, idPrefix);
}

async function* readSseJson(response) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffered = '';
  while (true) {
    const { value, done } = await reader.read();
    buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffered.split(/\r?\n\r?\n/);
    buffered = done ? '' : blocks.pop() || '';
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data || data === '[DONE]') continue;
      try { yield JSON.parse(data); } catch { /* Ignore comments/keep-alives. */ }
    }
    if (done) {
      const data = buffered
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (data && data !== '[DONE]') {
        try { yield JSON.parse(data); } catch { /* Ignore incomplete keep-alives. */ }
      }
      break;
    }
  }
}

async function* readNdjson(response) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffered = '';
  while (true) {
    const { value, done } = await reader.read();
    buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffered.split(/\r?\n/);
    buffered = done ? '' : lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try { yield JSON.parse(line); } catch { /* Ignore malformed keep-alive lines. */ }
    }
    if (done) {
      if (buffered.trim()) {
        try { yield JSON.parse(buffered); } catch { /* Ignore incomplete lines. */ }
      }
      break;
    }
  }
}

function imageDataValue(imageUrl) {
  if (typeof imageUrl !== 'string') return null;
  const match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : imageUrl;
}

function convertContent(content, protocol) {
  if (!Array.isArray(content)) return { text: typeof content === 'string' ? content : '' };
  const textParts = [];
  const imageParts = [];
  const openAiParts = [];
  for (const part of content) {
    if (part?.type === 'input_text') {
      textParts.push(String(part.text || ''));
      openAiParts.push({ type: 'text', text: String(part.text || '') });
    } else if (part?.type === 'input_image' && part.image_url) {
      const url = typeof part.image_url === 'string' ? part.image_url : part.image_url.url;
      if (!url) continue;
      imageParts.push(imageDataValue(url));
      openAiParts.push({ type: 'image_url', image_url: { url } });
    } else if (part?.type === 'text' || part?.type === 'output_text') {
      textParts.push(String(part.text || ''));
      openAiParts.push({ type: 'text', text: String(part.text || '') });
    } else if (part?.type === 'image_url') {
      const url = typeof part.image_url === 'string' ? part.image_url : part.image_url?.url;
      if (!url) continue;
      imageParts.push(imageDataValue(url));
      openAiParts.push({ type: 'image_url', image_url: { url } });
    }
  }
  if (protocol === 'ollama-chat') {
    return { text: textParts.join(''), images: imageParts.filter(Boolean) };
  }
  return { content: openAiParts, text: textParts.join('') };
}

function inputToChatMessages(input, protocol) {
  const messages = [];
  const callNames = new Map();
  let pendingAssistantCalls = null;
  let pendingAssistantText = null;
  let pendingAssistantImages = null;
  const flushAssistantTurn = () => {
    if (!pendingAssistantCalls?.length && pendingAssistantText === null && !pendingAssistantImages?.length) return;
    const message = { role: 'assistant' };
    if (pendingAssistantText !== null) message.content = pendingAssistantText;
    if (pendingAssistantImages?.length && protocol === 'ollama-chat') message.images = pendingAssistantImages;
    if (pendingAssistantCalls?.length) message.tool_calls = pendingAssistantCalls;
    messages.push(message);
    pendingAssistantCalls = null;
    pendingAssistantText = null;
    pendingAssistantImages = null;
  };
  const appendAssistantMessage = (content) => {
    const text = String(content?.text || '');
    if (text) pendingAssistantText = (pendingAssistantText || '') + text;
    if (content?.images?.length) {
      pendingAssistantImages = [...(pendingAssistantImages || []), ...content.images];
    }
  };

  for (const item of Array.isArray(input) ? input : []) {
    if (item?.type === 'function_call') {
      const args = normalizeToolArguments(item.arguments);
      const call = {
        id: item.call_id || protocol + '-call-' + callNames.size,
        type: 'function',
        function: {
          name: item.name,
          arguments: protocol === 'ollama-chat' ? args : JSON.stringify(args),
        },
      };
      callNames.set(call.id, item.name);
      pendingAssistantCalls ||= [];
      pendingAssistantCalls.push(call);
      continue;
    }
    if (item?.type === 'message') {
      // Responses emits assistant text as a separate message item. Keep it
      // in the same chat turn as adjacent function calls before their outputs.
      appendAssistantMessage(convertContent(item.content, protocol));
      continue;
    }
    flushAssistantTurn();
    if (item?.type === 'function_call_output') {
      const callId = item.call_id || '';
      const output = typeof item.output === 'string' ? item.output : JSON.stringify(item.output ?? '');
      if (protocol === 'ollama-chat') {
        messages.push({ role: 'tool', tool_name: callNames.get(callId) || callId, content: output });
      } else {
        messages.push({ role: 'tool', tool_call_id: callId, content: output });
      }
      continue;
    }
    if (item?.role) {
      if (item.role === 'assistant' && item.tool_calls) {
        for (const call of item.tool_calls) {
          const callId = call?.id;
          const name = call?.function?.name;
          if (callId && name) callNames.set(callId, name);
        }
        messages.push(item);
        continue;
      }
      const converted = convertContent(item.content, protocol);
      if (protocol === 'ollama-chat') {
        const message = { role: item.role, content: converted.text || '' };
        if (converted.images?.length) message.images = converted.images;
        messages.push(message);
      } else {
        messages.push({ role: item.role, content: converted.content ?? converted.text ?? '' });
      }
    }
  }
  flushAssistantTurn();
  return messages;
}
async function resolveLocalModel(config, signal) {
  if (config.model) return config.model;
  const response = await fetchWithDeadline(
    config.baseUrl + config.modelsPath,
    { headers: { ...authorizationHeaders(config) } },
    signal,
    timeoutMsFromEnv(),
  );
  await ensureResponseOk(response, config.provider);
  const body = await readResponseBody(response);
  const models = config.protocol === 'ollama-chat' ? body?.models : body?.data;
  const first = Array.isArray(models) ? models.find((entry) => entry?.name || entry?.id) : null;
  const model = first?.name || first?.id || null;
  if (!model) throw makeError('PROVIDER_MODEL_REQUIRED', config.provider + ' has no loaded model. Select or load a model first.');
  return model;
}

async function requestOllama(config, model, messages, options, signal) {
  const response = await fetch(config.baseUrl + '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, ...options }),
    signal,
  });
  return ensureResponseOk(response, config.provider);
}

async function requestChatCompletions(config, model, messages, options, signal) {
  const response = await fetch(config.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: { ...authorizationHeaders(config), 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, ...options }),
    signal,
  });
  return ensureResponseOk(response, config.provider);
}

function responseTextFromChat(body) {
  return typeof body?.choices?.[0]?.message?.content === 'string'
    ? body.choices[0].message.content
    : typeof body?.message?.content === 'string' ? body.message.content : '';
}

async function* streamOllama(config, input, signal) {
  const model = await resolveLocalModel(config, signal);
  const messages = inputToChatMessages(input, 'ollama-chat');
  const response = await requestOllama(config, model, messages, {
    tools: LOCAL_CHAT_TOOLS,
    options: { num_ctx: getOllamaContext() },
    stream: true,
  }, signal);
  const contentType = response.headers.get('content-type') || '';
  if (!response.body || contentType.includes('application/json')) {
    const body = await readResponseBody(response);
    yield { type: 'response.completed', response: normalizeChatResponse(body, 'ollama') };
    return;
  }
  let text = '';
  const toolParts = [];
  for await (const chunk of readNdjson(response)) {
    const delta = typeof chunk?.message?.content === 'string' ? chunk.message.content : '';
    if (delta) {
      text += delta;
      yield { type: 'response.output_text.delta', delta };
    }
    for (const [index, call] of (chunk?.message?.tool_calls || []).entries()) {
      mergeToolCall(toolParts, call?.function?.index ?? index, call, 'ollama');
    }
  }
  yield {
    type: 'response.completed',
    response: normalizedResponseFromToolParts(text, toolParts, 'ollama'),
  };
}

async function* streamLmStudio(config, input, signal) {
  const model = await resolveLocalModel(config, signal);
  const messages = inputToChatMessages(input, 'chat-completions');
  const response = await requestChatCompletions(config, model, messages, {
    tools: LOCAL_CHAT_TOOLS,
    tool_choice: 'auto',
    stream: true,
  }, signal);
  const contentType = response.headers.get('content-type') || '';
  if (!response.body || contentType.includes('application/json')) {
    const body = await readResponseBody(response);
    yield { type: 'response.completed', response: normalizeChatResponse(body, 'lmstudio') };
    return;
  }
  let text = '';
  const toolParts = [];
  for await (const chunk of readSseJson(response)) {
    const delta = chunk?.choices?.[0]?.delta || {};
    if (typeof delta.content === 'string' && delta.content) {
      text += delta.content;
      yield { type: 'response.output_text.delta', delta: delta.content };
    }
    for (const [index, call] of (delta.tool_calls || []).entries()) {
      mergeToolCall(toolParts, call?.index ?? index, call, 'lmstudio');
    }
  }
  yield {
    type: 'response.completed',
    response: normalizedResponseFromToolParts(text, toolParts, 'lmstudio'),
  };
}

async function* streamResponses(config, input, signal) {
  const response = await fetch(config.baseUrl + '/responses', {
    method: 'POST',
    headers: { ...authorizationHeaders(config), 'content-type': 'application/json' },
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
  await ensureResponseOk(response, config.provider);
  if (!response.body || !(response.headers.get('content-type') || '').includes('text/event-stream')) {
    const body = await readResponseBody(response);
    yield { type: 'response.completed', response: body };
    return;
  }
  for await (const event of readSseJson(response)) yield event;
}

export async function* streamProviderResponse(provider, model, input, signal) {
  let config = getProviderConfig(provider, model);
  if (config.kind === 'local' && !config.model) {
    config = { ...config, model: await resolveLocalModel(config, signal) };
  }
  if (!config.model) throw makeError('PROVIDER_MODEL_REQUIRED', provider + ' requires a model. Select one in the assistant panel.');
  try {
    if (config.protocol === 'ollama-chat') yield* streamOllama(config, input, signal);
    else if (config.protocol === 'chat-completions') yield* streamLmStudio(config, input, signal);
    else yield* streamResponses(config, input, signal);
  } catch (error) {
    if (signal?.aborted) throw makeError('ASSISTANT_CANCELLED', 'Provider request was cancelled.');
    throw error;
  }
}

async function listModels(config, signal) {
  const response = await fetchWithDeadline(
    config.baseUrl + config.modelsPath,
    { headers: { ...authorizationHeaders(config) } },
    signal,
    timeoutMsFromEnv(),
  );
  await ensureResponseOk(response, config.provider);
  const body = await readResponseBody(response);
  const values = config.protocol === 'ollama-chat' ? body?.models : body?.data;
  return Array.isArray(values)
    ? values.map((entry) => entry?.name || entry?.id).filter(Boolean)
    : [];
}

async function probeApiConnection(config, signal) {
  const response = await fetchWithDeadline(
    config.baseUrl + config.modelsPath,
    { headers: { ...authorizationHeaders(config) } },
    signal,
    PROBE_TIMEOUT_MS,
  );
  await ensureResponseOk(response, config.provider);
  return { ok: true, message: 'endpoint reachable' };
}

async function probeLocalConnection(config, signal) {
  const models = await listModels(config, signal);
  return {
    ok: true,
    message: models.length ? models.length + ' model(s) visible' : 'endpoint reachable; no loaded model reported',
    models,
  };
}

async function probeToolCall(config, model, signal) {
  const messages = [{ role: 'user', content: 'Call retrovisor_probe_echo exactly once with value "ok". Do not change any scene or file.' }];
  if (config.protocol === 'ollama-chat') {
    const response = await requestOllama(config, model, messages, { tools: [PROBE_TOOL], stream: false }, signal);
    const call = (await readResponseBody(response))?.message?.tool_calls?.[0];
    const args = normalizeToolArguments(call?.function?.arguments);
    if (call?.function?.name !== PROBE_TOOL.function.name || typeof args.value !== 'string') {
      throw makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model did not return a valid tool call.');
    }
    return { ok: true, message: 'valid tool call returned' };
  }
  if (config.protocol === 'chat-completions') {
    const response = await requestChatCompletions(config, model, messages, { tools: [PROBE_TOOL], stream: false }, signal);
    const call = (await readResponseBody(response))?.choices?.[0]?.message?.tool_calls?.[0];
    const args = normalizeToolArguments(call?.function?.arguments);
    if (call?.function?.name !== PROBE_TOOL.function.name || typeof args.value !== 'string') {
      throw makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model did not return a valid tool call.');
    }
    return { ok: true, message: 'valid tool call returned' };
  }
  const response = await fetch(config.baseUrl + '/responses', {
    method: 'POST',
    headers: { ...authorizationHeaders(config), 'content-type': 'application/json' },
    body: JSON.stringify({ model, input: messages, tools: [{ type: 'function', ...PROBE_TOOL.function, strict: true }], tool_choice: 'auto', store: false, stream: false }),
    signal,
  });
  await ensureResponseOk(response, config.provider);
  const call = (await readResponseBody(response)).output?.find((entry) => entry.type === 'function_call');
  const args = normalizeToolArguments(call?.arguments);
  if (call?.name !== PROBE_TOOL.function.name || typeof args.value !== 'string') {
    throw makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model did not return a valid tool call.');
  }
  return { ok: true, message: 'valid tool call returned' };
}

async function probeStructuredJson(config, model, signal) {
  const messages = [{ role: 'user', content: 'Return a JSON object with ok=true and a non-empty value string.' }];
  let content = '';
  if (config.protocol === 'ollama-chat') {
    const response = await requestOllama(config, model, messages, { format: PROBE_SCHEMA, stream: false }, signal);
    content = responseTextFromChat(await readResponseBody(response));
  } else if (config.protocol === 'chat-completions') {
    const response = await requestChatCompletions(config, model, messages, {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'retrovisor_probe', strict: true, schema: PROBE_SCHEMA },
      },
      stream: false,
    }, signal);
    content = responseTextFromChat(await readResponseBody(response));
  } else {
    const response = await fetch(config.baseUrl + '/responses', {
      method: 'POST',
      headers: { ...authorizationHeaders(config), 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        input: messages,
        text: { format: { type: 'json_schema', name: 'retrovisor_probe', strict: true, schema: PROBE_SCHEMA } },
        store: false,
        stream: false,
      }),
      signal,
    });
    await ensureResponseOk(response, config.provider);
    const body = await readResponseBody(response);
    content = body?.output_text || body?.output?.flatMap((entry) => entry.content || [])
      .find((entry) => entry.type === 'output_text')?.text || '';
  }
  let value;
  try { value = JSON.parse(content); } catch { throw makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model did not return valid JSON for the schema.'); }
  if (value?.ok !== true || typeof value.value !== 'string' || !value.value) {
    throw makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model returned JSON that did not satisfy the probe schema.');
  }
  return { ok: true, message: 'JSON schema accepted and validated' };
}

function isExpectedProbeVisionResponse(content) {
  const normalized = String(content || '').toLowerCase();
  if (/(no[- ]?image|cannot see|can't see|no puedo ver|sin imagen|not visible)/i.test(normalized)) return false;
  return /(red.{0,30}blue|blue.{0,30}red|rojo.{0,30}azul|azul.{0,30}rojo|red[- ]blue|rojo[- ]azul)/i.test(normalized);
}
async function probeVision(config, model, signal) {
  let content = '';
  if (config.protocol === 'ollama-chat') {
    const response = await requestOllama(config, model, [{
      role: 'user',
      content: 'Inspect the probe image. Reply with exactly "red-blue" if the left half is red and the right half is blue; reply "no-image" if no image is visible.',
      images: [PROBE_IMAGE_BASE64],
    }], { stream: false }, signal);
    content = responseTextFromChat(await readResponseBody(response));
  } else if (config.protocol === 'chat-completions') {
    const response = await requestChatCompletions(config, model, [{
      role: 'user',
      content: [
        { type: 'text', text: 'Inspect the probe image. Reply with exactly "red-blue" if the left half is red and the right half is blue; reply "no-image" if no image is visible.' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,' + PROBE_IMAGE_BASE64 } },
      ],
    }], { stream: false }, signal);
    content = responseTextFromChat(await readResponseBody(response));
  } else {
    const response = await fetch(config.baseUrl + '/responses', {
      method: 'POST',
      headers: { ...authorizationHeaders(config), 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: 'Inspect the probe image. Reply with exactly "red-blue" if the left half is red and the right half is blue; reply "no-image" if no image is visible.' },
            { type: 'input_image', image_url: 'data:image/png;base64,' + PROBE_IMAGE_BASE64 },
          ],
        }],
        store: false,
        stream: false,
      }),
      signal,
    });
    await ensureResponseOk(response, config.provider);
    content = extractOutputText(await readResponseBody(response));
  }
  if (!content.trim()) throw makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model returned no vision response.');
  if (!isExpectedProbeVisionResponse(content)) {
    const error = makeError('PROVIDER_CAPABILITY_UNSUPPORTED', 'The selected model did not identify the probe image pattern.');
    error.transportAccepted = true;
    throw error;
  }
  return { ok: true, message: 'image pattern recognized', transportAccepted: true };
}

function normalizeProbeChecks(checks) {
  if (!Array.isArray(checks) || !checks.length) return ['connection', 'tools', 'structuredJson', 'vision'];
  return [...new Set(checks.map((value) => value === 'structured' ? 'structuredJson' : String(value)))]
    .filter((value) => ['connection', 'tools', 'structuredJson', 'vision'].includes(value));
}

function publicError(error) {
  return {
    code: error?.code || 'PROVIDER_PROBE_FAILED',
    message: String(error?.message || 'Provider probe failed.').slice(0, 500),
    ...(error?.transportAccepted ? { transportAccepted: true } : {}),
  };
}

export async function probeProvider(provider, requestedModel = null, options = {}) {
  const config = getProviderConfig(provider, requestedModel);
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Math.min(Math.max(Number(options.timeoutMs), 250), 60_000)
    : PROBE_TIMEOUT_MS;
  const deadline = signalWithTimeout(options.signal, timeout);
  const checks = normalizeProbeChecks(options.checks);
  let model = config.model;
  const checkResults = {};
  const capabilities = unknownCapabilities();
  try {
    if (checks.includes('connection')) {
      const result = config.kind === 'local'
        ? await probeLocalConnection(config, deadline.signal)
        : await probeApiConnection(config, deadline.signal);
      checkResults.connection = result;
      if (config.kind === 'local' && !model && result.models?.length) model = result.models[0];
    }
    const requiresModel = checks.some((check) => check !== 'connection');
    if (requiresModel && !model) throw makeError('PROVIDER_MODEL_REQUIRED', provider + ' has no selected model. Load a model and choose it in the assistant panel.');

    if (checks.includes('tools')) {
      try {
        checkResults.tools = await probeToolCall({ ...config, model }, model, deadline.signal);
        capabilities.tools = true;
      } catch (error) {
        capabilities.tools = false;
        checkResults.tools = { ok: false, ...publicError(error) };
      }
    }
    if (checks.includes('structuredJson')) {
      try {
        checkResults.structuredJson = await probeStructuredJson({ ...config, model }, model, deadline.signal);
        capabilities.structuredJson = true;
      } catch (error) {
        capabilities.structuredJson = false;
        checkResults.structuredJson = { ok: false, ...publicError(error) };
      }
    }
    if (checks.includes('vision')) {
      try {
        checkResults.vision = await probeVision({ ...config, model }, model, deadline.signal);
        capabilities.vision = true;
      } catch (error) {
        capabilities.vision = false;
        checkResults.vision = { ok: false, ...publicError(error), manualReview: true };
      }
    }
    const connectionOk = !checks.includes('connection') || checkResults.connection?.ok === true;
    const checksOk = Object.entries(checkResults)
      .filter(([name]) => name !== 'connection')
      .every(([, result]) => result?.ok === true);
    const remembered = rememberCapabilities(provider, model, capabilities);
    return {
      ok: connectionOk && checksOk,
      provider,
      model,
      local: config.kind === 'local',
      endpoint: publicUrl(config.baseUrl),
      capabilities: remembered,
      checks: checkResults,
      manualReviewRequired: capabilities.vision === false,
    };
  } catch (error) {
    const result = {
      ok: false,
      provider,
      model: model || null,
      local: config.kind === 'local',
      endpoint: publicUrl(config.baseUrl),
      capabilities: rememberCapabilities(provider, model, capabilities),
      checks: checkResults,
      error: publicError(error),
      manualReviewRequired: capabilities.vision === false,
    };
    return result;
  } finally {
    deadline.dispose();
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
