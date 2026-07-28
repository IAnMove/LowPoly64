## Context

Retrovisor is a Vite/Three.js browser application with a shared mutable scene state, modular viewport actions, a small event bus, and undo/redo closures. HTML actions are currently bridged through `src/bindings.js`; transform field handlers read values directly from the DOM. Scene persistence already reconstructs meshes, groups, pivots, avatars, textures, and animation metadata, but does not preserve an agent-facing identifier.

External MCP clients run outside the browser, while the requested assistant must execute the same semantic operations from inside the application. The design therefore needs one tool contract, a browser-resident executor, a local process that owns credentials and protocols, and an authenticated bridge between them.

The implementation targets the production-recommended v1 generation of the official TypeScript MCP SDK. Its STDIO transport serves process-spawned local clients and Streamable HTTP serves localhost clients. Provider integration uses server-side HTTP requests to the OpenAI Responses API and xAI's Responses-compatible API; credentials never enter browser code or storage.

## Goals / Non-Goals

**Goals:**

- Give scene objects persistent, collision-free IDs that agents can safely address.
- Provide a DOM-independent command facade with strict validation, atomic mutations, structured results, UI refresh, and undo/redo.
- Connect one active Retrovisor browser session to a localhost companion through an origin-restricted, token-authenticated WebSocket bridge.
- Serve the same bounded tool catalog over MCP STDIO, MCP Streamable HTTP, and in-app provider function calling.
- Provide visual feedback, streaming assistant events, cancellation, history, tool activity, and explicit approval for destructive operations.
- Keep normal browser editing fully functional without the companion or credentials.
- Provide deterministic tests and reproducible client configuration without mutating user-global settings.

**Non-Goals:**

- Public hosting, tunneling, remote multi-user sessions, team identity, or OAuth.
- General browser automation, arbitrary JavaScript evaluation, shell execution, or filesystem access.
- Autonomous reset/replace-scene operations.
- Long-term cloud chat history or provider-key management UI.
- Replacing existing editor controls, persistence formats, or texture-generation configuration.

## Decisions

### 1. One plain-data tool catalog, three adapters

A pure ESM tool catalog defines names, descriptions, JSON Schemas, output expectations, safety metadata, and destructive confirmation requirements. The browser command executor, MCP adapter, and provider runner all import this catalog. MCP uses the official SDK's low-level request handlers so the catalog's JSON Schemas remain the single schema source rather than being duplicated as Zod definitions.

Alternatives considered:

- Wrap `window.*` handlers: rejected because many handlers depend on DOM state and expose an unstable, overly broad surface.
- Maintain separate MCP and assistant tools: rejected because behavior and safety rules would drift.

### 2. Browser command facade owns live scene mutations

`src/modules/agent/` contains stable-ID management, validation helpers, scene summaries, command execution, UI synchronization, capture, and the browser bridge. Commands call existing domain functions when those functions are semantic and history-safe; otherwise they mutate Three.js objects through a focused helper and push one undo action covering the entire command.

Every command returns a serializable envelope:

```json
{
  "ok": true,
  "command": "update_object_transform",
  "changedIds": ["rv_..."],
  "warnings": [],
  "data": {},
  "scene": { "objectCount": 3, "selectionIds": ["rv_..."] }
}
```

Errors use stable codes such as `VALIDATION_ERROR`, `OBJECT_NOT_FOUND`, `CONFIRMATION_REQUIRED`, `NO_ACTIVE_EDITOR`, and `COMMAND_TIMEOUT`.

### 3. Stable IDs live in `userData` and scene JSON

Agent-addressable meshes and groups receive `userData.agentId` lazily through `crypto.randomUUID()` with an `rv_` prefix. IDs are added when objects are listed, selected, created, imported, duplicated, or restored. The scene persistence format gains an optional `agentId` on every serialized object/pivot/avatar record. Load accepts old files without the field, assigns IDs after reconstruction, and resolves collisions by minting replacements.

Three.js UUIDs are not used as the public contract because cloning and deserialization change them.

### 4. Companion is the single local authority

`server/agent/companion.js` owns an HTTP server bound to `127.0.0.1`, upgrades the browser bridge to WebSocket, tracks the most recently active authenticated session, exposes assistant endpoints, and mounts a stateless Streamable HTTP MCP endpoint.

Authentication uses:

- `RETROVISOR_AGENT_TOKEN`, generated for `npm run agent:dev` when absent and passed to both Vite and the companion.
- `Origin` allowlisting for the browser bridge.
- Bearer authentication for local HTTP APIs and the MCP HTTP endpoint.
- Per-request correlation IDs, timeouts, maximum payload sizes, and a strict command allowlist.

