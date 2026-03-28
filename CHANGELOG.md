# Change Log

All notable changes to the "qe-input-support" extension will be documented in this file.

## [0.0.1] - 2026-02-14

### Added
- Initial release
- **Syntax Highlighting**: Support for QE input files (`.in`, `.pwi`, `.pw`)
- **Intelligent Completion**:
  - Section name completion (type `&` to see available sections)
  - Variable completion within sections
  - Value completion for variables with defined options
  - Card option completion (ATOMIC_POSITIONS, etc.)
- **Hover Documentation**:
  - Variable descriptions
  - Default values
  - Allowed ranges
  - Units information
- **Diagnostics/Validation**:
  - Invalid options detection
  - Range violation warnings
  - Type validation (integer, real, logical, string)
  - Duplicate variable detection
  - Dependency validation between parameters
  - Section closure checking (unclosed sections, stray `/`)
- **Code Snippets**: Pre-defined snippets for common namelists
- **Commands**:
  - `QE Support: Reload QE Data`
  - `QE Support: Check Data Status`
- **Configuration**:
  - `qeSupport.completion.enabled`
  - `qeSupport.diagnostics.enabled`
  - `qeSupport.hover.enabled`
  - `qeSupport.dataPath` (for custom data files)
