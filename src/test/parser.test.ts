import * as assert from 'assert';
import * as vscode from 'vscode';
import {
	parseAssignments,
	stripInlineComment,
	splitAssignments,
	normalizeSection,
	findCurrentSection,
	findEntryAtPosition
} from '../parser';

suite('Parser Tests', () => {
	suite('parseAssignments', () => {
		test('parse namelist section', () => {
			const text = '&CONTROL\ncalculation = "scf"\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].section, '& CONTROL');
			assert.strictEqual(result[0].name, 'calculation');
			assert.strictEqual(result[0].value, '"scf"');
		});

		test('parse multiple sections', () => {
			const text = '&CONTROL\ncalculation = "scf"\n/\n&SYSTEM\nibrav = 1\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].section, '& CONTROL');
			assert.strictEqual(result[1].section, '& SYSTEM');
		});

		test('parse multiple assignments on same line', () => {
			const text = '&SYSTEM\na = 1, b = 2, c = 3\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].name, 'a');
			assert.strictEqual(result[1].name, 'b');
			assert.strictEqual(result[2].name, 'c');
		});

		test('skip comment lines', () => {
			const text = '&CONTROL\n! this is a comment\ncalculation = "scf"\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].name, 'calculation');
		});

		test('strip inline comments', () => {
			const text = '&CONTROL\ncalculation = "scf" ! comment\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, '"scf"');
		});

		test('handle empty lines', () => {
			const text = '&CONTROL\n\ncalculation = "scf"\n\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
		});

		test('handle whitespace in section header', () => {
			const text = '&  CONTROL  \ncalculation = "scf"\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].section, '& CONTROL');
		});

		test('skip assignments outside sections', () => {
			const text = 'calculation = "scf"\n&CONTROL\nibrav = 1\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].name, 'ibrav');
		});

		test('handle quoted values with spaces', () => {
			const text = '&CONTROL\ntitle = "my calculation"\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, '"my calculation"');
		});

		test('handle numeric values', () => {
			const text = '&SYSTEM\nibrav = 1\nalat = 10.5\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].value, '1');
			assert.strictEqual(result[1].value, '10.5');
		});

		test('handle scientific notation', () => {
			const text = '&SYSTEM\necutwfc = 1.5d-10\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, '1.5d-10');
		});

		test('handle boolean values', () => {
			const text = '&CONTROL\nverbosity = .true.\n/';
			const result = parseAssignments(text);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, '.true.');
		});

		test('return empty array for empty text', () => {
			const result = parseAssignments('');
			assert.strictEqual(result.length, 0);
		});

		test('return empty array for text without sections', () => {
			const result = parseAssignments('calculation = "scf"');
			assert.strictEqual(result.length, 0);
		});
	});

	suite('stripInlineComment', () => {
		test('strip exclamation comment', () => {
			assert.strictEqual(stripInlineComment('value ! comment'), 'value ');
		});

		test('strip hash comment', () => {
			assert.strictEqual(stripInlineComment('value # comment'), 'value ');
		});

		test('preserve exclamation in single quotes', () => {
			assert.strictEqual(stripInlineComment("'test!'"), "'test!'");
		});

		test('preserve exclamation in double quotes', () => {
			assert.strictEqual(stripInlineComment('"test!"'), '"test!"');
		});

		test('preserve hash in single quotes', () => {
			assert.strictEqual(stripInlineComment("'test#'"), "'test#'");
		});

		test('preserve hash in double quotes', () => {
			assert.strictEqual(stripInlineComment('"test#"'), '"test#"');
		});

		test('handle comment after quoted string', () => {
			assert.strictEqual(stripInlineComment('"value" ! comment'), '"value" ');
		});

		test('handle no comment', () => {
			assert.strictEqual(stripInlineComment('value'), 'value');
		});

		test('handle empty string', () => {
			assert.strictEqual(stripInlineComment(''), '');
		});

		test('handle comment at start', () => {
			assert.strictEqual(stripInlineComment('! comment'), '');
		});

		test('handle mixed quotes', () => {
			assert.strictEqual(stripInlineComment("'single' ! \"double\""), "'single' ");
		});

		test('handle unclosed quote', () => {
			assert.strictEqual(stripInlineComment('"unclosed ! comment'), '"unclosed ! comment');
		});
	});

	suite('splitAssignments', () => {
		test('split comma-separated values', () => {
			const result = splitAssignments('a, b, c');
			assert.deepStrictEqual(result, ['a', 'b', 'c']);
		});

		test('split assignments', () => {
			const result = splitAssignments('a = 1, b = 2, c = 3');
			assert.deepStrictEqual(result, ['a = 1', 'b = 2', 'c = 3']);
		});

		test('preserve commas in parentheses', () => {
			const result = splitAssignments('atom1(1), atom2(2)');
			assert.deepStrictEqual(result, ['atom1(1)', 'atom2(2)']);
		});

		test('preserve commas in nested parentheses', () => {
			const result = splitAssignments('func(a, b), other(c, d)');
			assert.deepStrictEqual(result, ['func(a, b)', 'other(c, d)']);
		});

		test('preserve commas in brackets', () => {
			const result = splitAssignments('arr[1, 2], other[3, 4]');
			assert.deepStrictEqual(result, ['arr[1, 2]', 'other[3, 4]']);
		});

		test('preserve commas in braces', () => {
			const result = splitAssignments('{a, b}, {c, d}');
			assert.deepStrictEqual(result, ['{a, b}', '{c, d}']);
		});

		test('preserve commas in quoted strings', () => {
			const result = splitAssignments('"a, b", "c, d"');
			assert.deepStrictEqual(result, ['"a, b"', '"c, d"']);
		});

		test('preserve commas in single quoted strings', () => {
			const result = splitAssignments("'a, b', 'c, d'");
			assert.deepStrictEqual(result, ["'a, b'", "'c, d'"]);
		});

		test('handle single value', () => {
			const result = splitAssignments('single');
			assert.deepStrictEqual(result, ['single']);
		});

		test('handle empty string', () => {
			const result = splitAssignments('');
			assert.deepStrictEqual(result, ['']);
		});

		test('handle trailing comma', () => {
			const result = splitAssignments('a, b,');
			assert.deepStrictEqual(result, ['a', 'b']);
		});

		test('handle leading comma', () => {
			const result = splitAssignments(', a, b');
			assert.deepStrictEqual(result, ['', 'a', 'b']);
		});

		test('handle nested parentheses with commas', () => {
			const result = splitAssignments('func(a(1, 2), b(3, 4))');
			assert.deepStrictEqual(result, ['func(a(1, 2), b(3, 4))']);
		});

		test('handle mixed bracket types', () => {
			const result = splitAssignments('func[a(b)], other{c}');
			assert.deepStrictEqual(result, ['func[a(b)]', 'other{c}']);
		});
	});

	suite('normalizeSection', () => {
		test('normalize standard section', () => {
			assert.strictEqual(normalizeSection('&CONTROL'), '& CONTROL');
		});

		test('normalize section with spaces', () => {
			assert.strictEqual(normalizeSection('&  CONTROL'), '& CONTROL');
		});

		test('normalize section with lowercase', () => {
			assert.strictEqual(normalizeSection('&control'), '& control');
		});

		test('normalize section with mixed case', () => {
			assert.strictEqual(normalizeSection('&CoNtRoL'), '& CoNtRoL');
		});

		test('preserve non-standard format', () => {
			assert.strictEqual(normalizeSection('invalid'), 'invalid');
		});

		test('handle section with trailing text', () => {
			assert.strictEqual(normalizeSection('&CONTROL some text'), '& CONTROL');
		});

		test('handle section with numbers', () => {
			assert.strictEqual(normalizeSection('&CELL123'), '& CELL123');
		});

		test('handle section with underscore', () => {
			assert.strictEqual(normalizeSection('&MY_SECTION'), '& MY_SECTION');
		});
	});

	suite('findCurrentSection', () => {
		test('find section above current line', () => {
			const doc = createMockDocument(['&CONTROL', 'calculation = "scf"', 'ibrav = 1']);
			assert.strictEqual(findCurrentSection(doc as unknown as vscode.TextDocument, 2), '& CONTROL');
		});

		test('return null before first section', () => {
			const doc = createMockDocument(['calculation = "scf"', '&CONTROL', 'ibrav = 1']);
			assert.strictEqual(findCurrentSection(doc as unknown as vscode.TextDocument, 0), null);
		});

		test('return null after section end', () => {
			const doc = createMockDocument(['&CONTROL', 'calculation = "scf"', '/', 'some text']);
			assert.strictEqual(findCurrentSection(doc as unknown as vscode.TextDocument, 3), null);
		});

		test('find section at current line', () => {
			const doc = createMockDocument(['&CONTROL', 'calculation = "scf"']);
			assert.strictEqual(findCurrentSection(doc as unknown as vscode.TextDocument, 0), '& CONTROL');
		});

		test('handle multiple sections', () => {
			const doc = createMockDocument(['&CONTROL', 'calc = "scf"', '/', '&SYSTEM', 'ibrav = 1']);
			assert.strictEqual(findCurrentSection(doc as unknown as vscode.TextDocument, 4), '& SYSTEM');
		});
	});

	suite('findEntryAtPosition', () => {
		test('find entry at position', () => {
			const doc = createMockDocument(['&CONTROL', 'calculation = "scf"']);
			const position = new vscode.Position(1, 5);
			const entry = findEntryAtPosition(doc as unknown as vscode.TextDocument, position);
			assert.notStrictEqual(entry, null);
			if (entry) {
				assert.strictEqual(entry.name, 'calculation');
			}
		});

		test('return null outside entry range', () => {
			const doc = createMockDocument(['&CONTROL', 'calculation = "scf"']);
			const position = new vscode.Position(0, 5);
			const entry = findEntryAtPosition(doc as unknown as vscode.TextDocument, position);
			assert.strictEqual(entry, null);
		});

		test('return null for empty document', () => {
			const doc = createMockDocument([]);
			const position = new vscode.Position(0, 0);
			const entry = findEntryAtPosition(doc as unknown as vscode.TextDocument, position);
			assert.strictEqual(entry, null);
		});
	});
});

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