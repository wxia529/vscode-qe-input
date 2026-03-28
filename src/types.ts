import * as vscode from 'vscode';

export type CompletionSection = {
	sectionType: string;
	variables: Record<string, CompletionVariable>;
	cardOptions?: {
		options: string[];
		default?: string | null;
	};
};

export type CompletionVariable = {
	name: string;
	section: string;
	sectionType: string;
	type: string;
	default: string | null;
	description: string | null;
	options: string[];
	units: string | null;
	range: string | null;
	constraints: CompletionConstraints | null;
};

export type CompletionConstraints = {
	requires: string[];
	conflicts: string[];
	implies: string[];
	validWhen: string[];
};

export type CompletionData = {
	sections: Record<string, CompletionSection>;
};

export type DiagnosticEntry = {
	type: string;
	options: string[];
	default: string | null;
	range: string | null;
	units: string | null;
	section: string;
};

export type DiagnosticData = {
	variables: Record<string, DiagnosticEntry>;
};

export type ConstraintData = {
	variables: Record<string, CompletionConstraints>;
};

export type RangeEntry = {
	range: string | null;
	units: string | null;
};

export type RangeData = {
	variables: Record<string, RangeEntry>;
};

export type ParsedEntry = {
	section: string;
	name: string;
	value: string;
	range: vscode.Range;
};

export type AssignmentIndex = {
	bySection: Record<string, Record<string, string>>;
};

export type SectionIssue = {
	message: string;
	range: vscode.Range;
};

export type DependencyData = {
	variables: Record<string, {
		requires: Record<string, string>;
		conflicts?: Record<string, string>;
		implies?: Record<string, string>;
	}>;
};
