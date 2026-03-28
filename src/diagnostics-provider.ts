import * as vscode from 'vscode';
import type { DiagnosticData, ConstraintData, RangeData, ParsedEntry, AssignmentIndex, SectionIssue, DependencyData, DiagnosticEntry } from './types';
import type { DataStore } from './data-store';
import { parseAssignments, stripInlineComment, normalizeSection } from './parser';

export class DiagnosticsProvider {
	constructor(
		private readonly store: DataStore,
		private readonly collection: vscode.DiagnosticCollection
	) {}

	refresh(document: vscode.TextDocument): void {
		let diagnosticsEnabled = true;
		try {
			const config = vscode.workspace.getConfiguration('qeSupport');
			diagnosticsEnabled = config.get('diagnostics.enabled', true);
		} catch {
			// In test environment, default to enabled
		}
		if (!diagnosticsEnabled) {
			this.collection.clear();
			return;
		}

		if (!isSupportedDocument(document)) {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];
		diagnostics.push(...findSectionClosureIssues(document));
		const data = this.store.getDiagnosticsData();
		const constraints = this.store.getConstraints();
		const ranges = this.store.getRanges();
		const dependencies = this.store.getDependencies();
		if (!data) {
			return;
		}

		const parsed = parseAssignments(document.getText());
		const assignmentIndex = indexAssignments(parsed);
		const duplicateDiagnostics = findDuplicateVariables(parsed);
		diagnostics.push(...duplicateDiagnostics);

		for (const entry of parsed) {
			const key = `${entry.section}.${entry.name}`;
			const def = data.variables[key];
			if (!def) {
				continue;
			}
			const issues = validateEntry(entry, def, constraints, ranges, assignmentIndex);
			for (const issue of issues) {
				diagnostics.push(
					new vscode.Diagnostic(entry.range, issue, vscode.DiagnosticSeverity.Warning)
				);
			}
			const typeIssue = validateType(entry, def);
			if (typeIssue) {
				diagnostics.push(
					new vscode.Diagnostic(entry.range, typeIssue, vscode.DiagnosticSeverity.Error)
				);
			}
		}

		if (dependencies) {
			diagnostics.push(...validateDependencies(parsed, assignmentIndex, dependencies));
		}

		this.collection.set(document.uri, diagnostics);
	}

	clear(document: vscode.TextDocument): void {
		this.collection.delete(document.uri);
	}
}

function isSupportedDocument(document: vscode.TextDocument): boolean {
	const SUPPORTED_LANGUAGES: (string | vscode.DocumentFilter)[] = [
		{ language: 'qe-input', scheme: 'file' },
		{ language: 'plaintext', scheme: 'file' }
	];
	return SUPPORTED_LANGUAGES.some((selector) => {
		if (typeof selector === 'string') {
			return selector === document.languageId;
		}
		return selector.language === document.languageId && selector.scheme === document.uri.scheme;
	});
}

function findSectionClosureIssues(document: vscode.TextDocument): vscode.Diagnostic[] {
	const issues: SectionIssue[] = [];
	let openSection: { name: string; line: number } | null = null;

	for (let index = 0; index < document.lineCount; index += 1) {
		const line = document.lineAt(index).text;
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}
		if (trimmed.startsWith('!') || trimmed.startsWith('#')) {
			continue;
		}

		if (trimmed.startsWith('&')) {
			const sectionName = normalizeSection(trimmed);
			if (openSection) {
				issues.push({
					message: `Section ${openSection.name} is not closed with '/'.`,
					range: new vscode.Range(
						new vscode.Position(openSection.line, 0),
						new vscode.Position(openSection.line, document.lineAt(openSection.line).text.length)
					)
				});
			}
			openSection = { name: sectionName, line: index };
			continue;
		}

		const withoutComment = stripInlineComment(line).trim();
		if (withoutComment === '/') {
			if (!openSection) {
				issues.push({
					message: "Stray '/' without an open section.",
					range: new vscode.Range(
						new vscode.Position(index, 0),
						new vscode.Position(index, line.length)
					)
				});
			} else {
				openSection = null;
			}
		}
	}

	if (openSection) {
		issues.push({
			message: `Section ${openSection.name} is not closed with '/'.`,
			range: new vscode.Range(
				new vscode.Position(openSection.line, 0),
				new vscode.Position(openSection.line, document.lineAt(openSection.line).text.length)
			)
		});
	}

	return issues.map(
		(issue) => new vscode.Diagnostic(issue.range, issue.message, vscode.DiagnosticSeverity.Warning)
	);
}

