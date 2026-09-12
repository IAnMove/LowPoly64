## Why

The scene assistant can manipulate objects but cannot reliably inspect its own images or compose and revise an editable character. A conversational character workflow needs complete artifacts, validated generator capabilities, isolated drafts, and explicit model capabilities.

## What Changes

- Preserve image and model artifacts without text truncation across the editor, companion, provider and MCP.
- Expose validated PSX/N64 designs, catalog discovery, semantic body/head/hair/outfit/equipment edits and importable recipes through the existing tool registry.
- Add isolated character drafts with bounded revisions, three-view rendering, structural diagnostics, conflict detection, idempotent operations and one undoable commit.
- Support Ollama and LM Studio alongside API providers, with model-specific connection and capability checks and no automatic cloud fallback.
- Verify the original swordsman demonstration, manual edit preservation and JSON/GLB round trips.

## Capabilities

### New Capabilities

- `conversational-character-design`: Lossless artifacts, semantic character composition, draft review, shared tools and provider capability negotiation.

### Modified Capabilities

None.

## Impact

Agent tool registry, browser command API, companion/provider transport and assistant panel; existing Character Studio generation and character persistence. Adds no geometry engine or credentials in the browser. Existing manually edited models remain valid.
