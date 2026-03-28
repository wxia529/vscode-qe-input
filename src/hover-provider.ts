import * as vscode from 'vscode';
import type { CompletionData } from './types';
import type { DataStore } from './data-store';
import { findEntryAtPosition } from './parser';
import { buildVariableMarkdown } from './utils';

export class HoverProvider implements vscode.HoverProvider {
	constructor(private readonly store: DataStore) {}

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | null {
		let hoverEnabled = true;
		try {
			const config = vscode.workspace.getConfiguration('qeSupport');
			hoverEnabled = config.get('hover.enabled', true);
		} catch {
			// In test environment, default to enabled
		}
		if (!hoverEnabled) {
			return null;
		}

		const data = this.store.getCompletionData();
		if (!data) {
			return null;
		}
		const entry = findEntryAtPosition(document, position);
		if (!entry) {
			return null;
		}
		const sectionData = data.sections[entry.section];
		if (!sectionData) {
			return null;
		}
		const variable = sectionData.variables[entry.name];
		if (!variable) {
			return null;
		}
		return new vscode.Hover(buildVariableMarkdown(variable, entry.value, this.store.getRanges()));
	}
}
