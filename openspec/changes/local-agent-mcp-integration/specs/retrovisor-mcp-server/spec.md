## ADDED Requirements

### Requirement: MCP server interoperability
The system SHALL expose the Retrovisor tool catalog through the production-recommended stable official MCP TypeScript SDK over STDIO and local Streamable HTTP transports.

#### Scenario: Initialize over STDIO
- **WHEN** Codex, Grok CLI, or another compatible client spawns the STDIO entry point
- **THEN** the server SHALL initialize without writing non-protocol output to stdout and SHALL advertise tool capability and server instructions

#### Scenario: Initialize over Streamable HTTP
- **WHEN** an authenticated local client connects to the `/mcp` endpoint
- **THEN** the endpoint SHALL negotiate MCP and expose the same tool names and schemas as STDIO

### Requirement: Agent-oriented MCP tool catalog
The MCP server SHALL expose status, scene inspection, object inspection, selection, creation, import, transform, appearance, grouping, duplication, deletion, history, capture, serialization, and selected-object export as no more than twenty initially available semantic tools.

#### Scenario: List tools
- **WHEN** a client calls `tools/list`
- **THEN** the result SHALL include the documented initial Retrovisor tools with JSON Schemas and read-only/destructive/idempotent annotations

#### Scenario: Call a scene read tool
- **WHEN** a client calls `get_scene_summary` while an editor is active
- **THEN** the server SHALL forward the command and return compact structured scene data

### Requirement: MCP safety boundary
The MCP server SHALL not expose filesystem access, shell execution, arbitrary network requests, arbitrary DOM access, or JavaScript evaluation.

#### Scenario: Inspect available tools
- **WHEN** a client lists every MCP tool
- **THEN** no tool SHALL accept a file path, shell command, script, URL to fetch, or unrestricted method name

### Requirement: MCP destructive annotations and confirmation
Destructive MCP tools SHALL advertise destructive behavior and SHALL still require explicit confirmation in their validated input.

#### Scenario: MCP client invokes deletion without confirmation
- **WHEN** a client bypasses its own approval UI and calls `delete_objects` without confirmation
- **THEN** Retrovisor SHALL reject the call without deleting objects

### Requirement: Viewport image feedback
The `capture_viewport` tool SHALL capture the rendered Retrovisor viewport and return bounded image metadata and image content suitable for a vision-capable MCP client.

#### Scenario: Capture a connected editor
- **WHEN** a client calls `capture_viewport` after a scene mutation
- **THEN** the result SHALL contain a PNG capture with dimensions and SHALL omit unrelated editor secrets or provider credentials

### Requirement: Visual correction workflow
The MCP integration SHALL support a tested sequence in which a client inspects a scene, performs a mutation, captures the viewport, and performs a corrective mutation based on the observed result.

#### Scenario: Correct object placement after capture
- **WHEN** a test client creates or moves an object, captures the viewport, and sends a second transform command
- **THEN** the final scene SHALL reflect the correction and undo SHALL restore the state before the corrective command

### Requirement: Client configuration examples
The project SHALL provide copyable project-scoped examples for Codex and Grok without editing global user configuration.

#### Scenario: Configure a local client
- **WHEN** a developer follows the documented example
- **THEN** the client SHALL start the STDIO adapter with the required companion URL and token environment variables
