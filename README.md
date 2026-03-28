# QE Input Support

VS Code extension for Quantum ESPRESSO input file support. Provides syntax highlighting, intelligent completions, hover documentation, and validation diagnostics for QE input files.

## Features

### Syntax Highlighting
- Recognizes QE input file extensions: `.in`, `.pwi`, `.pw`
- Language ID: `qe-input`

### Intelligent Completion
- **Section completion**: Type `&` to see available namelist sections (CONTROL, SYSTEM, ELECTRONS, etc.)
- **Variable completion**: After entering a section, type a variable name to see available variables
- **Value completion**: Type `=` after a variable to see allowed values/options
- **Card completion**: Type a card name (e.g., `ATOMIC_POSITIONS`) followed by a space to see card options

### Hover Documentation
- Variable descriptions from QE documentation
- Default values
- Allowed ranges (where documented)
- Units information

### Advanced Diagnostics
- **Invalid options**: Warns when a value is not in the allowed options list
- **Range violations**: Warns when numeric values are outside allowed ranges
- **Type validation**: Validates integer, real, logical, and string types
- **Duplicate detection**: Warns when the same variable is defined multiple times in a section
- **Dependency validation**: Warns when a variable requires another parameter to be set
- **Section closure checking**: Warns when sections are not properly closed with `/`

### Code Snippets
- Pre-defined snippets for common namelist sections

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
3. Type `Extensions: Install from VSIX`
4. Select the `.vsix` file

Or install from the VS Code Marketplace (when published).

## Usage

1. Open a QE input file (extension `.in`, `.pwi`, `.pw`) or set the language to `QE Input`
2. Type `&` to insert namelist sections
3. Type a variable name and `=` to see value completions
4. Hover over a variable for documentation
5. Diagnostics appear automatically for invalid values

## Commands

| Command | Description |
|---------|-------------|
| `QE Support: Reload QE Data` | Reload the completion data from JSON files |
| `QE Support: Check Data Status` | Display current data status and statistics |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `qeSupport.completion.enabled` | `true` | Enable intelligent completion |
| `qeSupport.diagnostics.enabled` | `true` | Enable validation and diagnostics |
| `qeSupport.hover.enabled` | `true` | Enable hover documentation |
| `qeSupport.dataPath` | `""` | Custom path to QE JSON data files (leave empty for bundled data) |

## Supported Sections

- `&CONTROL` - Calculation control parameters
- `&SYSTEM` - System definition (lattice, atoms, etc.)
- `&ELECTRONS` - Electron-related options
- `&IONS` - Ion-related options
- `&CELL` - Cell-related options
- And more...

## Data Sources

The completion and diagnostic data are derived from the Quantum ESPRESSO input documentation and curated for common workflows.

## Known Issues

- Some variables/options may be missing or overly strict; please report issues with example inputs
- Card option validation is limited to documented options and does not interpret complex expressions
- Custom data path must be an absolute path to a directory containing the JSON data files

## Contributing

Issues and pull requests are welcome. When reporting data errors, please include:
- A minimal QE input example
- The expected vs actual behavior
- The QE version you are using

## License

MIT
