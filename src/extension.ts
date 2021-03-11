// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JsBodyProvider } from './jsBody';
import { JsNode } from './jsNode';
import { JsonOutlineProvider } from './jsonOutline';
import { JsOutlineProvider } from './jsOutline';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const scheme: string = "more";
	let bodyTextDocument: vscode.TextDocument | undefined;
	let bodyUri: vscode.Uri = strToMoreUri("");

	// TREEVIEW SAMPLE EXAMPLE
	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
	vscode.commands.registerCommand('morejs.refresh', () => jsonOutlineProvider.refresh());
	vscode.commands.registerCommand('morejs.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	vscode.commands.registerCommand('morejs.renameNode', offset => jsonOutlineProvider.rename(offset));

	// MOREJS  test
	const jsOutlineProvider = new JsOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsOutline', jsOutlineProvider);
	vscode.commands.executeCommand('setContext', 'jsOutlineEnabled', true);


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('morejs.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from morejs!');
	});


	const _leoFileSystem = new JsBodyProvider(jsOutlineProvider);
	// // * Start body pane system

	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider(scheme, _leoFileSystem, { isCaseSensitive: true })
	);

	vscode.commands.registerCommand('morejs.selectNode', (p_JsNode: JsNode) => {
		console.log('SHOW BODY GNX: ', p_JsNode.pnode.gnx);
		bodyUri = strToMoreUri("");// via global
		showBody();
		jsOutlineProvider.lastSelectedNode = p_JsNode;
	});

	function showBody(): Promise<vscode.TextEditor> {
		return Promise.resolve(vscode.workspace.openTextDocument(bodyUri)).then(p_document => {
			bodyTextDocument = p_document;

			const w_showOptions: vscode.TextDocumentShowOptions = {
				viewColumn: 1, // view column in which the editor should be shown
				preserveFocus: false, // an optional flag that when true will stop the editor from taking focus
				preview: true // should text document be in preview only? set false for fully opened
				// selection is instead set when the GET_BODY_STATES above resolves
			};

			return vscode.window.showTextDocument(bodyTextDocument, w_showOptions).then(w_bodyEditor => {
				// w_bodyEditor.options.lineNumbers = OFFSET ;
				return Promise.resolve(w_bodyEditor);
			});
		});

	}

	function triggerBodySave() {
		console.log('triggerBodySave');

	}
	function _onDocumentChanged(p_event: vscode.TextDocumentChangeEvent) {
		// ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
		if (p_event.contentChanges.length && p_event.document.uri.scheme === scheme) {
			console.log('MORE DOCUMENT EDITED!');
		}
	}

	function _onActiveEditorChanged(p_event: vscode.TextEditor | undefined) {

		triggerBodySave();
	}

	// * React to change in active panel/text editor (window.activeTextEditor) - also fires when the active editor becomes undefined
	vscode.window.onDidChangeActiveTextEditor(p_event => _onActiveEditorChanged(p_event));

	// * Triggers when a different text editor/vscode window changed focus or visibility, or dragged
	// This is also what triggers after drag and drop, see '_onChangeEditorViewColumn'
	vscode.window.onDidChangeTextEditorViewColumn(() => triggerBodySave());
	vscode.window.onDidChangeVisibleTextEditors(() => triggerBodySave());
	vscode.window.onDidChangeWindowState(() => triggerBodySave());

	// * React when typing and changing body pane
	vscode.workspace.onDidChangeTextDocument(p_event => _onDocumentChanged(p_event));

	// * React to opening of any file in vscode
	// vscode.workspace.onDidOpenTextDocument(p_document => _onDidOpenTextDocument(p_document));

	console.log('STARTED MOREJS');
	vscode.commands.getCommands().then(
		p_commands => console.log(p_commands.filter(p_cmd => p_cmd.startsWith('_')))
	);

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function strToMoreUri(p_str: string): vscode.Uri {
	return vscode.Uri.parse("more:/" + p_str);
}