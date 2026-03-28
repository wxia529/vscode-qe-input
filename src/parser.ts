import * as vscode from 'vscode';
import type { CompletionSection, ParsedEntry } from './types';

export const COMMENT_PREFIXES = ['!', '#'];
export const SECTION_END = '/';

export function parseAssignments(text: string): ParsedEntry[] {
	const lines = text.split(/\r?\n/);
	const entries: ParsedEntry[] = [];
	let currentSection = '';

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const trimmed = line.trim();
		if (trimmed.startsWith('&')) {
			currentSection = normalizeSection(trimmed);
			continue;
		}
		if (!currentSection || trimmed === '/' || trimmed.startsWith('!') || trimmed.startsWith('#')) {
			continue;
		}
		const withoutComment = stripInlineComment(line);
		const parts = splitAssignments(withoutComment);
		for (const part of parts) {
			const eqIndex = part.indexOf('=');
			if (eqIndex <= 0) {
				continue;
			}
			const name = part.slice(0, eqIndex).trim();
			const value = part.slice(eqIndex + 1).trim();
			if (!name) {
				continue;
			}
			const range = new vscode.Range(
				new vscode.Position(index, 0),
				new vscode.Position(index, line.length)
			);
			entries.push({ section: currentSection, name, value, range });
		}
	}

	return entries;
}

export function stripInlineComment(line: string): string {
	let inSingleQuote = false;
	let inDoubleQuote = false;
	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			continue;
		}
		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			continue;
		}
		if (!inSingleQuote && !inDoubleQuote && (char === '!' || char === '#')) {
			return line.slice(0, index);
		}
	}
	return line;
}

export function splitAssignments(line: string): string[] {
	const parts: string[] = [];
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let depth = 0;
	let start = 0;
	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			continue;
		}
		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			continue;
		}
		if (!inSingleQuote && !inDoubleQuote) {
			if (char === '(' || char === '[' || char === '{') {
				depth += 1;
				continue;
			}
			if (char === ')' || char === ']' || char === '}') {
				depth = Math.max(0, depth - 1);
				continue;
			}
			if (char === ',' && depth === 0) {
				parts.push(line.slice(start, index).trim());
				start = index + 1;
			}
		}
	}
	const last = line.slice(start).trim();
	if (last) {
		parts.push(last);
	}
	return parts.length > 0 ? parts : [line];
}

export function findCurrentSection(document: vscode.TextDocument, line: number): string | null {
	for (let index = line; index >= 0; index -= 1) {
		const trimmed = document.lineAt(index).text.trim();
		if (trimmed.startsWith('&')) {
			return normalizeSection(trimmed);
		}
		if (trimmed === '/' && index < line) {
			return null;
		}
	}
	return null;
}

export function findCardNameAtLine(
	sections: Record<string, CompletionSection>,
	lineText: string
): string | null {
	const trimmed = lineText.trimStart();
	if (!trimmed) {
		return null;
	}
	const candidates = Object.keys(sections).filter(
		(sectionName) => sections[sectionName].sectionType === 'card'
	);
	for (const name of candidates) {
		if (trimmed.startsWith(name)) {
			return name;
		}
	}
	return null;
}

export function normalizeSection(raw: string): string {
	const match = raw.match(/^&\s*([A-Za-z0-9_]+)/);
	if (!match) {
		return raw.trim();
	}
	return `& ${match[1]}`;
}

export function findEntryAtPosition(document: vscode.TextDocument, position: vscode.Position): ParsedEntry | null {
	const parsed = parseAssignments(document.getText());
	for (const entry of parsed) {
		if (entry.range.contains(position)) {
			return entry;
		}
	}
	return null;
}
