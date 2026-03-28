import * as vscode from 'vscode';
import type { CompletionVariable, RangeData } from './types';

export function buildVariableMarkdown(
	variable: CompletionVariable,
	currentValue: string | null,
	ranges: RangeData | null
): vscode.MarkdownString {
	const lines: string[] = [];
	
	lines.push(`### ${variable.name}`);
	lines.push('');
	
	if (variable.description) {
		lines.push(variable.description);
		lines.push('');
	}
	
	const infoLines: string[] = [];
	if (variable.type) {
		infoLines.push(`**Type:** ${variable.type}`);
	}
	if (variable.default) {
		infoLines.push(`**Default:** ${variable.default}`);
	}
	if (variable.units) {
		infoLines.push(`**Units:** ${variable.units}`);
	}
	if (infoLines.length > 0) {
		lines.push(infoLines.join('  '));
		lines.push('');
	}
	
	if (variable.options && variable.options.length > 0) {
		lines.push('**Options:**');
		for (const option of variable.options) {
			lines.push(`- \`${option}\``);
		}
		lines.push('');
	}
	
	const rangeInfo = ranges?.variables[`${variable.section}.${variable.name}`];
	if (rangeInfo?.range) {
		lines.push(`**Range:** ${rangeInfo.range}`);
		lines.push('');
	}
	
	if (currentValue) {
		lines.push(`**Current Value:** \`${currentValue}\``);
	}
	
	return new vscode.MarkdownString(lines.join('\n'));
}
