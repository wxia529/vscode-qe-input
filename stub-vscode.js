const path = require('path');

class Position {
	constructor(line, character) {
		this.line = line;
		this.character = character;
	}
}

class Range {
	constructor(start, end) {
		this.start = start;
		this.end = end;
	}
	contains(position) {
		return (
			position.line >= this.start.line &&
			position.line <= this.end.line &&
			(position.line !== this.start.line || position.character >= this.start.character) &&
			(position.line !== this.end.line || position.character <= this.end.character)
		);
	}
	isEmpty() {
		return this.start.line === this.end.line && this.start.character === this.end.character;
	}
	isSingleLine() {
		return this.start.line === this.end.line;
	}
	isEqual(other) {
		return this.start.line === other.start.line && this.start.character === other.start.character &&
			this.end.line === other.end.line && this.end.character === other.end.character;
	}
	intersection(other) {
		return null;
	}
	union(other) {
		return this;
	}
	with() {
		return this;
	}
}

class Uri {
	static parse(value) {
		return new Uri(value);
	}
	static joinPath(base, ...paths) {
		return new Uri(path.join(base.path, ...paths));
	}
	static file(path) {
		return new Uri(path);
	}
	constructor(path) {
		this.path = path;
		this.scheme = 'file';
		this.authority = '';
		this.query = '';
		this.fragment = '';
		this.fsPath = path;
	}
	toString() {
		return this.path;
	}
	toJSON() {
		return { scheme: this.scheme, path: this.path };
	}
}

class MarkdownString {
	constructor(value) {
		this.value = value;
	}
	appendMarkdown(value) {
		this.value += '\n' + value;
		return this;
	}
}

const EndOfLine = { LF: 1, CRLF: 2 };

const CompletionItemKind = {
	Keyword: 0,
	Property: 1,
	Value: 2,
	Method: 3,
	Function: 4,
	Field: 5,
	Variable: 6,
	Class: 7,
	Interface: 8,
	Module: 9,
	Unit: 10,
	Enum: 11,
	Constant: 12,
	Struct: 13,
	Event: 14,
	Operator: 15,
	TypeParameter: 16,
	Snippet: 17,
	Text: 18,
	Color: 19,
	File: 20,
	Reference: 21,
	Folder: 22,
	EnumMember: 23,
	Constant: 24,
	User: 25,
	Issue: 26
};

const DiagnosticSeverity = {
	Error: 0,
	Warning: 1,
	Information: 2,
	Hint: 3
};

class CompletionItem {
	constructor(label, kind) {
		this.label = label;
		this.kind = kind;
	}
}

class Diagnostic {
	constructor(range, message, severity) {
		this.range = range;
		this.message = message;
		this.severity = severity;
	}
}

class Hover {
	constructor(contents, range) {
		this.contents = contents;
		this.range = range;
	}
}

const vscode = {
	Position,
	Range,
	Uri,
	MarkdownString,
	EndOfLine,
	CompletionItemKind,
	DiagnosticSeverity,
	CompletionItem,
	Diagnostic,
	Hover,
	window: {
		showInformationMessage: () => {},
		showErrorMessage: () => {}
	},
	workspace: {
		onDidOpenTextDocument: () => ({ dispose: () => {} }),
		onDidChangeTextDocument: () => ({ dispose: () => {} }),
		onDidCloseTextDocument: () => ({ dispose: () => {} }),
		createDiagnosticCollection: (name) => ({
			set: () => {},
			delete: () => {},
			clear: () => {},
			name,
			dispose: () => {}
		})
	},
	languages: {
		registerCompletionItemProvider: () => ({ dispose: () => {} }),
		registerHoverProvider: () => ({ dispose: () => {} }),
		createDiagnosticCollection: (name) => ({
			set: () => {},
			delete: () => {},
			clear: () => {},
			name,
			dispose: () => {}
		})
	},
	ExtensionContext: class {
		constructor() {
			this.subscriptions = [];
			this.extensionUri = Uri.parse('file:///');
		}
	},
	DiagnosticCollection: class {
		constructor(name) {
			this.name = name;
		}
		set() {}
		delete() {}
		clear() {}
		dispose() {}
	}
};

// Mock vscode module
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
	if (request === 'vscode') {
		return vscode;
	}
	return originalLoad.apply(this, arguments);
};