The token may be visible to the local Retrovisor tab but provider keys remain only in companion environment variables. The token is a loopback capability, not an account credential.

### 5. STDIO MCP is a thin authenticated adapter

`server/agent/mcp-stdio.js` exposes the catalog through the official SDK and forwards calls to the running companion's internal tool endpoint. It writes protocol data only to stdout and diagnostics only to stderr. This keeps one active-session router even when several MCP clients connect.

The companion exposes Streamable HTTP at `/mcp`. A fresh SDK server/transport is created per stateless request, appropriate for this API-style local service.

### 6. Semantic tools stay at twenty

The initial catalog exposes twenty tools by combining related operations:

- Status/reads: application status, scene summary, object list/detail, selection, serialization, and selected export.
- Mutations: selection, primitive/template creation, object-definition import, transform, appearance, grouping/ungrouping, duplication, deletion, undo/redo.
- Visual feedback: viewport capture.

List/detail commands accept limits and depth/detail flags. Large textures, raw SVG markup, and animation arrays are summarized unless explicitly exported. Destructive tools require `confirm: true` and advertise destructive annotations.

### 7. Assistant uses provider-side function calling, not remote MCP

The companion sends the shared catalog as strict function tools to OpenAI Responses or xAI Responses-compatible endpoints. It performs the iterative tool-call loop itself and forwards structured NDJSON events (`status`, `text_delta`, `tool_pending`, `tool_result`, `approval_required`, `done`, `error`) to the browser.

This avoids exposing a localhost MCP endpoint to provider infrastructure and works without tunnels. OpenAI and xAI adapters differ only in endpoint, authorization, defaults, and response normalization. `AbortController` supports cancellation. Conversation history is kept in browser memory and sent per request; provider keys come from `OPENAI_API_KEY` and `XAI_API_KEY`.

### 8. Destructive approval is enforced in two layers

The tool catalog marks destructive tools. The browser executor rejects them without `confirm: true`, even if an adapter is buggy. The in-app provider runner pauses before executing a destructive call, emits an approval event, and resumes only after the browser posts an approval decision. External MCP clients also see destructive annotations and must pass the explicit confirmation field.

### 9. Visual capture is browser-native and bounded

`capture_viewport` renders the current scene, reads the renderer canvas as PNG, and returns dimensions plus a data URL subject to a maximum byte limit. The MCP adapter returns both structured metadata and image content when supported. Tests verify an inspect → mutate → capture → corrective mutate sequence against a real browser.

## Risks / Trade-offs

- **Browser APIs inside existing domain functions** → Keep the agent facade browser-resident and unit-test pure validation/catalog modules separately.
- **Stable IDs added to complex legacy scene types** → Treat IDs as optional in input, preserve them at every serialization branch, and run round-trip/collision tests.
- **One active editor is ambiguous with multiple tabs** → Track explicit activity heartbeats, expose session metadata, and allow an optional session ID on calls while defaulting to the latest active tab.
- **STDIO depends on a running companion** → Return a fast `NO_ACTIVE_COMPANION` error and document the required startup order.
- **Localhost services can be targeted by malicious sites** → Bind only to loopback, require bearer/token handshake, verify Origin, reject oversized payloads, and disable permissive CORS.
- **Provider response formats evolve** → Isolate adapters, use contract fixtures, and surface unsupported response items as structured errors.
- **Full streaming plus approval complicates the loop** → Stream normalized application events rather than leaking provider wire events; keep one request controller and one approval promise per run.
- **Nineteen tools consume context** → Keep descriptions concise and allow the in-app runner to select read-only or editing subsets per turn.
- **No credentials in CI** → Test adapters with mocked fetch and document a manual live-provider check; MCP interoperability itself remains credential-free.

## Migration Plan

1. Add optional ID persistence and the browser command facade without activating the bridge.
2. Add catalog and companion with tests; existing `npm run dev` remains unchanged.
3. Add opt-in `npm run agent:dev`, MCP scripts, and project-local configuration examples.
4. Add the assistant UI behind connection/provider availability states.
5. Run existing verification and new unit/integration/E2E suites.

Rollback consists of removing the new agent modules/service/scripts and ignoring optional `agentId` fields. Existing scenes remain readable because the persistence change is additive.

## Open Questions

None blocking. Public remote access, secure OS credential storage, multiple simultaneously controlled tabs, and richer animation tools are intentionally deferred.
