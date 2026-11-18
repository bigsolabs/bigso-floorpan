## ADDED Requirements

### Requirement: Remove a saved workspace
The launcher SHALL allow a user to remove a saved workspace entry without deleting or modifying the folder at its configured path. The launcher SHALL retain at least one workspace.

#### Scenario: Remove an inactive workspace
- **WHEN** the user confirms removal of a saved inactive workspace
- **THEN** the launcher SHALL remove that entry and leave the active workspace and its maps unchanged

#### Scenario: Remove the active workspace
- **WHEN** the user confirms removal of the active workspace and another workspace exists
- **THEN** the launcher SHALL activate and scan another saved workspace

#### Scenario: Attempt to remove the last workspace
- **WHEN** the user attempts to remove the only configured workspace
- **THEN** the launcher SHALL reject the action and preserve that workspace

### Requirement: Browse the directory tree
The launcher SHALL present workspace project folders as an understandable, keyboard-accessible hierarchy with expandable and collapsible directory branches and a distinct selected map state.

#### Scenario: Collapse a folder branch
- **WHEN** the user activates a folder disclosure control
- **THEN** the launcher SHALL collapse or expand that branch and expose its state through `aria-expanded`

#### Scenario: Use light or dark theme
- **WHEN** the user changes the launcher theme
- **THEN** the tree hierarchy, selected row, hover state, and disclosure controls SHALL remain legible in that theme
