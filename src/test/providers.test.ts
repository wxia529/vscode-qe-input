import * as assert from 'assert';
import * as vscode from 'vscode';
import { CompletionProvider } from '../completion-provider';
import { HoverProvider } from '../hover-provider';
import { DataStore } from '../data-store';
import type { CompletionData, CompletionSection, RangeData } from '../types';

suite('Provider Tests', () => {
	let mockStore: MockDataStore;

	setup(() => {
		mockStore = new MockDataStore();
	});

	suite('CompletionProvider', () => {
		suite('provideCompletionItems - sections', () => {
			test('complete section keywords', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['&']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 1));
				assert.ok(items.length > 0);
				const sectionItem = items.find((item) => item.label === '& CONTROL');
				assert.ok(sectionItem);
				assert.strictEqual(sectionItem?.kind, vscode.CompletionItemKind.Keyword);
			});

			test('complete section with insert text', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['&']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 1));
				const sectionItem = items.find((item) => item.label === '& CONTROL');
				assert.strictEqual(sectionItem?.insertText, '& CONTROL');
			});

			test('complete section with detail', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['&']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 1));
				const sectionItem = items.find((item) => item.label === '& CONTROL');
				assert.strictEqual(sectionItem?.detail, 'namelist');
			});
		});

		suite('provideCompletionItems - variables', () => {
			test('complete variables in section', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', '']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 0));
				assert.ok(items.length > 0);
				const calcItem = items.find((item) => item.label === 'calculation');
				assert.ok(calcItem);
				assert.strictEqual(calcItem?.kind, vscode.CompletionItemKind.Property);
			});

			test('complete variables with type detail', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', '']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 0));
				const calcItem = items.find((item) => item.label === 'calculation');
				assert.strictEqual(calcItem?.detail, 'CHARACTER');
			});

			test('complete variables with documentation', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', '']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 0));
				const calcItem = items.find((item) => item.label === 'calculation');
				assert.ok(calcItem?.documentation);
			});

			test('return empty when not in section', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['calculation = "scf"']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 0));
				assert.strictEqual(items.length, 0);
			});

			test('return empty when store has no data', () => {
				const emptyStore = new MockDataStore();
				emptyStore.setCompletionData(null);
				const provider = new CompletionProvider(emptyStore);
				const doc = createMockDocument(['& CONTROL', '']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 0));
				assert.strictEqual(items.length, 0);
			});
		});

		suite('provideCompletionItems - values', () => {
			test('complete values for variable with options', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'calculation = ']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 15));
				assert.ok(items.length > 0);
				const scfItem = items.find((item) => item.label === '"scf"');
				assert.ok(scfItem);
				assert.strictEqual(scfItem?.kind, vscode.CompletionItemKind.Value);
			});

			test('complete values with detail', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'calculation = ']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 15));
				const scfItem = items.find((item) => item.label === '"scf"');
				assert.strictEqual(scfItem?.detail, 'CHARACTER');
			});

			test('return empty for variable without options', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'verbosity = ']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 14));
				assert.strictEqual(items.length, 0);
			});

			test('return empty for unknown variable', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'unknown = ']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(1, 12));
				assert.strictEqual(items.length, 0);
			});
		});

		suite('provideCompletionItems - cards', () => {
			test('complete card options', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['ATOMIC_SPECIES']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 14));
				assert.ok(items.length > 0);
			});

			test('complete card with parentheses', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['ATOMIC_SPECIES(']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 15));
				const item = items[0];
				if (item) {
					assert.strictEqual(item.insertText, 'Si)');
				}
			});

			test('complete card without parentheses', () => {
				const provider = new CompletionProvider(mockStore);
				const doc = createMockDocument(['ATOMIC_SPECIES']);
				const items = provider.provideCompletionItems(doc as unknown as vscode.TextDocument, new vscode.Position(0, 14));
				const item = items[0];
				if (item) {
					assert.ok(!String(item.insertText).includes(')'));
				}
			});
		});
	});

	suite('HoverProvider', () => {
		suite('provideHover', () => {
			test('hover on variable', () => {
				const provider = new HoverProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'calculation = "scf"']);
				const hover = provider.provideHover(doc as unknown as vscode.TextDocument, new vscode.Position(1, 5));
				assert.ok(hover);
			});

			test('hover returns null outside variable', () => {
				const provider = new HoverProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'calculation = "scf"']);
				const hover = provider.provideHover(doc as unknown as vscode.TextDocument, new vscode.Position(0, 5));
				assert.strictEqual(hover, null);
			});

			test('hover returns null for unknown variable', () => {
				const provider = new HoverProvider(mockStore);
				const doc = createMockDocument(['& CONTROL', 'unknown = "value"']);
				const hover = provider.provideHover(doc as unknown as vscode.TextDocument, new vscode.Position(1, 5));
				assert.strictEqual(hover, null);
			});

			test('hover returns null when no data', () => {
				const emptyStore = new MockDataStore();
				emptyStore.setCompletionData(null);
				const provider = new HoverProvider(emptyStore);
				const doc = createMockDocument(['& CONTROL', 'calculation = "scf"']);
				const hover = provider.provideHover(doc as unknown as vscode.TextDocument, new vscode.Position(1, 5));
				assert.strictEqual(hover, null);
			});

			test('hover includes range info', () => {
				const provider = new HoverProvider(mockStore);
				const doc = createMockDocument(['& SYSTEM', 'ibrav = 2']);
				const hover = provider.provideHover(doc as unknown as vscode.TextDocument, new vscode.Position(1, 5));
				assert.ok(hover);
			});

			test('hover includes units', () => {
				const provider = new HoverProvider(mockStore);
				const doc = createMockDocument(['& SYSTEM', 'ibrav = 2']);
				const hover = provider.provideHover(doc as unknown as vscode.TextDocument, new vscode.Position(1, 5));
				assert.ok(hover);
			});
		});
	});
});

