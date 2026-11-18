## ADDED Requirements

### Requirement: Launcher root has no diagram
The system SHALL show a branded launcher at `/` with no project graph or diagram until a map is selected.

#### Scenario: Opening the launcher root

- **WHEN** a user opens the directory server root URL
- **THEN** the system shows the launcher welcome state and no project diagram

### Requirement: Browse maps in a hamburger tree
The system SHALL provide a hamburger menu with a hierarchical tree of registered projects and current server status for each map.

#### Scenario: Selecting a project

- **WHEN** a user selects a project in the tree
- **THEN** the system opens that project under an internal `/map/<id>` route

### Requirement: Configure the parent folder
The system SHALL let a user enter and save a parent folder path, validate that it is accessible, and refresh the registered map list from that folder.

#### Scenario: Saving a valid folder

- **WHEN** a user saves an accessible folder containing valid Floorplan maps
- **THEN** the launcher stores the folder setting and displays the discovered maps in its tree

### Requirement: Open maps through the launcher server
The system SHALL let the user open a registered map in server mode or static mode. Server mode SHALL proxy through the internal map route; static mode SHALL serve that map's existing HTML without starting its server.

#### Scenario: Opening with local server

- **WHEN** a user selects server mode for a registered map
- **THEN** the system starts or reuses the map's server and opens the map through `/map/<id>`

#### Scenario: Opening as static HTML

- **WHEN** a user selects static mode for a registered map
- **THEN** the system opens the map through `/map/<id>/static/` without starting a process

### Requirement: Control only registered map servers
The system SHALL start or stop servers only for maps in the current directory registry and SHALL reject unknown IDs.

#### Scenario: Unknown map ID

- **WHEN** the browser requests a server action for an unknown map ID
- **THEN** the launcher refuses the action and starts or stops no process
