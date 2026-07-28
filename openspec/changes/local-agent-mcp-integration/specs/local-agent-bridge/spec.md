## ADDED Requirements

### Requirement: Loopback-only companion service
The companion service SHALL listen on an explicitly configured loopback address by default and SHALL refuse non-loopback binding unless a future separately authorized mode is implemented.

#### Scenario: Start with default configuration
- **WHEN** the companion starts without a host override
- **THEN** it SHALL bind to `127.0.0.1` and report its local port without exposing a public interface

### Requirement: Authenticated browser handshake
The browser bridge SHALL verify an allowlisted Retrovisor origin and a local capability token before registering an editor session.

#### Scenario: Connect an authorized editor
- **WHEN** a Retrovisor tab presents the current token from an allowlisted local origin
- **THEN** the companion SHALL register a session and return a unique session ID

#### Scenario: Reject a foreign origin or token
- **WHEN** a WebSocket handshake has a disallowed origin or invalid token
- **THEN** the companion SHALL reject it without registering a session or revealing sensitive configuration

### Requirement: Active session lifecycle
The companion SHALL track authenticated editor sessions, heartbeats, last activity, and disconnection, and SHALL route commands to an explicit session or the most recently active healthy session.

#### Scenario: No editor is connected
- **WHEN** a tool call arrives while no healthy editor session exists
- **THEN** the companion SHALL return `NO_ACTIVE_EDITOR` promptly

#### Scenario: Active editor reconnects
- **WHEN** a tab loses the bridge connection and reconnects with valid authentication
- **THEN** it SHALL receive a fresh transport session and become available without reloading the scene

#### Scenario: Multiple tabs are connected
- **WHEN** no explicit session ID is supplied and several tabs are healthy
- **THEN** the companion SHALL route to the most recently active tab and report the chosen session in the result

### Requirement: Correlated bounded command transport
Every bridge request SHALL have a correlation ID, timeout, maximum payload size, and exactly one success or error response.

#### Scenario: Browser command times out
- **WHEN** the browser does not answer within the configured timeout
- **THEN** the companion SHALL reject the pending request with `COMMAND_TIMEOUT` and release its correlation state

### Requirement: Provider secret isolation
OpenAI and xAI credentials SHALL be read only by the companion process from environment configuration and SHALL never be sent to the browser, bundled by Vite, logged, or stored in localStorage.

#### Scenario: Inspect browser configuration without credentials
- **WHEN** the assistant panel queries provider availability
- **THEN** it SHALL receive only provider names, configured status, and safe model defaults

### Requirement: Prompt-injection boundary
Scene-derived names, metadata, imported definitions, and tool results SHALL be treated as untrusted data and SHALL not be interpreted as system instructions by the companion.

#### Scenario: Object name contains instructions
- **WHEN** an object name contains text requesting a hidden action or policy override
- **THEN** the name SHALL remain quoted data in tool output and SHALL not change the tool allowlist, approval rules, or assistant instructions
