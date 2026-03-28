import * as fs from 'fs';
import * as vscode from 'vscode';
import type { CompletionData, DiagnosticData, ConstraintData, RangeData, DependencyData } from './types';

const DATA_FILES = {
	completion: 'data/completion.json',
	diagnostics: 'data/diagnostics.json',
	constraints: 'data/constraints.json',
	ranges: 'data/ranges.json',
	dependencies: 'data/dependencies.json'
} as const;

export class DataStore {
	private completion: CompletionData | null = null;
	private diagnostics: DiagnosticData | null = null;
	private constraints: ConstraintData | null = null;
	private ranges: RangeData | null = null;
	private dependencies: DependencyData | null = null;
	private lastLoadError: string | null = null;
	private customDataPath: string | null = null;

	constructor(private readonly context: vscode.ExtensionContext) {
		try {
			this.customDataPath = vscode.workspace.getConfiguration('qeSupport').get('dataPath', '') || null;
		} catch {
			this.customDataPath = null;
		}
	}

	getCompletionData(): CompletionData | null {
		this.ensureLoaded();
		return this.completion;
	}

	getDiagnosticsData(): DiagnosticData | null {
		this.ensureLoaded();
		return this.diagnostics;
	}

	getConstraints(): ConstraintData | null {
		this.ensureLoaded();
		return this.constraints;
	}

	getRanges(): RangeData | null {
		this.ensureLoaded();
		return this.ranges;
	}

	getDependencies(): DependencyData | null {
		this.ensureLoaded();
		return this.dependencies;
	}

	getLastError(): string | null {
		return this.lastLoadError;
	}

	async reloadData(): Promise<void> {
		this.completion = null;
		this.diagnostics = null;
		this.constraints = null;
		this.ranges = null;
		this.dependencies = null;
		this.customDataPath = vscode.workspace.getConfiguration('qeSupport').get('dataPath', '') || null;
		this.ensureLoaded();
	}

	getStatistics(): { variables: number; sections: number; dependencies: number } {
		this.ensureLoaded();
		return {
			variables: this.completion ? Object.keys(this.completion.sections).reduce((acc, section) => {
				return acc + Object.keys(this.completion!.sections[section].variables).length;
			}, 0) : 0,
			sections: this.completion ? Object.keys(this.completion.sections).length : 0,
			dependencies: this.dependencies ? Object.keys(this.dependencies.variables).length : 0
		};
	}

	private ensureLoaded(): void {
		if (this.completion && this.diagnostics && this.constraints && this.ranges && this.dependencies) {
			return;
		}
		try {
			this.completion = this.loadJson<CompletionData>(DATA_FILES.completion);
			this.diagnostics = this.loadJson<DiagnosticData>(DATA_FILES.diagnostics);
			this.constraints = this.loadJson<ConstraintData>(DATA_FILES.constraints);
			this.ranges = this.loadJson<RangeData>(DATA_FILES.ranges);
			this.dependencies = this.loadJson<DependencyData>(DATA_FILES.dependencies);
			this.lastLoadError = null;
		} catch (error) {
			this.lastLoadError = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage('Failed to load QE data: ' + this.lastLoadError);
		}
	}

	private loadJson<T>(relativePath: string): T {
		let uri: vscode.Uri;
		if (this.customDataPath) {
			const fullPath = this.customDataPath + '/' + relativePath;
			uri = vscode.Uri.file(fullPath);
		} else {
			uri = vscode.Uri.joinPath(this.context.extensionUri, relativePath);
		}
		const content = fs.readFileSync(uri.fsPath, 'utf8');
		return JSON.parse(content) as T;
	}
}
