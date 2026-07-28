## Why

Retrovisor already exposes rich scene editing behavior, but external agents can only interact indirectly through prompts and imported JSON. A local-first agent integration will let Codex, Grok, and an in-app assistant inspect, edit, render, and correct a live scene through a stable, secure, provider-neutral tool contract.

## What Changes

- Add an internal agent command API that wraps scene reads and mutations without depending on HTML event handlers or arbitrary DOM access.
- Assign persistent stable IDs to agent-addressable scene objects and preserve them across scene serialization.
- Add a localhost-only Node.js companion service with an authenticated browser bridge, active-session tracking, reconnection behavior, and structured command routing.
- Add an MCP server with STDIO and local Streamable HTTP transports, strict tool schemas, structured results, tool annotations, bounded outputs, and no filesystem/shell/eval surface.
- Expose semantic scene tools for status, inspection, selection, creation, import, transforms, appearance, grouping, duplication, deletion, history, capture, and serialization/export.
- Add viewport capture and a validated inspect → mutate → capture → correct workflow.
- Add an in-app streaming assistant panel that reuses the same tool registry and supports OpenAI Responses and xAI/Grok through server-side provider adapters.
- Add confirmation handling for destructive operations, provider-key isolation, prompt-injection boundaries, tests, sample MCP configurations, and operational documentation.
- Add npm scripts for starting and validating the companion/MCP services.

## Capabilities

### New Capabilities

- `agent-command-api`: Stable IDs, semantic scene commands, validation, structured results, UI synchronization, undo/redo, and bounded scene summaries.
- `local-agent-bridge`: Localhost companion service, authenticated browser bridge, session lifecycle, reconnection, command correlation, and secret isolation.
- `retrovisor-mcp-server`: MCP tools, STDIO and Streamable HTTP transports, safety annotations, viewport captures, and client interoperability.
- `in-app-agent-assistant`: Streaming chat UI, shared tool execution, provider adapters, cancellation, history, tool activity, and destructive-action confirmation.

### Modified Capabilities

- `scene-persistence`: Preserve stable agent object IDs when saving and restoring scenes while remaining compatible with existing scene files.

## Impact

- Affected frontend areas: application startup, scene object lifecycle, persistence, selection, actions, UI refresh, viewport capture, and a new assistant UI module.
- New local service areas: command/tool registry, WebSocket bridge, MCP transports, provider adapters, and local configuration.
- New runtime dependencies are expected for the official stable MCP SDK, JSON-schema validation, and WebSocket transport.
- Existing browser-only editing remains available when the companion service is not running or provider credentials are absent.
- Project-level example configuration and documentation are added without changing personal Codex or Grok settings.
