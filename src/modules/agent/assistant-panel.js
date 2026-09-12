
const CONFIG_URL = import.meta.env.VITE_RETROVISOR_AGENT_URL
  || 'http://127.0.0.1:47831/agent/config';

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function injectStyles() {
  if (document.getElementById('retrovisor-agent-styles')) return;
  const style = document.createElement('style');
  style.id = 'retrovisor-agent-styles';
  style.textContent = [
    '.rv-agent-launcher{position:fixed;right:16px;bottom:16px;z-index:70;border:2px solid #ffcc00;background:#18181b;color:#ffcc00;padding:9px 13px;font:700 12px monospace;box-shadow:4px 4px 0 #000}',
    '.rv-agent-panel{position:fixed;right:16px;bottom:62px;z-index:70;width:min(430px,calc(100vw - 32px));height:min(680px,calc(100vh - 90px));display:flex;flex-direction:column;background:#18181b;border:2px solid #ffcc00;color:#e4e4e7;box-shadow:8px 8px 0 rgba(0,0,0,.65);font:12px/1.45 monospace}',
    '.rv-agent-hidden{display:none!important}.rv-agent-header,.rv-agent-config,.rv-agent-actions{display:flex;align-items:center;gap:7px;padding:8px;border-bottom:1px solid #3f3f46}',
    '.rv-agent-header strong{color:#ffcc00;flex:1}.rv-agent-status{font-size:10px;color:#a1a1aa}.rv-agent-config{flex-wrap:wrap}.rv-agent-config select,.rv-agent-config input,.rv-agent-input{min-width:0;background:#09090b;color:#f4f4f5;border:1px solid #52525b;padding:6px;font:12px monospace}',
    '.rv-agent-config select{width:112px}.rv-agent-config input{flex:1;min-width:120px}.rv-agent-config button{background:#3f3f46;color:#fff;border:0;padding:6px 8px;font:700 10px monospace;cursor:pointer}.rv-agent-capabilities{width:100%;color:#a1a1aa;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rv-agent-messages{flex:1;overflow:auto;padding:9px;display:flex;flex-direction:column;gap:8px}.rv-agent-message{white-space:pre-wrap;word-break:break-word;padding:7px 8px;border-left:3px solid #52525b;background:#27272a}.rv-agent-user{border-color:#4488ff}.rv-agent-assistant{border-color:#ffcc00}',
    '.rv-agent-tool{padding:6px 8px;background:#09090b;border:1px solid #3f3f46;color:#a1a1aa}.rv-agent-tool b{color:#67e8f9}.rv-agent-error{border-color:#ef4444;color:#fecaca}.rv-agent-approval{padding:8px;border:2px solid #ef4444;background:#2b1010}.rv-agent-approval strong{display:block;color:#fca5a5;margin-bottom:5px}',
    '.rv-agent-approval button,.rv-agent-actions button,.rv-agent-header button{background:#3f3f46;color:#fff;border:0;padding:6px 9px;font:700 11px monospace;cursor:pointer}.rv-agent-approval .approve{background:#b91c1c}',
    '.rv-agent-actions{border-top:1px solid #3f3f46;border-bottom:0;align-items:flex-end}.rv-agent-input{flex:1;resize:none;min-height:52px}.rv-agent-send{background:#ffcc00!important;color:#000!important}.rv-agent-artifact{padding:7px 8px;background:#0f172a;border:1px solid #2563eb}.rv-agent-artifact a{color:#93c5fd}.rv-agent-artifact img{display:block;max-width:100%;max-height:160px;margin-top:5px}'
  ].join('');
  document.head.appendChild(style);
}

function capabilityMark(value) {
  return value === true ? '✓' : value === false ? '✗' : '?';
}

function capabilityText(capabilities) {
  const value = capabilities || {};
  return 'tools ' + capabilityMark(value.tools)
    + ' · visión ' + capabilityMark(value.vision)
    + ' · JSON ' + capabilityMark(value.structuredJson);
}

function errorMessage(body, fallback) {
  return body?.error?.message || body?.message || fallback;
}

