## Purpose
Define procedural template generation and how reusable templates are created and inserted into the scene.

## Requirements

### Requirement: Procedural template generation
The system SHALL provide procedural templates built entirely from Three.js primitives, requiring no external model files. Templates SHALL be defined using the declarative registry format and SHALL include at minimum 20 templates across 5 categories.

#### Scenario: Add any template from registry
- **WHEN** the user clicks any template button in the left panel
- **THEN** the system SHALL build the template from its declarative definition, creating a Group with all pieces positioned and colored as specified

### Requirement: Furniture templates
The template library SHALL include furniture: chair, table, bookshelf, bed, desk, stool.

#### Scenario: Add bookshelf template
- **WHEN** the user clicks "Estanteria"
- **THEN** a Group with shelves (boxes) and side panels (boxes) SHALL be created

#### Scenario: Add bed template
- **WHEN** the user clicks "Cama"
- **THEN** a Group with mattress (box), headboard (box), and legs (cylinders) SHALL be created

### Requirement: Nature templates
The template library SHALL include nature elements: tree (trunk + canopy), rock, bush, mushroom, flower.

#### Scenario: Add tree template
- **WHEN** the user clicks "Arbol"
- **THEN** a Group with trunk (cylinder, brown) and canopy (sphere or cone, green) SHALL be created

#### Scenario: Add rock template
- **WHEN** the user clicks "Roca"
- **THEN** a low-poly sphere with flattened scale and gray color SHALL be created

### Requirement: Architecture templates
The template library SHALL include architecture elements: house, door, window, stairs, fence, bridge.

#### Scenario: Add house template
- **WHEN** the user clicks "Casa"
- **THEN** a Group with walls (box), roof (cone or box rotated), and door hole area (box of different color) SHALL be created

#### Scenario: Add stairs template
- **WHEN** the user clicks "Escalera"
- **THEN** a Group with stepped boxes forming a staircase SHALL be created

### Requirement: Game prop templates
The template library SHALL include game props: chest, potion, sword, shield, torch, lamp post, barrel (existing), crate (existing).

#### Scenario: Add chest template
- **WHEN** the user clicks "Cofre"
- **THEN** a Group with body (box) and lid (box, slightly rotated) with metallic accent pieces SHALL be created

#### Scenario: Add sword template
- **WHEN** the user clicks "Espada"
- **THEN** a Group with blade (scaled box or cone), guard (box), and handle (cylinder) SHALL be created

### Requirement: Character templates
The template library SHALL include characters: basic character (existing), NPC villager, enemy placeholder, animal (dog/cat simple).

#### Scenario: Add NPC template
- **WHEN** the user clicks "NPC Aldeano"
- **THEN** a Group resembling a simple humanoid with hat or distinct clothing color SHALL be created

#### Scenario: Add animal template
- **WHEN** the user clicks "Animal"
- **THEN** a Group with body (scaled box), head (box), 4 legs (cylinders), and tail (small cylinder) SHALL be created

