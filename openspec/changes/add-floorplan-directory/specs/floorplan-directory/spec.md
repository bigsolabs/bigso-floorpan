## ADDED Requirements

### Requirement: Discover existing maps from a folder root
The system SHALL accept a folder root and recursively discover descendant `floorplan` folders that contain a readable, valid `graph.json`. It SHALL inspect map metadata only and SHALL NOT scan source code to build the directory.

#### Scenario: Multiple project maps are present

- **WHEN** the supplied root contains valid maps in separate descendant projects
- **THEN** the generated directory lists every valid map once with its relative location and metadata

#### Scenario: A folder named floorplan is not a map

- **WHEN** a descendant `floorplan` folder lacks a readable valid `graph.json`
- **THEN** the directory excludes it and continues discovering other maps

### Requirement: Respect safe traversal boundaries
The system SHALL not follow symbolic links and SHALL skip dependency, build, cache, and hidden directories while discovering maps. It SHALL stop descending into a valid map folder.

#### Scenario: Ignored directories contain map-like content

- **WHEN** a map-like folder exists under an ignored dependency or hidden directory
- **THEN** it is not listed in the directory

### Requirement: Generate a local directory view
The system SHALL generate a self-contained HTML directory page with a navigable relative-path tree and a map card for each discovered map. Each card SHALL display the map name, relative project location, generated time, and file and node counts when available.

#### Scenario: Opening a discovered map

- **WHEN** a user selects a map card in the directory page
- **THEN** the browser navigates to that map's existing `index.html` using a relative local path

### Requirement: Keep directory output separate from projects
The system SHALL write directory output to an explicit `--out` directory when provided, or to `<root>/.floorplan-directory` otherwise. Generated output SHALL include its own `.gitignore` and SHALL NOT alter a discovered map or source file.

#### Scenario: Custom output directory

- **WHEN** the user invokes the command with `--out <directory>`
- **THEN** the directory page and index are written there instead of the default output directory