class MockDataStore extends DataStore {
	private completionData: CompletionData | null = null;
	private rangesData: RangeData | null = null;

	constructor() {
		super({ extensionUri: { path: '/' } as any } as any);
		this.completionData = {
			sections: {
				'& CONTROL': {
					sectionType: 'namelist',
					variables: {
						calculation: {
							name: 'calculation',
							section: '& CONTROL',
							sectionType: 'namelist',
							type: 'CHARACTER',
							default: '"scf"',
							description: 'Type of calculation',
							options: ['"scf"', '"nscf"', '"relax"', '"md"'],
							units: null,
							range: null,
							constraints: null
						},
						verbosity: {
							name: 'verbosity',
							section: '& CONTROL',
							sectionType: 'namelist',
							type: 'CHARACTER',
							default: '"low"',
							description: 'Verbosity level',
							options: [],
							units: null,
							range: null,
							constraints: null
						},
						tprnfor: {
							name: 'tprnfor',
							section: '& CONTROL',
							sectionType: 'namelist',
							type: 'LOGICAL',
							default: '.FALSE.',
							description: 'Print forces',
							options: [],
							units: null,
							range: null,
							constraints: null
						}
					},
					cardOptions: undefined
				},
				'& SYSTEM': {
					sectionType: 'namelist',
					variables: {
ibrav: {
						name: 'ibrav',
						section: '& SYSTEM',
						sectionType: 'namelist',
						type: 'INTEGER',
						default: '0',
						description: 'Bravais lattice type',
						options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
						units: 'a.u.',
						range: '0..14',
						constraints: null
					},
						ecutwfc: {
							name: 'ecutwfc',
							section: '& SYSTEM',
							sectionType: 'namelist',
							type: 'REAL',
							default: '30',
							description: 'Wavefunction cutoff',
							options: [],
							units: 'Ry',
							range: null,
							constraints: null
						}
					},
					cardOptions: undefined
				},
				ATOMIC_SPECIES: {
					sectionType: 'card',
					variables: {},
					cardOptions: {
						options: ['Si', 'O', 'C', 'H'],
						default: null
					}
				}
			}
		};
		this.rangesData = {
			variables: {
				'& SYSTEM.ibrav': { range: '0..14', units: 'a.u.' },
				'& SYSTEM.ecutwfc': { range: '1..100', units: 'Ry' }
			}
		};
	}

	override getCompletionData(): CompletionData | null {
		return this.completionData;
	}

	setCompletionData(data: CompletionData | null): void {
		this.completionData = data;
	}

	override getRanges(): RangeData | null {
		return this.rangesData;
	}
}

function createMockDocument(lines: string[]): object {
	const text = lines.join('\n');
	return {
		getText: () => text,
		lineCount: lines.length,
		lineAt: (line: number) => ({
			lineNumber: line,
			text: lines[line] || '',
			range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, lines[line]?.length || 0)),
			rangeIncludingLineBreak: new vscode.Range(
				new vscode.Position(line, 0),
				new vscode.Position(line, (lines[line]?.length || 0) + 1)
			)
		}),
		positionAt: (offset: number) => {
			let currentOffset = 0;
			for (let i = 0; i < lines.length; i++) {
				const lineLength = lines[i].length + 1;
				if (offset < currentOffset + lineLength) {
					return new vscode.Position(i, offset - currentOffset);
				}
				currentOffset += lineLength;
			}
			return new vscode.Position(lines.length - 1, lines[lines.length - 1]?.length || 0);
		},
		offsetAt: () => 0,
		uri: vscode.Uri.parse('file:///test.in'),
		fileName: 'test.in',
		isUntitled: false,
		languageId: 'qe-input',
		version: 1,
		isDirty: false,
		isClosed: false,
		save: async () => true,
		eol: vscode.EndOfLine.LF,
		encoding: 'utf8',
		getWordRangeAtPosition: () => undefined,
		validateRange: () => new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
		validatePosition: () => new vscode.Position(0, 0)
	};
}