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
  style.textContent = `
    .rv-agent-launcher{position:fixed;right:16px;bottom:16px;z-index:70;border:2px solid #ffcc00;background:#18181b;color:#ffcc00;padding:9px 13px;font:700 12px monospace;box-shadow:4px 4px 0 #000}
    .rv-agent-panel{position:fixed;right:16px;bottom:62px;z-index:70;width:min(390px,calc(100vw - 32px));height:min(650px,calc(100vh - 90px));display:flex;flex-direction:column;background:#18181b;border:2px solid #ffcc00;color:#e4e4e7;box-shadow:8px 8px 0 rgba(0,0,0,.65);font:12px/1.45 monospace}
    .rv-agent-hidden{display:none!important}.rv-agent-header,.rv-agent-config,.rv-agent-actions{display:flex;align-items:center;gap:7px;padding:8px;border-bottom:1px solid #3f3f46}
    .rv-agent-header strong{color:#ffcc00;flex:1}.rv-agent-status{font-size:10px;color:#a1a1aa}.rv-agent-config select,.rv-agent-config input,.rv-agent-input{min-width:0;background:#09090b;color:#f4f4f5;border:1px solid #52525b;padding:6px;font:12px monospace}
    .rv-agent-config select{width:92px}.rv-agent-config input{flex:1}.rv-agent-messages{flex:1;overflow:auto;padding:9px;display:flex;flex-direction:column;gap:8px}
    .rv-agent-message{white-space:pre-wrap;word-break:break-word;padding:7px 8px;border-left:3px solid #52525b;background:#27272a}.rv-agent-user{border-color:#4488ff}.rv-agent-assistant{border-color:#ffcc00}
    .rv-agent-tool{padding:6px 8px;background:#09090b;border:1px solid #3f3f46;color:#a1a1aa}.rv-agent-tool b{color:#67e8f9}.rv-agent-error{border-color:#ef4444;color:#fecaca}
    .rv-agent-approval{padding:8px;border:2px solid #ef4444;background:#2b1010}.rv-agent-approval strong{display:block;color:#fca5a5;margin-bottom:5px}
    .rv-agent-approval button,.rv-agent-actions button,.rv-agent-header button{background:#3f3f46;color:#fff;border:0;padding:6px 9px;font:700 11px monospace;cursor:pointer}.rv-agent-approval .approve{background:#b91c1c}
    .rv-agent-actions{border-top:1px solid #3f3f46;border-bottom:0;align-items:flex-end}.rv-agent-input{flex:1;resize:none;min-height:52px}.rv-agent-send{background:#ffcc00!important;color:#000!important}
  `;
  document.head.appendChild(style);
}

export function initAssistantPanel(options = {}) {
  injectStyles();
  const history = [];
  let assistantBase = null;
  let controller = null;
  let providerStatus = null;

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
  provider.append(new Option('OpenAI', 'openai'), new Option('xAI / Grok', 'xai'));
  const model = element('input');
  model.placeholder = 'modelo';
  config.append(provider, model);

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
    const node = element('div', `rv-agent-message rv-agent-${role}`, text);
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  };

  const addTool = (name, stateText) => {
    const node = element('div', 'rv-agent-tool');
    const title = element('b', '', name);
    node.append(title, document.createTextNode(` — ${stateText}`));
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  };

  const refreshModel = () => {
    const info = providerStatus?.[provider.value];
    if (info && !model.value) model.value = info.defaultModel;
  };

  const connect = async () => {
    try {
      const configResponse = await fetch(options.configUrl || CONFIG_URL, { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('servicio local no disponible');
      const localConfig = await configResponse.json();
      assistantBase = localConfig.assistantUrl;
      const statusResponse = await fetch(`${assistantBase}/status`, { cache: 'no-store' });
      if (!statusResponse.ok) throw new Error('estado del asistente no disponible');
      const body = await statusResponse.json();
      providerStatus = body.providers;
      const configured = Object.entries(providerStatus).filter(([, value]) => value.configured);
      status.textContent = configured.length
        ? `LISTO · ${configured.map(([name]) => name.toUpperCase()).join('/')}`
        : 'SIN CREDENCIALES';
      status.title = body.instructions;
      if (!providerStatus[provider.value]?.configured && configured.length) provider.value = configured[0][0];
      refreshModel();
    } catch {
      assistantBase = null;
      status.textContent = 'INICIA npm run agent:dev';
      status.title = 'El editor funciona sin el asistente. Inicia el compañero local para conectar agentes.';
    }
  };

  const resolveApproval = async (approvalId, approved, container) => {
    const response = await fetch(`${assistantBase}/approvals/${encodeURIComponent(approvalId)}`, {
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
    } else if (event.type === 'tool_started') {
      addTool(event.name, 'ejecutando');
    } else if (event.type === 'tool_completed') {
      addTool(event.name, event.ok ? 'completada' : 'falló');
    } else if (event.type === 'approval_required') {
      const approval = element('div', 'rv-agent-approval');
      approval.append(element('strong', '', `Confirmar ${event.name}`));
      approval.append(element('div', '', JSON.stringify(event.arguments)));
      const approve = element('button', 'approve', 'APROBAR');
      const deny = element('button', '', 'RECHAZAR');
      approve.addEventListener('click', () => void resolveApproval(event.approvalId, true, approval));
      deny.addEventListener('click', () => void resolveApproval(event.approvalId, false, approval));
      approval.append(approve, deny);
      messages.appendChild(approval);
    } else if (event.type === 'error') {
      activeAssistant.classList.add('rv-agent-error');
      activeAssistant.textContent += `\n${event.message || 'El asistente falló.'}`;
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
      const response = await fetch(`${assistantBase}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: provider.value,
          model: model.value.trim() || null,
          messages: history,
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
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
        activeAssistant.textContent = `No se pudo completar: ${error.message}`;
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
  });
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