function indexAssignments(entries: ParsedEntry[]): AssignmentIndex {
	const bySection: Record<string, Record<string, string>> = {};
	for (const entry of entries) {
		if (!bySection[entry.section]) {
			bySection[entry.section] = {};
		}
		bySection[entry.section][entry.name] = entry.value;
	}
	return { bySection };
}

export function validateEntry(
	entry: ParsedEntry,
	def: DiagnosticData['variables'][string],
	constraints: ConstraintData | null,
	ranges: RangeData | null,
	assignmentIndex: AssignmentIndex
): string[] {
	const messages: string[] = [];
	if (def.options.length > 0 && !valueInOptions(entry.value, def.options)) {
		messages.push(`Value '${entry.value}' is not in the allowed options.`);
	}
	if (def.range && !valueMatchesRange(entry.value, def.range)) {
		messages.push(`Value '${entry.value}' is outside the allowed range ${def.range}.`);
	}
	if (ranges) {
		const rangeInfo = ranges.variables[`${entry.section}.${entry.name}`];
		if (rangeInfo && rangeInfo.range && !valueMatchesRange(entry.value, rangeInfo.range)) {
			messages.push(`Value '${entry.value}' violates range ${rangeInfo.range}.`);
		}
	}
	if (constraints) {
		const constraint = constraints.variables[`${entry.section}.${entry.name}`];
		if (constraint && constraint.validWhen.length > 0) {
			const evalResult = evaluateConditions(constraint.validWhen, entry.section, assignmentIndex);
			if (evalResult === false) {
				messages.push(`Condition not satisfied: ${constraint.validWhen.join('; ')}.`);
			}
		}
	}
	return messages;
}

export function valueMatchesRange(value: string, range: string): boolean {
	if (range.includes('..')) {
		const [minRaw, maxRaw] = range.split('..');
		const min = parseNumber(minRaw);
		const max = parseNumber(maxRaw);
		const numeric = parseNumber(value);
		if (min !== null && max !== null && numeric !== null) {
			return numeric >= min && numeric <= max;
		}
	}
	const inequalityMatch = range.match(
		/^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eEdD][+-]?\d+)?)\s*(<=|<)\s*x\s*(<=|<)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eEdD][+-]?\d+)?)\s*$/i
	);
	if (inequalityMatch) {
		const [, minRaw, minOp, maxOp, maxRaw] = inequalityMatch;
		const min = parseNumber(minRaw);
		const max = parseNumber(maxRaw);
		const numeric = parseNumber(value);
		if (min !== null && max !== null && numeric !== null) {
			const lowerOk = minOp === '<' ? numeric > min : numeric >= min;
			const upperOk = maxOp === '<' ? numeric < max : numeric <= max;
			return lowerOk && upperOk;
		}
	}
	return true;
}

export function evaluateConditions(
	conditions: string[],
	section: string,
	assignmentIndex: AssignmentIndex
): boolean | null {
	let evaluated = 0;
	for (const condition of conditions) {
		const result = evaluateCondition(condition, section, assignmentIndex);
		if (result === null) {
			continue;
		}
		evaluated += 1;
		if (!result) {
			return false;
		}
	}
	if (evaluated === 0) {
		return null;
	}
	return true;
}

export function evaluateCondition(
	condition: string,
	section: string,
	assignmentIndex: AssignmentIndex
): boolean | null {
	const normalized = condition.replace(/\s+/g, ' ').trim();
	const operatorMatch = normalized.match(/(.+?)\s*(==|=|\/=|>=|<=|>|<)\s*(.+)/);
	if (!operatorMatch) {
		return null;
	}
	const [, rawLeft, op, rawRight] = operatorMatch;
	const leftName = rawLeft.trim();
	const leftValue = resolveValue(leftName, section, assignmentIndex);
	if (leftValue === null) {
		return null;
	}
	const rightValue = rawRight.trim();
	return compareValues(leftValue, rightValue, op);
}