export function initAssistantPanel(options = {}) {
  injectStyles();
  const history = [];
  let assistantBase = null;
  let controller = null;
  let probeController = null;
  let providerStatus = null;
  const capabilityModels = new Map();

  const launcher = element('button', 'rv-agent-launcher', 'AGENT');
  const panel = element('section', 'rv-agent-panel rv-agent-hidden');
  panel.setAttribute('aria-label', 'Asistente de Retrovisor');

  const header = element('div', 'rv-agent-header');
  header.append(element('strong', '', 'RETROVISOR AGENT'));
  const status = element('span', 'rv-agent-status', 'DESCONECTADO');
  const close = element('button', '', '×');
  header.append(status, close);

  const config = element('div', 'rv-agent-config');
  const provider = element('select');
  provider.append(
    new Option('OpenAI', 'openai'),
    new Option('xAI / Grok', 'xai'),
    new Option('Ollama · local', 'ollama'),
    new Option('LM Studio · local', 'lmstudio'),
  );
  const model = element('input');
  model.placeholder = 'modelo';
  const probe = element('button', '', 'COMPROBAR');
  probe.title = 'Prueba conexión, herramientas, JSON Schema y visión con este modelo.';
  const capabilities = element('span', 'rv-agent-capabilities', capabilityText(null));
  config.append(provider, model, probe, capabilities);

  const messages = element('div', 'rv-agent-messages');
  const actions = element('div', 'rv-agent-actions');
  const input = element('textarea', 'rv-agent-input');
  input.placeholder = 'Describe el cambio que quieres hacer en la escena…';
  const stop = element('button', '', 'PARAR');
  stop.disabled = true;
  const clear = element('button', '', 'LIMPIAR');
  const send = element('button', 'rv-agent-send', 'ENVIAR');
  actions.append(input, stop, clear, send);
  panel.append(header, config, messages, actions);
  document.body.append(panel, launcher);

  const addMessage = (role, text = '') => {
    const node = element('div', 'rv-agent-message rv-agent-' + role, text);
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  };

  const addTool = (name, stateText) => {
    const node = element('div', 'rv-agent-tool');
    const title = element('b', '', name);
    node.append(title, document.createTextNode(' — ' + stateText));
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  };

  const addArtifact = (event) => {
    const artifact = event.artifact || event.data || {};
    const node = element('div', 'rv-agent-artifact');
    const label = artifact.name || artifact.filename || event.name || 'artefacto';
    node.append(element('strong', '', label));
    let rawUrl = artifact.url || artifact.downloadUrl || artifact.href || null;
    if (!rawUrl && artifact.data !== undefined && artifact.mimeType) {
      if (artifact.encoding === 'base64') rawUrl = 'data:' + artifact.mimeType + ';base64,' + artifact.data;
      else {
        const textData = artifact.encoding === 'json' && typeof artifact.data !== 'string'
          ? JSON.stringify(artifact.data)
          : String(artifact.data);
        rawUrl = 'data:' + artifact.mimeType + ';charset=utf-8,' + encodeURIComponent(textData);
      }
    }
    if (rawUrl) {
      const link = element('a', '', 'Descargar / abrir');
      link.href = rawUrl;
      if (artifact.filename || artifact.name) link.download = artifact.filename || artifact.name;
      link.target = '_blank';
      link.rel = 'noopener';
      node.append(document.createTextNode(' '), link);
      if (String(artifact.mimeType || '').startsWith('image/') || String(rawUrl).startsWith('data:image/')) {
        const image = element('img');
        image.src = rawUrl;
        image.alt = label;
        node.append(image);
      }
    } else if (artifact.summary || event.summary) {
      node.append(element('div', '', artifact.summary || event.summary));
    }
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
  };

  const refreshModel = () => {
    const info = providerStatus?.[provider.value];
    if (info && !model.value && info.defaultModel) model.value = info.defaultModel;
  };

  const renderCapabilities = (value, forceUnknown = false) => {
    const shown = forceUnknown ? null : value;
    capabilities.textContent = capabilityText(shown);
    capabilities.title = shown
      ? '✓ confirmado por /assistant/probe'
      : 'Las capacidades se desconocen hasta comprobar el modelo.';
    if (shown?.vision === false) capabilities.title += ' Revisión visual manual pendiente: este modelo no confirmó visión.';
  };

  const refreshCapabilitiesForSelection = () => {
    const checkedModel = capabilityModels.get(provider.value);
    const selectedModel = model.value.trim();
    const info = providerStatus?.[provider.value];
    renderCapabilities(
      checkedModel && checkedModel === selectedModel ? info?.capabilities : null,
      !checkedModel || checkedModel !== selectedModel,
    );
  };

  const connect = async () => {
    try {
      const configResponse = await fetch(options.configUrl || CONFIG_URL, { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('servicio local no disponible');
      const localConfig = await configResponse.json();
      assistantBase = localConfig.assistantUrl;
      const statusResponse = await fetch(assistantBase + '/status', { cache: 'no-store' });
      if (!statusResponse.ok) throw new Error('estado del asistente no disponible');
      const body = await statusResponse.json();
      providerStatus = body.providers || {};
      const configured = Object.entries(providerStatus).filter(([, value]) => value.configured);
      status.textContent = configured.length
        ? 'LISTO · ' + configured.map(([name]) => name.toUpperCase()).join('/')
        : 'SIN CREDENCIALES';
      status.title = body.instructions || 'Comprueba un proveedor para conocer sus capacidades.';
      if (!providerStatus[provider.value]?.configured && configured.length) provider.value = configured[0][0];
      refreshModel();
      refreshCapabilitiesForSelection();
      probe.disabled = false;
    } catch (error) {
      assistantBase = null;
      probe.disabled = true;
      status.textContent = 'INICIA npm run agent:dev';
      status.title = error.message || 'El editor funciona sin el asistente. Inicia el compañero local para conectar agentes.';
      renderCapabilities(null, true);
    }
  };

  const checkProvider = async () => {
    if (probeController) {
      probeController.abort();
      return;
    }
    if (!assistantBase) await connect();
    if (!assistantBase) return;
    const selectedProvider = provider.value;
    const selectedModel = model.value.trim() || null;
    const localController = new AbortController();
    probeController = localController;
    let timer = setTimeout(() => localController.abort(), 25_000);
    probe.disabled = false;
    probe.textContent = 'CANCELAR';
    status.textContent = 'COMPROBANDO · ' + selectedProvider.toUpperCase();
    try {
      const response = await fetch(assistantBase + '/probe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel, timeoutMs: 20_000 }),
        signal: localController.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(body, 'La comprobación no pudo completarse.'));
      providerStatus = providerStatus || {};
      providerStatus[selectedProvider] = {
        ...(providerStatus[selectedProvider] || {}),
        capabilities: body.capabilities,
        defaultModel: body.model || providerStatus[selectedProvider]?.defaultModel || null,
      };
      if (body.model && !model.value.trim()) model.value = body.model;
      capabilityModels.set(selectedProvider, body.model || selectedModel || '');
      renderCapabilities(body.capabilities, false);
      status.textContent = body.ok
        ? 'COMPROBADO · ' + selectedProvider.toUpperCase()
        : 'REVISAR · ' + selectedProvider.toUpperCase();
      const failedCheck = Object.values(body.checks || {}).find((check) => check?.ok === false);
      status.title = body.error?.message || (body.manualReviewRequired
        ? 'La visión no está confirmada. Revisión visual manual pendiente.'
        : (failedCheck?.message || body.checks?.connection?.message || 'La comprobación terminó con resultados detallados.'));
      if (body.manualReviewRequired) capabilities.title += ' Revisión manual pendiente.';
    } catch (error) {
      if (error.name === 'AbortError') {
        status.textContent = 'COMPROBACIÓN CANCELADA';
      } else {
        status.textContent = 'ERROR · ' + selectedProvider.toUpperCase();
        status.title = error.message || 'No se pudo comprobar el proveedor.';
        renderCapabilities(null, true);
      }
    } finally {
      clearTimeout(timer);
      timer = null;
      probeController = null;
      probe.textContent = 'COMPROBAR';
    }
  };

  const resolveApproval = async (approvalId, approved, container) => {
    const response = await fetch(assistantBase + '/approvals/' + encodeURIComponent(approvalId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    container.textContent = approved ? 'Acción destructiva aprobada.' : 'Acción destructiva rechazada.';
    if (!response.ok) container.classList.add('rv-agent-error');
  };

  const handleEvent = (event, activeAssistant) => {
    if (event.type === 'text_delta') {
      activeAssistant.textContent += event.delta;
    } else if (event.type === 'completed') {
      activeAssistant.textContent = event.text || activeAssistant.textContent;
      if (event.status === 'no_actions') addTool('Editor', 'No se ejecutaron operaciones ni se generaron archivos en este turno.');
    } else if (event.type === 'workflow_continuation' || event.type === 'draft_pending') {
      addTool('Personaje', event.message);
    } else if (event.type === 'tool_started') {
      addTool(event.name, 'ejecutando');
    } else if (event.type === 'tool_completed') {
      addTool(event.name, event.ok ? 'completada' : 'falló');
      if (Array.isArray(event.artifacts)) {
        event.artifacts.forEach((artifact) => addArtifact({ type: 'artifact', artifact }));
      }
    } else if (event.type === 'approval_required') {
      const approval = element('div', 'rv-agent-approval');
      approval.append(element('strong', '', 'Confirmar ' + event.name));
      approval.append(element('div', '', JSON.stringify(event.arguments)));
      const approve = element('button', 'approve', 'APROBAR');
      const deny = element('button', '', 'RECHAZAR');
      approve.addEventListener('click', () => void resolveApproval(event.approvalId, true, approval));
      deny.addEventListener('click', () => void resolveApproval(event.approvalId, false, approval));
      approval.append(approve, deny);
      messages.appendChild(approval);
    } else if (event.type === 'artifact' || event.type === 'image') {
      addArtifact(event);

    } else if (event.type === 'visual_review_required') {
      const review = element('div', 'rv-agent-tool rv-agent-error', 'Revisión visual manual pendiente: ' + (event.message || 'comprueba las vistas del personaje.'));
      messages.appendChild(review);
      messages.scrollTop = messages.scrollHeight;
    } else if (event.type === 'error') {
      activeAssistant.classList.add('rv-agent-error');
      activeAssistant.textContent += '\n' + (event.message || 'El asistente falló.');
    }
  };

  const submit = async () => {
    const text = input.value.trim();
    if (!text || controller || !assistantBase) {
      if (!assistantBase) await connect();
      return;
    }
    history.push({ role: 'user', content: text });
    addMessage('user', text);
    input.value = '';
    const activeAssistant = addMessage('assistant');
    controller = new AbortController();
    send.disabled = true;
    stop.disabled = false;
    try {
      const response = await fetch(assistantBase + '/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: provider.value,
          model: model.value.trim() || null,
          sessionId: (() => { try { return sessionStorage.getItem('retrovisor-agent-session'); } catch { return null; } })(),
          messages: history,
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('HTTP ' + response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = '';
      while (true) {
        const { value, done } = await reader.read();
        buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffered.split('\n');
        buffered = done ? '' : lines.pop();
        lines.filter(Boolean).forEach((line) => handleEvent(JSON.parse(line), activeAssistant));
        if (done) break;
      }
      if (activeAssistant.textContent.trim()) {
        history.push({ role: 'assistant', content: activeAssistant.textContent.trim() });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        activeAssistant.classList.add('rv-agent-error');
        activeAssistant.textContent = 'No se pudo completar: ' + error.message;
      }
    } finally {
      controller = null;
      send.disabled = false;
      stop.disabled = true;
    }
  };

  launcher.addEventListener('click', () => {
    panel.classList.toggle('rv-agent-hidden');
    if (!panel.classList.contains('rv-agent-hidden')) void connect();
  });
  close.addEventListener('click', () => panel.classList.add('rv-agent-hidden'));
  provider.addEventListener('change', () => {
    model.value = '';
    refreshModel();
    refreshCapabilitiesForSelection();
  });
  model.addEventListener('input', refreshCapabilitiesForSelection);
  probe.addEventListener('click', () => void checkProvider());
  send.addEventListener('click', () => void submit());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  });
  stop.addEventListener('click', () => controller?.abort());
  clear.addEventListener('click', () => {
    history.length = 0;
    messages.replaceChildren();
  });
  window.addEventListener('retrovisor:agent-status', (event) => {
    if (event.detail?.connected) void connect();
  });
  void connect();
}
