## ADDED Requirements

### Requirement: Map picker uses the Floorplan viewer language
The system SHALL expose a floating map-picker from the Floorplan logo inside a locally served map. The picker SHALL use the viewer's theme tokens, menu treatment, responsive behavior, and accessible controls.

#### Scenario: Opening the picker

- **WHEN** a user selects the Floorplan logo on a map registered in a directory
- **THEN** the viewer displays the registered maps in a hierarchical floating menu

### Requirement: Registered maps have explicit opening modes
The system SHALL show every registered map's current server state and SHALL let the user open it as static HTML or request its local server. The system SHALL only start or stop maps registered in the discovered directory index.

#### Scenario: Opening a stopped map with its server

- **WHEN** a user chooses the server mode for a registered map whose server is stopped
- **THEN** the system starts that map's local server and opens its local URL

#### Scenario: Opening static HTML

- **WHEN** a user chooses static mode for a registered map
- **THEN** the system opens that map's existing `index.html` without starting a server

### Requirement: Directory configuration is safe and local
The map server SHALL locate a directory index only from trusted ancestor configuration and SHALL expose only registered map identifiers and derived metadata to the browser. It SHALL reject actions for unknown map identifiers.

#### Scenario: Unknown map operation

- **WHEN** a browser requests a start or stop operation for an identifier absent from the directory index
- **THEN** the server refuses the request without launching or stopping a process

## MODIFIED Requirements

### Requirement: Generate a local directory view
The system SHALL generate a local directory index from a supplied folder root. It SHALL preserve its self-contained static directory page as a fallback, and locally served registered maps SHALL present that same directory through their integrated map-picker.

#### Scenario: Existing directory invoked from a served map

- **WHEN** a directory index contains the currently served map
- **THEN** selecting the Floorplan logo opens the integrated map-picker
