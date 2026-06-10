## MODIFIED Requirements

### Requirement: Declarative template format
Each template SHALL be defined as a plain JavaScript object with: `id` (string), `name` (display name), `category` (string), and `pieces` (array of piece definitions). Each piece SHALL have: `geometry` (type + params), `color`, `name`, `position`, `rotation` (optional), `scale` (optional).

Additionally, templates MAY use the new CharacterModel format with `archetype`, `slots`, and `animationProfile` fields instead of flat `pieces[]`. The template registry SHALL detect which format a template uses and handle both.

#### Scenario: Template definition structure (legacy)
- **WHEN** a new template is defined in the registry with flat `pieces[]`
- **THEN** it SHALL follow the format: `{ id, name, category, pieces: [{ geometry: { type, params }, color, name, position, rotation?, scale? }] }`

#### Scenario: Template definition structure (CharacterModel)
- **WHEN** a new template is defined with `archetype` and `slots`
- **THEN** it SHALL follow the CharacterModel format and be converted to internal pieces when loaded

### Requirement: Template registry
The system SHALL maintain a central `TEMPLATE_REGISTRY` array containing all template definitions. The `addTemplate(id)` function SHALL look up the template by id and procedurally build the Group from the pieces array.

For templates in CharacterModel format, `addTemplate` SHALL convert the CharacterModel to pieces, build the group, and store archetype metadata in the group's userData.

#### Scenario: Add template from registry
- **WHEN** the user clicks a template button
- **THEN** the system SHALL look up the template id in TEMPLATE_REGISTRY, create a Group, and build each piece from its definition

#### Scenario: Add CharacterModel template
- **WHEN** the user clicks a template that uses CharacterModel format
- **THEN** the system SHALL convert it to pieces, build the group, apply skeleton/animation profile, and store archetype metadata in userData

#### Scenario: Unknown template id
- **WHEN** addTemplate is called with an id not in the registry
- **THEN** nothing SHALL happen and a console warning SHALL be logged
