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

	// SHORTCUTS *******************************************************************************
	function subPush(p_disposable: vscode.Disposable) {
		context.subscriptions.push(p_disposable);
	}
	const regTree = vscode.window.registerTreeDataProvider;
	const regCmd = vscode.commands.registerCommand;
	const regFileSys = vscode.workspace.registerFileSystemProvider;

	// TREEVIEW SAMPLE EXAMPLE *****************************************************************
	const jsonOutlineProvider = new JsonOutlineProvider(context);
	subPush(regTree('jsonOutline', jsonOutlineProvider));
	subPush(regCmd('morejs.refresh', () => jsonOutlineProvider.refresh()));
	subPush(regCmd('morejs.refreshNode', offset => jsonOutlineProvider.refresh(offset)));
	subPush(regCmd('morejs.renameNode', offset => jsonOutlineProvider.rename(offset)));

	// MOREJS BODY PANE IMPLEMENTATION *********************************************************
	const scheme: string = "more";
	let bodyTextDocument: vscode.TextDocument | undefined;
	let _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged
	let bodyUri: vscode.Uri = strToMoreUri("");
	const moreOutlineProvider = new MoreOutlineProvider(context);
	const _leoFileSystem = new JsBodyProvider(moreOutlineProvider);

	subPush(regTree('jsOutline', moreOutlineProvider));
	subPush(regFileSys(scheme, _leoFileSystem, { isCaseSensitive: true }));
	subPush(regCmd('morejs.selectNode', p_JsNode => selectNode(p_JsNode)));

	vscode.window.onDidChangeActiveTextEditor(p_event => triggerBodySave()); // also fires when the active editor becomes undefined
	vscode.window.onDidChangeTextEditorViewColumn(() => triggerBodySave()); // also triggers after drag and drop
	vscode.window.onDidChangeVisibleTextEditors(() => triggerBodySave()); // window.visibleTextEditors changed
	vscode.window.onDidChangeWindowState(() => triggerBodySave()); // focus state of the current window changes
	vscode.workspace.onDidChangeTextDocument(p_event => _onDocumentChanged(p_event)); // typing and changing body

	function selectNode(p_JsNode: MoreNode): void {
		console.log('SELECT NODE GNX: ', p_JsNode.pnode.gnx);
		bodyUri = strToMoreUri(p_JsNode.pnode.gnx);// via global
		showBody();
		moreOutlineProvider.lastSelectedNode = p_JsNode;
	}

	function showBody(): Promise<vscode.TextEditor> {
		return Promise.resolve(vscode.workspace.openTextDocument(bodyUri)).then(p_document => {
			bodyTextDocument = p_document;
			const w_showOptions: vscode.TextDocumentShowOptions = { viewColumn: 1, preserveFocus: false, preview: true };
			return vscode.window.showTextDocument(bodyTextDocument, w_showOptions).then(w_bodyEditor => {
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

	vscode.commands.executeCommand('setContext', 'moreOutlineEnabled', true);

	console.log('Finished activating morejs');
}

// this method is called when your extension is deactivated
export function deactivate() { }

function strToMoreUri(p_str: string): vscode.Uri {
	return vscode.Uri.parse("more:/" + p_str);
}