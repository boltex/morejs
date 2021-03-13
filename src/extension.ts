// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JsBodyProvider } from './moreBody';
import { JsonOutlineProvider } from './jsonOutline';
import { MoreOutlineProvider, MoreNode } from './moreOutline';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Starting morejs activation');

	// TREEVIEW SAMPLE EXAMPLE
	const jsonOutlineProvider = new JsonOutlineProvider(context);

	context.subscriptions.push(vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider));
	context.subscriptions.push(vscode.commands.registerCommand('morejs.refresh', () => jsonOutlineProvider.refresh()));
	context.subscriptions.push(vscode.commands.registerCommand('morejs.refreshNode', offset => jsonOutlineProvider.refresh(offset)));
	context.subscriptions.push(vscode.commands.registerCommand('morejs.renameNode', offset => jsonOutlineProvider.rename(offset)));

	// MOREJS Body pane implementation
	const scheme: string = "more";
	let bodyTextDocument: vscode.TextDocument | undefined;
	let _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged

	let bodyUri: vscode.Uri = strToMoreUri("");

	const moreOutlineProvider = new MoreOutlineProvider(context);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('jsOutline', moreOutlineProvider));
	vscode.commands.executeCommand('setContext', 'jsOutlineEnabled', true);

	const _leoFileSystem = new JsBodyProvider(moreOutlineProvider);

	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider(scheme, _leoFileSystem, { isCaseSensitive: true })
	);

	vscode.commands.registerCommand('morejs.selectNode', (p_JsNode: MoreNode) => {
		console.log('SHOW BODY GNX: ', p_JsNode.pnode.gnx);
		bodyUri = strToMoreUri(p_JsNode.pnode.gnx);// via global
		showBody();
		moreOutlineProvider.lastSelectedNode = p_JsNode;
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

	function _bodySaveDocument(p_document: vscode.TextDocument, p_forcedVsCodeSave?: boolean): Promise<boolean> {
		console.log('SAVE BODY BACK TO NODE!');

		return Promise.resolve(true);
	}

	function triggerBodySave(p_forcedVsCodeSave?: boolean): Promise<boolean> {
		// * Save body to Leo if a change has been made to the body 'document' so far
		if (_bodyLastChangedDocument && _bodyLastChangedDocument.isDirty) {
			const w_document = _bodyLastChangedDocument; // backup for bodySaveDocument before reset
			_bodyLastChangedDocument = undefined; // reset to make falsy
			return _bodySaveDocument(w_document, p_forcedVsCodeSave);
		} else {
			return Promise.resolve(false);
		}

		//  else {
		// 	_bodyLastChangedDocument = undefined;
		// 	return _bodySaveSelection(); // not dirty so save cursor selection only
		// }
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

	console.log('Finished activating morejs');
}

// this method is called when your extension is deactivated
export function deactivate() { }

function strToMoreUri(p_str: string): vscode.Uri {
	return vscode.Uri.parse("more:/" + p_str);
}