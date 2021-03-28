// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JsBodyProvider } from './moreBody';
import { JsonOutlineProvider } from './jsonOutline';
import { MoreOutlineProvider, MoreNode } from './moreOutline';

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
    subPush(regCmd('morejs.refreshNode', (offset) => jsonOutlineProvider.refresh(offset)));
    subPush(regCmd('morejs.renameNode', (offset) => jsonOutlineProvider.rename(offset)));

    // MOREJS BODY PANE IMPLEMENTATION *********************************************************
    const scheme: string = 'more';
    const moreOutlineProvider = new MoreOutlineProvider(context);
    const _leoFileSystem = new JsBodyProvider(moreOutlineProvider);

    // Outline global state variables
    let lastSelectedNode: MoreNode | undefined;

    // Body global state variables
    let bodyUri: vscode.Uri = vscode.Uri.parse('more:/');
    let _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged
    let _bodyTextDocument: vscode.TextDocument | undefined; // Set when selected in tree by user, or opening a Leo file in showBody. and by _locateOpenedBody.
    let _bodyMainSelectionColumn: vscode.ViewColumn | undefined; // Column of last body 'textEditor' found, set to 1

    subPush(regTree('jsOutline', moreOutlineProvider));
    subPush(regFileSys(scheme, _leoFileSystem, { isCaseSensitive: true }));
    subPush(regCmd('morejs.selectNode', (p_JsNode) => selectNode(p_JsNode)));

    vscode.window.onDidChangeActiveTextEditor((p_event) => triggerBodySave()); // also fires when the active editor becomes undefined
    vscode.window.onDidChangeTextEditorViewColumn(() => triggerBodySave()); // also triggers after drag and drop
    vscode.window.onDidChangeVisibleTextEditors(() => triggerBodySave()); // window.visibleTextEditors changed
    vscode.window.onDidChangeWindowState(() => triggerBodySave()); // focus state of the current window changes
    vscode.workspace.onDidChangeTextDocument((p_event) => _onDocumentChanged(p_event)); // typing and changing body

    /**
     * * Click or press enter on a node
     * @returns a promise resolving on a text editor of it's body pane.
     * TODO : Fix undefined return value to only return the promise to a text editor.
     */
    function selectNode(p_node: MoreNode, p_aside?: boolean): Promise<vscode.TextEditor> | undefined {
        console.log('selectNode GNX: ', p_node.pnode.gnx);

        if (p_node === lastSelectedNode) {
            _locateOpenedBody(p_node.pnode.gnx);
            return showBody(!!p_aside); // Voluntary exit
        }

        lastSelectedNode = p_node;
        bodyUri = vscode.Uri.parse('more:/' + p_node.pnode.gnx);

        _tryApplyNodeToBody(p_node, !!p_aside, false, true);
    }

    function _tryApplyNodeToBody(p_node: MoreNode, p_aside: boolean, p_showBodyKeepFocus: boolean, p_force_open?: boolean): void {

        triggerBodySave();
        lastSelectedNode = p_node;
        if (_bodyTextDocument) {
            if (!_bodyTextDocument.isClosed && _locateOpenedBody(p_node.pnode.gnx)) {
                // this gnx still opened and visible
                // this.bodyUri = utils.strToLeoUri(p_params.node.gnx); // ? NECESSARY ?
                showBody(p_aside, p_showBodyKeepFocus);
            } else {
                _switchBody(p_node.pnode.gnx).then(() => {
                    showBody(p_aside, p_showBodyKeepFocus);
                });
            }
        } else {

            bodyUri = vscode.Uri.parse('more:/' + p_node.pnode.gnx);
            showBody(p_aside, p_showBodyKeepFocus);

        }

    }

    function _switchBody(p_newGnx: string): Thenable<boolean> {
        if (_bodyTextDocument) {
            return _bodyTextDocument.save()
                // .then((p_result) => {
                //     const w_edit = new vscode.WorkspaceEdit();
                //     _leoFileSystem.setRenameTime(p_newGnx);
                //     w_edit.renameFile(
                //         bodyUri, // Old URI from last node
                //         utils.strToLeoUri(p_newGnx), // New URI from selected node
                //         { overwrite: true }
                //     );
                //     return vscode.workspace.applyEdit(w_edit);
                // })
                .then(p_result => {
                    const w_oldUri: vscode.Uri = bodyUri;
                    // * Old is now set to new!
                    bodyUri = vscode.Uri.parse('more:/' + p_newGnx);

                    // TODO : CLEAR UNDO HISTORY AND FILE HISTORY
                    if (w_oldUri.fsPath !== bodyUri.fsPath) {
                        vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri.path);
                    }
                    return Promise.resolve(p_result);
                });
        } else {
            return Promise.resolve(false);
        }
    }

    function showBody(p_aside: boolean, p_preserveFocus?: boolean): Promise<vscode.TextEditor> {
        console.log('showBODY!');

        return Promise.resolve(vscode.workspace.openTextDocument(bodyUri)).then((p_document) => {
            _bodyTextDocument = p_document;
            const w_showOptions: vscode.TextDocumentShowOptions = {
                viewColumn: 1,
                preserveFocus: false,
                preview: true,
            };
            return vscode.window
                .showTextDocument(_bodyTextDocument, w_showOptions)
                .then((w_bodyEditor) => {
                    return Promise.resolve(w_bodyEditor);
                });
        });
    }

    function _locateOpenedBody(p_gnx: string): boolean {
        let w_found = false;
        // * Only gets to visible editors, not every tab per editor
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.fsPath.substr(1) === p_gnx) {
                w_found = true;
                _bodyTextDocument = p_textEditor.document;
                _bodyMainSelectionColumn = p_textEditor.viewColumn;
            }
        });
        return w_found;
    }

    function _bodySaveDocument(
        p_document: vscode.TextDocument,
        p_forcedVsCodeSave?: boolean
    ): Thenable<boolean> {
        console.log('SAVE BODY BACK TO NODE!');

        moreOutlineProvider.bodies[p_document.uri.fsPath.substr(1)] = p_document.getText();

        if (p_forcedVsCodeSave) {
            return p_document.save(); // ! This trims trailing spaces
        }
        return Promise.resolve(p_document.isDirty);
    }

    function triggerBodySave(p_forcedVsCodeSave?: boolean): Thenable<boolean> {
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
