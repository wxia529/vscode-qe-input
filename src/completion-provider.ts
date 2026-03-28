import * as vscode from 'vscode';
import type { CompletionData, CompletionSection, CompletionVariable } from './types';
import type { DataStore } from './data-store';
import { findCardNameAtLine, findCurrentSection } from './parser';
import { buildVariableMarkdown } from './utils';

export class CompletionProvider implements vscode.CompletionItemProvider {
	constructor(private readonly store: DataStore) {}

	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.CompletionItem[] {
		let completionEnabled = true;
		try {
			const config = vscode.workspace.getConfiguration('qeSupport');
			completionEnabled = config.get('completion.enabled', true);
		} catch {
			// In test environment, default to enabled
		}
		if (!completionEnabled) {
			return [];
		}

		const data = this.store.getCompletionData();
		if (!data) {
			return [];
		}

		const lineText = document.lineAt(position.line).text;
		const cardName = findCardNameAtLine(data.sections, lineText);
		if (cardName) {
			const cardSection = data.sections[cardName];
			return this.buildCardOptionItems(cardSection, lineText);
		}
		if (lineText.trim().startsWith('&')) {
			return this.buildSectionItems(data.sections);
		}

		const section = findCurrentSection(document, position.line);
		if (!section) {
			return [];
		}
		const sectionData = data.sections[section];
		if (!sectionData) {
			return [];
		}

		if (lineText.includes('=')) {
			const variableName = lineText.split('=')[0].trim();
			return this.buildValueItems(sectionData, variableName);
		}

		return this.buildVariableItems(sectionData);
	}

	private buildSectionItems(sections: Record<string, CompletionSection>): vscode.CompletionItem[] {
		return Object.keys(sections).map((section) => {
			const item = new vscode.CompletionItem(section, vscode.CompletionItemKind.Keyword);
			item.insertText = section;
			item.detail = sections[section].sectionType;
			return item;
		});
	}

	private buildVariableItems(section: CompletionSection): vscode.CompletionItem[] {
		return Object.keys(section.variables).map((name) => {
			const variable = section.variables[name];
			const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);
			item.detail = variable.type;
			item.documentation = buildVariableMarkdown(variable, null, null);
			return item;
		});
	}

	private buildValueItems(section: CompletionSection, variableName: string): vscode.CompletionItem[] {
		const variable = section.variables[variableName];
		if (!variable || !variable.options || variable.options.length === 0) {
			return [];
		}
		return variable.options.map((option) => {
			const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Value);
			item.detail = variable.type;
			item.documentation = buildVariableMarkdown(variable, option, null);
			return item;
		});
	}

	private buildCardOptionItems(
		section: CompletionSection,
		lineText: string
	): vscode.CompletionItem[] {
		if (!section.cardOptions || section.cardOptions.options.length === 0) {
			return [];
		}
		const wantsParen = lineText.includes('(');
		return section.cardOptions.options.map((option) => {
			const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Value);
			item.insertText = wantsParen ? `${option})` : option;
			return item;
		});
	}
}