function resolveValue(
	name: string,
	section: string,
	assignmentIndex: AssignmentIndex
): string | null {
	if (name.includes('.')) {
		const [rawSection, rawName] = name.split('.', 2).map((part) => part.trim());
		if (rawSection && rawName) {
			const normalizedSection = rawSection.startsWith('&')
				? normalizeSection(rawSection)
				: `& ${rawSection.replace(/^&\s*/, '')}`;
			const sectionValues = assignmentIndex.bySection[normalizedSection];
			if (sectionValues && rawName in sectionValues) {
				return sectionValues[rawName];
			}
		}
	}
	const sectionValues = assignmentIndex.bySection[section];
	if (sectionValues && name in sectionValues) {
		return sectionValues[name];
	}
	let foundValue: string | null = null;
	for (const values of Object.values(assignmentIndex.bySection)) {
		if (name in values) {
			if (foundValue !== null) {
				return null;
			}
			foundValue = values[name];
		}
	}
	if (foundValue !== null) {
		return foundValue;
	}
	return null;
}

export function compareValues(left: string, right: string, op: string): boolean {
	const leftNorm = normalizeValue(left);
	const rightNorm = normalizeValue(right);
	const leftNum = parseNumber(leftNorm);
	const rightNum = parseNumber(rightNorm);
	if (leftNum !== null && rightNum !== null) {
		return compareNumbers(leftNum, rightNum, op);
	}
	if (op === '/' || op === '/=') {
		return leftNorm !== rightNorm;
	}
	if (op === '==' || op === '=') {
		return leftNorm === rightNorm;
	}
	return true;
}

function compareNumbers(left: number, right: number, op: string): boolean {
	if (op === '==') {
		return left === right;
	}
	if (op === '=') {
		return left === right;
	}
	if (op === '/=' || op === '/') {
		return left !== right;
	}
	if (op === '>') {
		return left > right;
	}
	if (op === '<') {
		return left < right;
	}
	if (op === '>=') {
		return left >= right;
	}
	if (op === '<=') {
		return left <= right;
	}
	return true;
}

function normalizeValue(value: string): string {
	const trimmed = value.trim();
	const bool = normalizeBoolean(trimmed);
	if (bool) {
		return bool;
	}
	// Remove surrounding quotes from string values
	if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
			(trimmed.startsWith('"') && trimmed.endsWith('"'))) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

export function normalizeBoolean(value: string): string | null {
	if (/^\.?true\.?$/i.test(value)) {
		return '.true.';
	}
	if (/^\.?false\.?$/i.test(value)) {
		return '.false.';
	}
	return null;
}

export function parseNumber(value: string): number | null {
	const trimmed = value.trim().replace(/[dD]/g, 'e');
	if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(trimmed)) {
		return null;
	}
	const parsed = Number(trimmed);
	return Number.isNaN(parsed) ? null : parsed;
}

export function valueInOptions(value: string, options: string[]): boolean {
	const normalizedValue = normalizeValue(value);
	return options.some((option) => normalizeValue(option) === normalizedValue);
}

function findDuplicateVariables(parsed: ParsedEntry[]): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];
	const seen = new Map<string, ParsedEntry[]>();

	for (const entry of parsed) {
		const key = `${entry.section}.${entry.name}`;
		if (!seen.has(key)) {
			seen.set(key, []);
		}
		seen.get(key)!.push(entry);
	}

	for (const [key, entries] of seen.entries()) {
		if (entries.length > 1) {
			for (const entry of entries) {
				const diagnostic = new vscode.Diagnostic(
					entry.range,
					`Variable '${entry.name}' in section '${entry.section}' is defined multiple times`,
					vscode.DiagnosticSeverity.Warning
				);
				diagnostic.code = 'duplicate-variable';
				diagnostic.source = 'qe-input-support';
				diagnostics.push(diagnostic);
			}
		}
	}

	return diagnostics;
}

