## ADDED Requirements

### Requirement: Assistant panel availability
Retrovisor SHALL provide an assistant panel that can open without a companion or provider credential and SHALL show actionable connection and provider status instead of breaking normal editing.

#### Scenario: Open without companion
- **WHEN** the user opens the assistant while the companion is unavailable
- **THEN** the panel SHALL explain how to start the local service and the rest of Retrovisor SHALL remain usable

#### Scenario: Open without API keys
- **WHEN** the companion is connected but neither provider is configured
- **THEN** the panel SHALL show safe environment-variable instructions without requesting or storing a key in the browser

### Requirement: Shared tool execution
The assistant SHALL use the same tool catalog, validation, browser executor, and safety metadata as MCP rather than implementing provider-specific scene actions.

#### Scenario: Assistant changes a transform
- **WHEN** a provider requests `update_object_transform`
- **THEN** the request SHALL pass through the same companion and browser command path used by the MCP adapters

### Requirement: Provider abstraction
The companion SHALL support OpenAI Responses and xAI/Grok Responses-compatible providers behind one normalized interface with provider-specific endpoint, authorization, model default, and response parsing.

#### Scenario: Select an available provider
- **WHEN** the user selects a configured provider and sends a message
- **THEN** the companion SHALL use only that provider's server-side credential and normalized tool loop

#### Scenario: Provider returns multiple tool calls
- **WHEN** a response contains one or more function calls
- **THEN** the runner SHALL validate and execute each allowed call, return correlated outputs to the provider, and continue until text, another tool round, cancellation, or the configured turn limit

### Requirement: Streaming normalized events
The assistant SHALL stream normalized status, text, tool activity, approval, completion, and error events to the panel while hiding provider-specific wire details.

#### Scenario: Observe tool activity
- **WHEN** the model invokes a scene tool
- **THEN** the panel SHALL show the tool name, pending state, and summarized result before or alongside the final assistant message

### Requirement: Conversation history and cancellation
The panel SHALL keep session history in browser memory, SHALL allow the user to clear it, and SHALL allow an in-flight provider run to be cancelled.

#### Scenario: Cancel a run
- **WHEN** the user presses stop during a provider request
- **THEN** the companion SHALL abort the provider request, stop new tool calls, release pending approvals, and emit a cancelled terminal event

### Requirement: Destructive-action approval
The assistant runner SHALL pause before a destructive tool execution and SHALL require an explicit approval decision from the user; denial SHALL be returned to the model as a tool error.

#### Scenario: Approve deletion
- **WHEN** the model requests deletion and the user approves the displayed target IDs
- **THEN** the runner SHALL execute the call with confirmation and continue the tool loop

#### Scenario: Deny deletion
- **WHEN** the user denies or cancels the approval
- **THEN** no objects SHALL be deleted and the model SHALL receive a structured denial result

### Requirement: Bounded assistant autonomy
The provider runner SHALL enforce a maximum tool-round count, maximum tool output size, command allowlist, and no automatic expansion into shell, filesystem, network, or reset-scene capabilities.

#### Scenario: Tool loop exceeds its bound
- **WHEN** the model continues requesting tools beyond the configured maximum
- **THEN** the runner SHALL stop with a clear bounded-loop error and SHALL not execute additional calls
