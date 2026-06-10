## ADDED Requirements

### Requirement: Declarative template format
Each template SHALL be defined as a plain JavaScript object with: `id` (string), `name` (display name), `category` (string), and `pieces` (array of piece definitions). Each piece SHALL have: `geometry` (type + params), `color`, `name`, `position`, `rotation` (optional), `scale` (optional).

#### Scenario: Template definition structure
- **WHEN** a new template is defined in the registry
- **THEN** it SHALL follow the format: `{ id, name, category, pieces: [{ geometry: { type, params }, color, name, position, rotation?, scale? }] }`

### Requirement: Template registry
The system SHALL maintain a central `TEMPLATE_REGISTRY` array containing all template definitions. The `addTemplate(id)` function SHALL look up the template by id and procedurally build the Group from the pieces array.

#### Scenario: Add template from registry
- **WHEN** the user clicks a template button
- **THEN** the system SHALL look up the template id in TEMPLATE_REGISTRY, create a Group, and build each piece from its definition

#### Scenario: Unknown template id
- **WHEN** addTemplate is called with an id not in the registry
- **THEN** nothing SHALL happen and a console warning SHALL be logged

### Requirement: Template categories
Templates SHALL be organized into categories. The UI SHALL display templates grouped by category with collapsible sections.

#### Scenario: Categories displayed
- **WHEN** the left panel loads
- **THEN** templates SHALL be grouped under category headings (e.g., "MOBILIARIO", "NATURALEZA", "ARQUITECTURA", "PROPS", "PERSONAJES")

#### Scenario: Collapse/expand category
- **WHEN** the user clicks a category heading
- **THEN** the category section SHALL toggle between collapsed and expanded

### Requirement: Dynamic UI generation from registry
The template buttons in the left panel SHALL be generated dynamically from TEMPLATE_REGISTRY, not hardcoded in HTML.

#### Scenario: New template appears automatically
- **WHEN** a new template definition is added to TEMPLATE_REGISTRY
- **THEN** a corresponding button SHALL appear in the left panel under the correct category without any HTML changes
