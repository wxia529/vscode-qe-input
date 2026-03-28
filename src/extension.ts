import * as vscode from 'vscode';
import { DataStore } from './data-store';
import { CompletionProvider } from './completion-provider';
import { HoverProvider } from './hover-provider';
import { DiagnosticsProvider } from './diagnostics-provider';

const SUPPORTED_LANGUAGES: (string | vscode.DocumentFilter)[] = [
	{ language: 'qe-input', scheme: 'file' },
	{ language: 'plaintext', scheme: 'file' }
];

export function activate(context: vscode.ExtensionContext) {
	const store = new DataStore(context);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			SUPPORTED_LANGUAGES,
			new CompletionProvider(store),
			'&',
			'=',
			' ',
			'('
		)
	);

	const diagnosticsCollection = vscode.languages.createDiagnosticCollection('qe-input-support');
	context.subscriptions.push(diagnosticsCollection);

	const diagnosticsProvider = new DiagnosticsProvider(store, diagnosticsCollection);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((doc) => diagnosticsProvider.refresh(doc))
	);
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => diagnosticsProvider.refresh(event.document))
	);
	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => diagnosticsProvider.clear(doc))
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			SUPPORTED_LANGUAGES,
			new HoverProvider(store)
		)
	);

	const reloadCommand = vscode.commands.registerCommand('qeSupport.reloadData', async () => {
		try {
			await store.reloadData();
			vscode.window.showInformationMessage('QE data reloaded successfully');
			vscode.workspace.textDocuments.forEach((doc) => {
				if (doc.languageId === 'qe-input' || doc.languageId === 'plaintext') {
					diagnosticsProvider.refresh(doc);
				}
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to reload data: ${error}`);
		}
	});

	const checkDataCommand = vscode.commands.registerCommand('qeSupport.checkDataStatus', async () => {
		const stats = store.getStatistics();
		const config = vscode.workspace.getConfiguration('qeSupport');
		const dataPath = config.get('dataPath', '') || '(default)';
		vscode.window.showInformationMessage(
			`QE Data Status:\n` +
			`- Sections: ${stats.sections}\n` +
			`- Variables: ${stats.variables}\n` +
			`- Dependencies: ${stats.dependencies}\n` +
			`- Extension path: ${context.extensionPath}\n` +
			`- Data path: ${dataPath}`
		);
	});

	context.subscriptions.push(reloadCommand, checkDataCommand);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('qeSupport')) {
				vscode.workspace.textDocuments.forEach((doc) => {
					if (doc.languageId === 'qe-input' || doc.languageId === 'plaintext') {
						diagnosticsProvider.refresh(doc);
					}
				});
			}
		})
	);
}

export function deactivate() {}