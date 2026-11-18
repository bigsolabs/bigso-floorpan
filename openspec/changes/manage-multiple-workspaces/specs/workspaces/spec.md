## ADDED Requirements

### Requirement: Multiple workspace roots
The launcher SHALL persist multiple workspace roots and identify one as active. Existing single-root settings SHALL be migrated to one workspace without losing the configured root.

#### Scenario: Add a workspace
- **WHEN** the user configures a new valid folder as a workspace
- **THEN** the launcher SHALL persist it in the workspace list, make it active, and show maps discovered beneath it

#### Scenario: Switch workspace
- **WHEN** the user selects a saved workspace
- **THEN** the launcher SHALL scan that workspace and show only its maps and server statuses

### Requirement: Choose workspace folder
The launcher SHALL offer a native folder-selection dialog where supported and SHALL retain a manual path field as a fallback.

#### Scenario: Browse for a folder
- **WHEN** the user invokes the folder picker
- **THEN** the operating system SHALL let the user select a folder and the launcher SHALL populate its absolute path

#### Scenario: Cancel folder selection
- **WHEN** the user cancels the native picker
- **THEN** the current workspace configuration SHALL remain unchanged

#### Scenario: Configure a workspace root
- **WHEN** the user saves a valid folder path for the active workspace
- **THEN** the launcher SHALL persist the root and rescan that workspace
