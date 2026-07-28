# Validation and final audit

Validated on Windows in `I:\retrovisor_codex` on 2026-07-24.

## Automated results

- `npm run test:unit`: 47 tests passed after the integration was added.
- `npm run test:agent`: agent schemas, stable IDs, bridge, provider loop,
  approvals, cancellation, bounds, and assistant endpoint tests passed.
- `npm run test:mcp`: 4 protocol tests passed, including initialization,
  twenty-tool discovery, calls, validation/destructive errors, image content,
  no active editor, and a real child-process STDIO adapter.
- `npm run test:agent:e2e`: passed in 2.82 seconds against a real Vite +
  Chromium + Three.js tab. It covered inspect, create, select, transform,
  capture, corrective transform, undo/redo, destructive confirmation,
  deletion restore, disconnect, and reconnect.
- `npm run build`: passed. The main entry remained approximately its previous
  size; agent and assistant code are lazy chunks.
- `npm run audit:code-size`: informational existing oversized files only; no
  new agent file crossed the warning threshold.
- `git diff --check`: passed.
- Codex CLI 0.145.0 parsed the STDIO example through command-line-only config
  overrides without modifying personal configuration.

`npm run verify` passed the then-current 46 tests, release readiness, mold proportions,
character examples, standard clips, generated heads, 180 sprite checks, and
299 template audits. Its pre-existing avatar visual audit loaded the app and
completed geometry inspection, but Chromium screenshot capture timed out after
240 seconds under this host's software renderer. The dedicated agent E2E passed
without the trace/screenshot reporter overhead.

`npm audit --offline --json` reported no cached advisories. A live
`npm audit --json` was not permitted because it would disclose the dependency
graph to an external registry without separate user authorization. The install
summary had reported four advisories, so a live audit remains a recommended
follow-up rather than being represented as clean.

## Credential-gated checks

No provider API keys were supplied. OpenAI and xAI network calls were therefore
validated with mocked Responses API streams, including function calls, true
text deltas, visual image feedback, approval denial, cancellation, and turn
limits. A manual billed turn for each configured provider remains necessary to
verify account/model availability.

## Security and compatibility audit

- Loopback binding is enforced; non-loopback host configuration is rejected.
- Browser config and WebSocket upgrades use an exact Origin allowlist.
- WebSocket, command HTTP, and MCP HTTP paths require the shared local token.
- STDIO writes protocol messages only to stdout; diagnostics use stderr.
- Provider keys are read only from Node environment variables.
- No key, scene, prompt, or full tool payload is logged.
- Tool names are allowlisted by the shared catalog and inputs use closed,
  bounded schemas with semantic no-op validation.
- The catalog exposes no filesystem, shell, arbitrary URL fetch, or JavaScript
  evaluation capability.
- Destructive deletion requires `confirm=true`; the assistant adds a separate
  pending human approval gate.
- Untrusted names/metadata/tool output are sanitized, bounded, marked as
  untrusted, and framed by provider/MCP instructions against prompt injection.
- Viewport bytes are bounded. MCP emits image content, while provider loops use
  a vision input and omit raw base64 from textual function output.
- Multi-tab routing prefers visible/recent activity and supports explicit
  session targeting, heartbeat expiry, disconnect cleanup, and timeouts.
- Stable IDs are collision-repaired, round-trip in persistence, and are cleared
  from clones before reassignment.

Known MVP limitations are documented in `docs/retrovisor-agent.md`: no public
tunnel, SaaS, multiuser remote service, protection from a compromised same-user
workstation, or automatic provider billing/availability test.
