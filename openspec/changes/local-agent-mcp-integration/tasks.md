## 1. Foundation and contracts

- [x] 1.1 Add the stable official MCP SDK, schema-validation, and WebSocket runtime dependencies and agent-related npm scripts
- [x] 1.2 Implement the shared plain-data tool catalog with twenty bounded tools, JSON Schemas, safety annotations, and output metadata
- [x] 1.3 Implement reusable schema validation, payload limits, structured result/error envelopes, and untrusted-data sanitization
- [x] 1.4 Add unit tests for the catalog, strict schemas, safety metadata, validation errors, and output bounds

## 2. Browser command API

- [x] 2.1 Implement stable agent ID assignment, lookup, collision repair, clone handling, and scene normalization
- [x] 2.2 Extend every relevant scene persistence branch to round-trip optional agent IDs and remain compatible with legacy scenes
- [x] 2.3 Implement bounded scene summaries, object listing/detail, selection reporting, scene serialization, and selected-object export
- [x] 2.4 Implement selection, primitive creation, template creation, and object-definition import commands
- [x] 2.5 Implement atomic transform and appearance commands with validation, UI synchronization, and undo/redo
- [x] 2.6 Implement grouping, ungrouping, duplication, confirmed deletion, undo, and redo commands
- [x] 2.7 Implement bounded browser-native viewport capture and normalized command dispatch
- [x] 2.8 Add unit/integration tests for stable IDs, persistence, read commands, mutations, destructive confirmation, and undo/redo

## 3. Local companion and browser bridge

- [x] 3.1 Implement loopback configuration, generated/shared local token handling, safe provider-status reporting, and origin allowlisting
- [x] 3.2 Implement the companion HTTP server and authenticated WebSocket upgrade path with payload limits
- [x] 3.3 Implement active editor session registration, heartbeats, activity routing, explicit session targeting, disconnect cleanup, and timeouts
- [x] 3.4 Implement the browser bridge client with authenticated connect, reconnect backoff, heartbeat, activity signals, and correlated command responses
- [x] 3.5 Wire the browser bridge into application startup without affecting standalone editor behavior
- [x] 3.6 Add integration tests for authentication, no-active-editor behavior, routing, timeout, disconnect, and reconnect

## 4. MCP transports

- [x] 4.1 Implement the official-SDK MCP server factory with instructions, tools/list metadata, tools/call routing, structured content, and image results
- [x] 4.2 Implement the STDIO adapter that forwards authenticated calls to the running companion and keeps stdout protocol-clean
- [x] 4.3 Mount an authenticated stateless Streamable HTTP MCP endpoint on the companion
- [x] 4.4 Add MCP protocol tests for initialize, tools/list, successful tools/call, validation failure, destructive rejection, and no active editor
- [x] 4.5 Add project-scoped Codex and Grok configuration examples and run a real local MCP client interoperability check

## 5. Provider runner and assistant panel

- [x] 5.1 Implement the provider-neutral bounded function-calling loop with normalized streaming events, cancellation, and tool-output limits
- [x] 5.2 Implement OpenAI Responses and xAI Responses-compatible adapters using server-side environment credentials
- [x] 5.3 Implement pending destructive approval state, approve/deny endpoints, timeout, and cancellation cleanup
- [x] 5.4 Implement injectable assistant HTML/CSS with connection/provider status, provider/model selection, chat history, input, stop/clear controls, tool activity, and approval UI
- [x] 5.5 Implement assistant browser behavior for NDJSON streaming, in-memory history, cancellation, approvals, and graceful missing-service/key states
- [x] 5.6 Add mocked provider-loop and assistant endpoint tests, including multiple calls, approval, denial, cancellation, and turn-limit behavior

## 6. End-to-end validation and documentation

- [x] 6.1 Add E2E coverage for connect, inspect, create/select/transform, capture, corrective transform, delete confirmation, undo/redo, and reconnection
- [x] 6.2 Add a local agent development runner that starts Vite and the companion with one ephemeral token and shuts both down cleanly
- [x] 6.3 Document architecture, trust model, environment variables, startup order, MCP client setup, assistant usage, troubleshooting, and credential-required manual checks
- [x] 6.4 Update the main README with the local agent workflow while preserving existing setup and usage documentation
- [x] 6.5 Run unit, integration, MCP, E2E, existing repository verification, production build, and code-size audit; fix regressions
- [x] 6.6 Perform and document a final security/compatibility audit against the OpenSpec scenarios and definition of done
