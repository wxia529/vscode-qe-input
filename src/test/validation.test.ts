import * as assert from 'assert';
import * as vscode from 'vscode';
import {
	valueMatchesRange,
	valueInOptions,
	normalizeBoolean,
	parseNumber,
	compareValues,
	evaluateCondition,
	evaluateConditions,
	validateEntry
} from '../diagnostics-provider';
import type { AssignmentIndex, ParsedEntry } from '../types';

suite('Validation Tests', () => {
	suite('parseNumber', () => {
		test('parse integer', () => {
			assert.strictEqual(parseNumber('5'), 5);
		});

		test('parse float', () => {
			assert.strictEqual(parseNumber('3.14'), 3.14);
		});

		test('parse negative number', () => {
			assert.strictEqual(parseNumber('-10'), -10);
		});

		test('parse scientific notation', () => {
			assert.strictEqual(parseNumber('1.5e-10'), 1.5e-10);
		});

		test('parse d-format lowercase', () => {
			assert.strictEqual(parseNumber('1.5d-10'), 1.5e-10);
		});

		test('parse d-format uppercase', () => {
			assert.strictEqual(parseNumber('2D+5'), 2e5);
		});

		test('parse D-format uppercase', () => {
			assert.strictEqual(parseNumber('1.5D-10'), 1.5e-10);
		});

		test('parse zero', () => {
			assert.strictEqual(parseNumber('0'), 0);
		});

		test('parse leading decimal', () => {
			assert.strictEqual(parseNumber('.5'), 0.5);
		});

		test('return null for invalid string', () => {
			assert.strictEqual(parseNumber('abc'), null);
		});

		test('return null for empty string', () => {
			assert.strictEqual(parseNumber(''), null);
		});

		test('return null for string with spaces', () => {
			assert.strictEqual(parseNumber('1 2'), null);
		});

		test('handle trimmed whitespace', () => {
			assert.strictEqual(parseNumber('  5  '), 5);
		});
	});

	suite('normalizeBoolean', () => {
		test('normalize .true.', () => {
			assert.strictEqual(normalizeBoolean('.true.'), '.true.');
		});

		test('normalize .false.', () => {
			assert.strictEqual(normalizeBoolean('.false.'), '.false.');
		});

		test('normalize true without dots', () => {
			assert.strictEqual(normalizeBoolean('true'), '.true.');
		});

		test('normalize false without dots', () => {
			assert.strictEqual(normalizeBoolean('false'), '.false.');
		});

		test('normalize TRUE uppercase', () => {
			assert.strictEqual(normalizeBoolean('TRUE'), '.true.');
		});

		test('normalize FALSE uppercase', () => {
			assert.strictEqual(normalizeBoolean('FALSE'), '.false.');
		});

		test('normalize True mixed case', () => {
			assert.strictEqual(normalizeBoolean('True'), '.true.');
		});

		test('return null for non-boolean', () => {
			assert.strictEqual(normalizeBoolean('yes'), null);
		});

		test('return null for empty string', () => {
			assert.strictEqual(normalizeBoolean(''), null);
		});
	});

	suite('valueMatchesRange', () => {
		test('value in range', () => {
			assert.strictEqual(valueMatchesRange('5', '1..10'), true);
		});

		test('value below range', () => {
			assert.strictEqual(valueMatchesRange('0', '1..10'), false);
		});

		test('value above range', () => {
			assert.strictEqual(valueMatchesRange('11', '1..10'), false);
		});

		test('value at min boundary', () => {
			assert.strictEqual(valueMatchesRange('1', '1..10'), true);
		});

		test('value at max boundary', () => {
			assert.strictEqual(valueMatchesRange('10', '1..10'), true);
		});

		test('handle negative range', () => {
			assert.strictEqual(valueMatchesRange('-5', '-10..10'), true);
		});

		test('handle float range', () => {
			assert.strictEqual(valueMatchesRange('3.14', '0..10'), true);
		});

		test('handle scientific notation range', () => {
			assert.strictEqual(valueMatchesRange('1e-5', '1e-10..1e-1'), true);
		});

		test('handle d-format in range', () => {
			assert.strictEqual(valueMatchesRange('1d-5', '1e-10..1e-1'), true);
		});

		test('return true for non-numeric value', () => {
			assert.strictEqual(valueMatchesRange('abc', '1..10'), true);
		});

		test('return true for invalid range format', () => {
			assert.strictEqual(valueMatchesRange('5', 'invalid'), true);
		});

		test('handle inequality: 0 < x < 10', () => {
			assert.strictEqual(valueMatchesRange('5', '0 < x < 10'), true);
		});

		test('handle inequality: value at boundary', () => {
			assert.strictEqual(valueMatchesRange('0', '0 < x < 10'), false);
		});

		test('handle inequality: <= operator', () => {
			assert.strictEqual(valueMatchesRange('0', '0 <= x <= 10'), true);
		});

		test('handle inequality: mixed operators', () => {
			assert.strictEqual(valueMatchesRange('5', '0 < x <= 10'), true);
		});

		test('handle inequality: value outside', () => {
			assert.strictEqual(valueMatchesRange('15', '0 < x < 10'), false);
		});
	});

	suite('valueInOptions', () => {
		test('value in options', () => {
			assert.strictEqual(valueInOptions('"scf"', ['"scf"', '"nscf"', '"relax"']), true);
		});

		test('value not in options', () => {
			assert.strictEqual(valueInOptions('"invalid"', ['"scf"', '"nscf"']), false);
		});

		test('match with normalization', () => {
			assert.strictEqual(valueInOptions('true', ['true', 'false']), true);
		});

		test('match boolean with dots', () => {
			assert.strictEqual(valueInOptions('.true.', ['.true.', '.false.']), true);
		});

		test('match boolean case insensitive', () => {
			assert.strictEqual(valueInOptions('TRUE', ['true', 'false']), true);
		});

		test('handle empty options', () => {
			assert.strictEqual(valueInOptions('value', []), false);
		});
	});

	suite('compareValues', () => {
		test('compare numbers: equal', () => {
			assert.strictEqual(compareValues('5', '5', '=='), true);
		});

		test('compare numbers: not equal', () => {
			assert.strictEqual(compareValues('5', '3', '=='), false);
		});

		test('compare numbers: greater than', () => {
			assert.strictEqual(compareValues('5', '3', '>'), true);
		});

		test('compare numbers: less than', () => {
			assert.strictEqual(compareValues('3', '5', '<'), true);
		});

		test('compare numbers: greater or equal', () => {
			assert.strictEqual(compareValues('5', '5', '>='), true);
		});

		test('compare numbers: less or equal', () => {
			assert.strictEqual(compareValues('5', '5', '<='), true);
		});

		test('compare strings: equal', () => {
			assert.strictEqual(compareValues('"scf"', '"scf"', '=='), true);
		});

		test('compare strings: not equal', () => {
			assert.strictEqual(compareValues('"scf"', '"nscf"', '/='), true);
		});

		test('compare with = operator', () => {
			assert.strictEqual(compareValues('5', '5', '='), true);
		});

		test('compare with / operator', () => {
			assert.strictEqual(compareValues('5', '3', '/'), true);
		});

		test('compare floats', () => {
			assert.strictEqual(compareValues('3.14', '3.14', '=='), true);
		});

		test('compare scientific notation', () => {
			assert.strictEqual(compareValues('1e-10', '1e-10', '=='), true);
		});
	});

	suite('evaluateCondition', () => {
		test('evaluate simple equality', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': { calculation: '"scf"' }
				}
			};
			assert.strictEqual(evaluateCondition('calculation == "scf"', '& CONTROL', index), true);
		});

		test('evaluate simple inequality', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': { calculation: '"scf"' }
				}
			};
			assert.strictEqual(evaluateCondition('calculation /= "nscf"', '& CONTROL', index), true);
		});

		test('evaluate numeric comparison', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& SYSTEM': { ibrav: '2' }
				}
			};
			assert.strictEqual(evaluateCondition('ibrav > 1', '& SYSTEM', index), true);
		});

		test('evaluate cross-section reference', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': { calculation: '"scf"' },
					'& SYSTEM': { ibrav: '2' }
				}
			};
			assert.strictEqual(
				evaluateCondition('CONTROL.calculation == "scf"', '& SYSTEM', index),
				true
			);
		});

		test('return null for missing variable', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': {}
				}
			};
			assert.strictEqual(evaluateCondition('missing == "value"', '& CONTROL', index), null);
		});

		test('return null for invalid condition', () => {
			const index: AssignmentIndex = { bySection: {} };
			assert.strictEqual(evaluateCondition('invalid condition', '& CONTROL', index), null);
		});
	});

	suite('evaluateConditions', () => {
		test('evaluate all conditions true', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': { calculation: '"scf"', ibrav: '2' }
				}
			};
			const conditions = ['calculation == "scf"', 'ibrav > 1'];
			assert.strictEqual(evaluateConditions(conditions, '& CONTROL', index), true);
		});

		test('evaluate one condition false', () => {
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': { calculation: '"nscf"' }
				}
			};
			const conditions = ['calculation == "scf"'];
			assert.strictEqual(evaluateConditions(conditions, '& CONTROL', index), false);
		});

		test('return null for no valid conditions', () => {
			const index: AssignmentIndex = { bySection: {} };
			const conditions = ['invalid'];
			assert.strictEqual(evaluateConditions(conditions, '& CONTROL', index), null);
		});

		test('handle empty conditions array', () => {
			const index: AssignmentIndex = { bySection: {} };
			assert.strictEqual(evaluateConditions([], '& CONTROL', index), null);
		});
	});

	suite('validateEntry', () => {
		test('valid entry with matching options', () => {
			const entry: ParsedEntry = {
				section: '& CONTROL',
				name: 'calculation',
				value: '"scf"',
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 20))
			};
			const def = {
				type: 'character',
				options: ['"scf"', '"nscf"', '"relax"'],
				default: '"scf"',
				range: null,
				units: null,
				section: '& CONTROL'
			};
			const messages = validateEntry(entry, def, null, null, { bySection: {} });
			assert.strictEqual(messages.length, 0);
		});

		test('invalid entry with non-matching options', () => {
			const entry: ParsedEntry = {
				section: '& CONTROL',
				name: 'calculation',
				value: '"invalid"',
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 20))
			};
			const def = {
				type: 'character',
				options: ['"scf"', '"nscf"'],
				default: '"scf"',
				range: null,
				units: null,
				section: '& CONTROL'
			};
			const messages = validateEntry(entry, def, null, null, { bySection: {} });
			assert.strictEqual(messages.length, 1);
			assert.ok(messages[0].includes('not in the allowed options'));
		});

		test('valid entry within range', () => {
			const entry: ParsedEntry = {
				section: '& SYSTEM',
				name: 'ibrav',
				value: '5',
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10))
			};
			const def = {
				type: 'integer',
				options: [],
				default: '0',
				range: '0..14',
				units: null,
				section: '& SYSTEM'
			};
			const messages = validateEntry(entry, def, null, null, { bySection: {} });
			assert.strictEqual(messages.length, 0);
		});

		test('invalid entry outside range', () => {
			const entry: ParsedEntry = {
				section: '& SYSTEM',
				name: 'ibrav',
				value: '20',
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10))
			};
			const def = {
				type: 'integer',
				options: [],
				default: '0',
				range: '0..14',
				units: null,
				section: '& SYSTEM'
			};
			const messages = validateEntry(entry, def, null, null, { bySection: {} });
			assert.strictEqual(messages.length, 1);
			assert.ok(messages[0].includes('outside the allowed range'));
		});

		test('validate with constraints', () => {
			const entry: ParsedEntry = {
				section: '& CONTROL',
				name: 'tprnfor',
				value: '.true.',
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 20))
			};
			const def = {
				type: 'logical',
				options: [],
				default: '.false.',
				range: null,
				units: null,
				section: '& CONTROL'
			};
			const constraints = {
				variables: {
					'& CONTROL.tprnfor': {
						requires: [],
						conflicts: [],
						implies: [],
						validWhen: ['calculation == "scf"']
					}
				}
			};
			const index: AssignmentIndex = {
				bySection: {
					'& CONTROL': { calculation: '"nscf"', tprnfor: '.true.' }
				}
			};
			const messages = validateEntry(entry, def, constraints, null, index);
			assert.strictEqual(messages.length, 1);
			assert.ok(messages[0].includes('Condition not satisfied'));
		});

		test('validate with ranges data', () => {
			const entry: ParsedEntry = {
				section: '& SYSTEM',
				name: 'ecutwfc',
				value: '100',
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 15))
			};
			const def = {
				type: 'real',
				options: [],
				default: '30',
				range: null,
				units: 'Ry',
				section: '& SYSTEM'
			};
			const ranges = {
				variables: {
					'& SYSTEM.ecutwfc': {
						range: '1..50',
						units: 'Ry'
					}
				}
			};
			const messages = validateEntry(entry, def, null, ranges, { bySection: {} });
			assert.strictEqual(messages.length, 1);
			assert.ok(messages[0].includes('violates range'));
		});
	});
});