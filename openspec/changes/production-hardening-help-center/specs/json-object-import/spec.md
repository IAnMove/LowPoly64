## MODIFIED Requirements

### Requirement: JSON validation on import
The system SHALL validate object JSON before building any geometry. Validation SHALL include supported geometry type, correct numeric tuple formats, finite numeric values, and reasonable bounds for geometry segment counts and imported object size.

#### Scenario: Reject invalid numeric tuples
- **WHEN** a piece contains `"position": ["x", 0, 0]` or non-finite numeric values
- **THEN** the system SHALL reject the import and display a validation error

#### Scenario: Reject excessive geometry complexity
- **WHEN** a piece requests extremely high segment counts or the document exceeds the supported piece limit
- **THEN** the system SHALL reject the import before creating Three.js geometry

### Requirement: Safe rendering of imported metadata
Imported object or animation metadata originating from JSON SHALL be rendered as text, not injected as HTML.

#### Scenario: Animation name contains HTML
- **WHEN** an imported animation is named `"<img src=x onerror=alert(1)>"`
- **THEN** the system SHALL display the literal text and SHALL NOT execute markup or script