function validateType(entry: ParsedEntry, def: DiagnosticEntry): string | null {
	const type = def.type.toLowerCase();
	const value = entry.value;

	if (type === 'string' || type === 'character') {
		return null;
	}

	if (type === 'integer') {
		if (!/^-?\d+$/.test(value.trim())) {
			return `Expected an integer for '${entry.name}', got '${value}'`;
		}
		return null;
	}

	if (type === 'real' || type === 'double' || type === 'float') {
		const numericValue = parseNumber(value);
		if (numericValue === null) {
			return `Expected a number for '${entry.name}', got '${value}'`;
		}
		return null;
	}

	if (type === 'logical' || type === 'boolean') {
		const validBooleans = ['.true.', '.false.', 'true', 'false', 'TRUE', 'FALSE', 'True', 'False', '1', '0'];
		if (!validBooleans.includes(value.trim())) {
			return `Expected a boolean for '${entry.name}', got '${value}'`;
		}
		return null;
	}

	return null;
}

function validateDependencies(
	parsed: ParsedEntry[],
	assignmentIndex: AssignmentIndex,
	dependencies: DependencyData
): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];

	for (const entry of parsed) {
		const key = `${entry.section}.${entry.name}`;
		const dependency = dependencies.variables[key];

		if (!dependency || !dependency.requires) {
			continue;
		}

		for (const [requiredVar, requiredValue] of Object.entries(dependency.requires)) {
			let found = false;
			let actualValue: string | null = null;

			if (requiredVar.includes('.')) {
				const [reqSection, reqName] = requiredVar.split('.', 2).map((s) => s.trim());
				const normalizedSection = reqSection.startsWith('&')
					? normalizeSection(reqSection)
					: `& ${reqSection.replace(/^&\s*/, '')}`;
				const sectionValues = assignmentIndex.bySection[normalizedSection];
				if (sectionValues && reqName in sectionValues) {
					found = true;
					actualValue = sectionValues[reqName];
				}
			} else {
				for (const values of Object.values(assignmentIndex.bySection)) {
					if (requiredVar in values) {
						if (found) {
							found = false;
							break;
						}
						found = true;
						actualValue = values[requiredVar];
					}
				}
			}

			if (!found) {
				const diagnostic = new vscode.Diagnostic(
					entry.range,
					`'${entry.name}' requires '${requiredVar}' to be set`,
					vscode.DiagnosticSeverity.Warning
				);
				diagnostic.code = 'missing-dependency';
				diagnostic.source = 'qe-input-support';
				diagnostics.push(diagnostic);
				continue;
			}

			if (actualValue && !valuesMatch(actualValue, requiredValue)) {
				const diagnostic = new vscode.Diagnostic(
					entry.range,
					`'${entry.name}' requires '${requiredVar}' to be ${requiredValue}, but it is '${actualValue}'`,
					vscode.DiagnosticSeverity.Warning
				);
				diagnostic.code = 'dependency-mismatch';
				diagnostic.source = 'qe-input-support';
				diagnostics.push(diagnostic);
			}
		}
	}

	return diagnostics;
}

function valuesMatch(actual: string, expected: string): boolean {
	const actualTrimmed = actual.trim();
	const expectedTrimmed = expected.trim();

	if (actualTrimmed === expectedTrimmed) {
		return true;
	}

	const boolMap: Record<string, string> = {
		'.true.': 'true',
		'.false.': 'false',
		'true': 'true',
		'false': 'false',
		'TRUE': 'true',
		'FALSE': 'false',
		'True': 'true',
		'False': 'false',
		'1': 'true',
		'0': 'false'
	};

	if (boolMap[actualTrimmed] && boolMap[expectedTrimmed]) {
		return boolMap[actualTrimmed] === boolMap[expectedTrimmed];
	}

	const actualNum = parseNumber(actualTrimmed);
	const expectedNum = parseNumber(expectedTrimmed);
	if (actualNum !== null && expectedNum !== null) {
		return actualNum === expectedNum;
	}

	return false;
}
