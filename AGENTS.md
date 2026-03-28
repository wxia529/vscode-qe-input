# AGENTS.md - QE Input Support Extension

## Project Overview

This is a VS Code extension for Quantum ESPRESSO input file support. It provides syntax highlighting, completions, hover docs, and diagnostics for QE input files.

## Build/Lint/Test Commands

```bash
# Compile TypeScript to JavaScript
npm run compile

# Watch mode for development
npm run watch

# Run linting (ESLint)
npm run lint

# Run all tests (unit + vscode-test)
npm test

# Run only unit tests (fast, no VS Code instance needed)
npm run test:unit

# Run specific test file
npx mocha out/test/parser.test.js --require ./stub-vscode.js --timeout 10000 --ui tdd

# Run specific test suite (within a file)
npx mocha out/test/parser.test.js --require ./stub-vscode.js --timeout 10000 --ui tdd --grep "parseAssignments"
```

### Test File Structure
- Test files are in `src/test/` and compile to `out/test/`
- Use `suite()` for test groups and `test()` for individual cases (TDD style)
- Mock vscode objects are used for unit tests; see `createMockDocument()` pattern in parser.test.ts

### Running the Extension for Manual Testing
1. `npm run compile`
2. Open the project in VS Code and press F5 (or run `@vscode/test-cli` via `.vscode-test.mjs`)

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** (`"strict": true` in tsconfig.json)
- Target: ES2022, Module: Node16
- Use explicit return types on exported functions

### Imports
```typescript
// External packages
import * as vscode from 'vscode';

// Internal modules (relative paths)
import { DataStore } from './data-store';
import type { CompletionData } from './types';
```

- Use `import type` for type-only imports to improve compile time
- Use namespace imports sparingly (`import * as assert from 'assert'`)

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `class CompletionProvider` |
| Interfaces/Types | PascalCase | `type CompletionSection` |
| Functions/Variables | camelCase | `function parseAssignments` |
| Constants (module-level) | UPPER_SNAKE_CASE | `const DATA_FILES = {...}` |
| Enum values | PascalCase | `vscode.CompletionItemKind.Property` |
| Files | kebab-case | `completion-provider.ts` |

### Formatting
- **Indentation**: 4 spaces (not tabs)
- **Semicolons**: Required
- **Quotes**: Single quotes preferred (`'string'`)
- **Braces**: K&R style (opening brace on same line)
- **Line length**: Soft limit ~120 characters
- **Trailing commas**: In multiline object/array literals

### Type Annotations
```typescript
// Prefer type inference for local variables
const entries: ParsedEntry[] = [];

// Use explicit return types for exported functions
export function parseAssignments(text: string): ParsedEntry[] {
    // ...
}

// Use interface for object shapes when possible
type CompletionSection = {
    sectionType: string;
    variables: Record<string, CompletionVariable>;
};
```

### Error Handling
```typescript
// Use try-catch for operations that can fail
try {
    await store.reloadData();
    vscode.window.showInformationMessage('Success');
} catch (error) {
    vscode.window.showErrorMessage(`Failed: ${error}`);
}

// Check error type when needed
this.lastLoadError = error instanceof Error ? error.message : String(error);

// Use null returns for expected missing values (not exceptions)
function findEntryAtPosition(...): ParsedEntry | null {
    // return null if not found
}
```

### VS Code Extension Patterns
- **Extension entry point**: `extension.ts` with `activate()` and `deactivate()` functions
- **Provider classes**: Implement VS Code provider interfaces (e.g., `CompletionItemProvider`)
- **Disposable pattern**: Register subscriptions with `context.subscriptions.push()`
- **Configuration access**: Use `vscode.workspace.getConfiguration('qeSupport')` with try-catch for test environments

### Testing Patterns
```typescript
suite('Parser Tests', () => {
    suite('parseAssignments', () => {
        test('should parse namelist section', () => {
            const text = '&CONTROL\ncalculation = "scf"\n/';
            const result = parseAssignments(text);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].section, '& CONTROL');
        });
    });
});

// Mock document pattern for testing
function createMockDocument(lines: string[]): object {
    return {
        getText: () => lines.join('\n'),
        lineCount: lines.length,
        lineAt: (line: number) => ({ text: lines[line] || '' }),
        // ... other required vscode.TextDocument properties
    };
}
```

### File Organization
```
src/
├── extension.ts           # Entry point, registers providers
├── completion-provider.ts # IntelliSense completions
├── hover-provider.ts      # Hover documentation
├── diagnostics-provider.ts# Validation and error reporting
├── parser.ts              # Input file parsing
├── data-store.ts          # JSON data management
├── types.ts               # TypeScript type definitions
├── utils.ts               # Shared utility functions
└── test/
    ├── extension.test.ts
    ├── parser.test.ts
    ├── validation.test.ts
    └── providers.test.ts
```

### ESLint Rules (from eslint.config.mjs)
- `@typescript-eslint/naming-convention`: imports must be camelCase or PascalCase
- `curly`: Braces required for all control statements
- `eqeqeq`: Use `===` and `!==` instead of `==` and `!=`
- `no-throw-literal`: Only throw Error objects (not strings)
- `semi`: Semicolons required

---

## Common Tasks

### Adding a new completion type
1. Add the type definition to `src/types.ts`
2. Update `data-store.ts` to load the new JSON data
3. Update `completion-provider.ts` to provide completions

### Adding a new validation rule
1. Add the validation function to `diagnostics-provider.ts`
2. Call it from `validateEntry()` or create a new validation function
3. Add corresponding test cases in `validation.test.ts`

### Adding a new test
1. Create test in appropriate file under `src/test/` or add to existing suite
2. Use the mock patterns shown above for vscode dependencies
3. Run `npm run compile` before running tests
