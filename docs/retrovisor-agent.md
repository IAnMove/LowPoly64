# Retrovisor local agent integration

Retrovisor exposes one shared catalog of scene commands to three callers:

1. the in-browser assistant panel;
2. local MCP clients through STDIO;
3. local MCP clients through authenticated Streamable HTTP.

The browser never receives provider API keys. The Node companion owns provider
requests, MCP transports, destructive approvals, session routing, and the
loopback authentication token.

## Architecture

```text
Codex / Grok / MCP client
        | STDIO or localhost Streamable HTTP
        v
Node companion (127.0.0.1:47831)
        | authenticated WebSocket
        v
active Retrovisor tab
        | shared validated command registry
        v
Three.js scene + UI + event bus + undo/redo + persistence
```

Stable `rv_*` IDs are stored in `object.userData.agentId`, round-trip through
scene persistence, survive undo/redo, and are cleared on clones before a new ID
is assigned. MCP is not coupled to DOM selectors or the historical `window.*`
bindings.

## Start the local stack

PowerShell:

```powershell
$env:RETROVISOR_AGENT_TOKEN = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
# Optional, only for the in-app assistant:
$env:OPENAI_API_KEY = "..."
$env:XAI_API_KEY = "..."
npm run agent:dev
```

Open `http://127.0.0.1:5173`. The `AGENT` button works without provider keys but
shows `SIN CREDENCIALES`; scene editing and MCP remain available. Keys must be
environment variables of the companion process. They are never bundled,
returned to the browser, written to localStorage, or logged.

The processes can also be started separately:

```powershell
npm run dev
npm run agent:companion
```

Keep the same `RETROVISOR_AGENT_TOKEN`, host, and port in the companion and MCP
client environments.

## Connect Codex

Use [codex-mcp.example.toml](examples/codex-mcp.example.toml) as a project or
user configuration template. It forwards `RETROVISOR_AGENT_TOKEN` from the
environment and starts the STDIO adapter. Do not paste provider API keys into
the MCP entry.

Start Retrovisor and its companion first, open the editor tab, then start
Codex from the same environment. A useful first request is:

> Inspect the Retrovisor scene, add a blue cube, capture the viewport, correct
> its placement if needed, and report the stable object ID.

## Connect Grok CLI

Copy [grok-mcp.example.toml](examples/grok-mcp.example.toml) to
`.grok/config.toml` if you want project-scoped discovery, or add the equivalent
without changing global configuration:

```powershell
grok mcp add --scope project retrovisor -- node server/agent/mcp-stdio.js
grok mcp doctor retrovisor
```

Ensure the Grok process inherits `RETROVISOR_AGENT_TOKEN`.

## Connect Kimi Code

Use [kimi-mcp.example.json](examples/kimi-mcp.example.json) as a template for
`.kimi-code/mcp.json`. The example uses authenticated localhost HTTP so
`bearerTokenEnvVar` reads `RETROVISOR_AGENT_TOKEN` from Kimi's environment
instead of storing the token in the project.

```powershell
kimi
```

On first launch use `/login`, select Kimi Code OAuth, and finish the device-code
flow. Use `/mcp` in the Kimi TUI to inspect the connection and `/mcp-config` to
edit it. Kimi is an external MCP client here; it is not currently a direct
provider option in the in-app panel.

For a Spanish operational guide, client authentication options, token
accounting, limitation probes, and an improvement roadmap, see
[../README-MCP.md](../README-MCP.md).

## Tools

Read-only:

- `get_application_status`, `get_scene_summary`, `list_objects`, `get_object`
- `get_selection`, `capture_viewport`, `serialize_scene`,
  `export_selected_object`

Reversible writes:

- `select_objects`, `add_primitive`, `add_template`,
  `import_object_definition`
- `update_object_transform`, `update_object_appearance`
- `group_objects`, `ungroup_objects`, `duplicate_objects`, `undo`, `redo`

Destructive:

- `delete_objects` requires `confirm: true`. The in-app assistant also pauses
  for an explicit approve/deny click before the command reaches the browser.

All schemas are closed, bounded, and validated both before routing and in the
browser. There are no filesystem, shell, arbitrary network, or JavaScript
evaluation tools.

## In-app assistant

The panel keeps chat history in memory for the current page session. It offers:

- OpenAI and xAI provider selection plus an editable model name;
- streamed normalized events and incremental answer rendering;
- tool activity, cancellation, and history clearing;
- explicit approval controls for destructive calls;
- clear service/key status without exposing credentials.

Provider defaults can be overridden with
`RETROVISOR_OPENAI_MODEL` and `RETROVISOR_XAI_MODEL`.

## Trust model and limitations

- The companion binds to loopback only and rejects non-loopback host settings.
- Browser configuration and WebSocket upgrades require an allowed `Origin`.
- The browser/companion handshake uses a high-entropy local bearer token held
  in memory. Treat it like a password and do not commit it.
- Tool outputs are bounded and object/user text is sanitized and marked
  untrusted before it is returned to a model.
- Multiple tabs are supported; the visible, most recently active tab wins.
  HTTP callers may target a specific session ID.
- The MVP has no SaaS service, public tunnel, remote multiuser routing, shell
  access, or arbitrary filesystem access.
- A local process running as the same OS user may still inspect process memory
  or environment variables. The design does not defend against a fully
  compromised workstation.
- Provider calls require network access and valid billing/credentials. Automated
  tests mock them; run a manual assistant turn for each configured provider.

## Tests and troubleshooting

```powershell
npm run test:agent
npm run test:mcp
npm run test:agent:e2e
npx playwright test --project=smoke tests/e2e/agent-mcp.spec.js
npm run verify
npm run audit:code-size
```

Common failures:

- `NO_ACTIVE_EDITOR`: open Retrovisor and wait for the bridge to reconnect.
- `UNAUTHORIZED`: the MCP adapter and companion tokens differ.
- browser stays `DESCONECTADO`: check port `47831` and allowed origin.
- `PROVIDER_NOT_CONFIGURED`: set the matching provider key and restart Node.
- `CONFIRMATION_REQUIRED`: pass `confirm: true`; the panel will still require
  the human approval click.
- timeouts during capture: request a smaller `max_width`/`max_height` and raise
  the MCP client tool timeout on software-rendered WebGL systems.
