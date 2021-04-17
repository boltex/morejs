import * as vscode from 'vscode';
import { JsBodyProvider } from './moreBody';
import { MoreDocumentsProvider } from './moreDocuments';
import { MoreOutlineProvider, PNode } from './moreOutline';

/**
 * * Orchestrates More implementation into vscode
 */
export class More {

    private _moreOutlineProvider: MoreOutlineProvider;
    private _moreTreeView: vscode.TreeView<PNode>;

    private _moreDocumentsProvider: MoreDocumentsProvider;
    private _moreDocumentsTreeView: vscode.TreeView<number>;

    private _moreFileSystem: JsBodyProvider;

    // Selected node set in tree model or last selected by user
    public lastSelectedNode: PNode | undefined; // * LEOINTEG: this has a setter getter to change context flags (marked/unmarked)

    // Body global state variables
    private _bodyUri: vscode.Uri = vscode.Uri.parse('more:/');
    get bodyUri(): vscode.Uri {
        return this._bodyUri;
    }
    set bodyUri(p_uri: vscode.Uri) {
        this._moreFileSystem.setBodyTime(p_uri); // * LEOINTEG: this is called 'setBodyTime'
        this._bodyUri = p_uri;
    }

    // Should be same as _bodyTextDocument if no multiple gnx body support?
    private _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged WHEN USER TYPES.
    private _bodyPreviewMode: boolean = true;

    private _bodyTextDocument: vscode.TextDocument | undefined; // Set when selected in tree by user, or opening a 'more scheme' file in showBody. and by _locateOpenedBody.
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined; // Column of last body 'textEditor' found, set to 1

    constructor(
        private _context: vscode.ExtensionContext,
    ) {
        this._moreOutlineProvider = new MoreOutlineProvider(_context, this);
        this._moreTreeView = vscode.window.createTreeView('moreOutline', { showCollapseAll: false, treeDataProvider: this._moreOutlineProvider });
        this._moreTreeView.onDidExpandElement((p_event => this.onChangeCollapsedState(p_event, true)));
        this._moreTreeView.onDidCollapseElement((p_event => this.onChangeCollapsedState(p_event, false)));

        this._moreDocumentsProvider = new MoreDocumentsProvider();
        this._moreDocumentsTreeView = vscode.window.createTreeView('moreDocuments', { showCollapseAll: false, treeDataProvider: this._moreDocumentsProvider });

        this._moreFileSystem = new JsBodyProvider(this._moreOutlineProvider);

        this._context.subscriptions.push(this._moreTreeView);
        this._context.subscriptions.push(this._moreDocumentsTreeView);
        this._context.subscriptions.push(vscode.workspace.registerFileSystemProvider('more', this._moreFileSystem, { isCaseSensitive: true }));

        // Windows 'onDidChange' events are used to (re)close extraneous bodies
        vscode.window.onDidChangeActiveTextEditor((p_event) => this.changedActiveTextEditor(p_event)); // Also fires when the active editor becomes undefined
        vscode.window.onDidChangeTextEditorViewColumn((p_event) => this.changedTextEditorViewColumn(p_event)); // Also triggers after drag and drop
        vscode.window.onDidChangeVisibleTextEditors((p_event) => this.changedVisibleTextEditors(p_event)); // Window.visibleTextEditors changed
        vscode.window.onDidChangeWindowState((p_event) => this.changedWindowState(p_event)); // Focus state of the current window changes

        vscode.workspace.onDidChangeTextDocument((p_event) => this._onDocumentChanged(p_event)); // Typing and changing body

        // Initialize MORE Documents list to have the first one selected
        setTimeout(() => {
            this._moreDocumentsTreeView.reveal(1, { select: true, focus: false, expand: false });
        }, 0);
    }

    private _hideDeleteBody(p_textEditor: vscode.TextEditor): void {
        console.log('DELETE EXTRANEOUS:', p_textEditor.document.uri.fsPath);
        const w_edit = new vscode.WorkspaceEdit();
        w_edit.deleteFile(p_textEditor.document.uri, { ignoreIfNotExists: true });
        if (p_textEditor.hide) {
            p_textEditor.hide();
        }
        vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', p_textEditor.document.uri.path);
    }

    public changedActiveTextEditor(p_event: vscode.TextEditor | undefined): void {
        if (p_event && p_event.document.uri.scheme === 'more') {
            console.log('changedActiveTextEditor: gnx', p_event.document.uri.fsPath);
            if (this.bodyUri.fsPath !== p_event.document.uri.fsPath) {
                this._hideDeleteBody(p_event);
            }
        }
        this.triggerBodySave(true);
    }
    public changedTextEditorViewColumn(p_event: vscode.TextEditorViewColumnChangeEvent): void {
        if (p_event && p_event.textEditor.document.uri.scheme === 'more') {
            console.log('changedTextEditorViewColumn: gnx', p_event.textEditor.document.uri.fsPath);
        }
        this.triggerBodySave(true);
    }
    public changedVisibleTextEditors(p_event: vscode.TextEditor[]): void {
        if (p_event && p_event.length) {
            p_event.forEach(p_textEditor => {
                if (p_textEditor && p_textEditor.document.uri.scheme === 'more') {
                    console.log('changedVisibleTextEditors: gnx', p_textEditor.document.uri.fsPath);
                    if (this.bodyUri.fsPath !== p_textEditor.document.uri.fsPath) {
                        this._hideDeleteBody(p_textEditor);
                    }
                }
            });
        }
        this.triggerBodySave(true);
    }
    public changedWindowState(p_event: vscode.WindowState): void {
        // no other action
        this.triggerBodySave(true);
    }

    public onChangeCollapsedState(p_event: vscode.TreeViewExpansionEvent<PNode>, p_expand: boolean): void {
        this.triggerBodySave(true);
        if (this._moreTreeView.selection[0] && this._moreTreeView.selection[0] === p_event.element) {
            // * This happens if the tree selection is the same as the expanded/collapsed node: Just have Leo do the same
            // Pass
        } else {
            // * This part only happens if the user clicked on the arrow without trying to select the node
            // this._revealTreeViewNode(p_event.element, { select: true, focus: false }); // No force focus : it breaks collapse/expand when direct parent
            this._moreTreeView.reveal(p_event.element, { select: true, focus: false });
            this.selectTreeNode(p_event.element, true, false);  // not waiting for a .then(...) so not to add any lag
        }
        // * if in leoIntegration send action to Leo to select & expand.
    }

    public revealTreeViewNode(element: PNode, p_options: { select?: boolean, focus?: boolean }): Thenable<void> {
        this._moreTreeView.reveal(element, p_options);
        return Promise.resolve();
    }

    // * LEOINTEG: This is handled by the leoDocuments tree and switch leo-documents methods
    public switchDocument(p_id: number): void {
        this._moreOutlineProvider.switchModel(p_id);
        this._moreOutlineProvider.refreshTreeRoot();
    }

    /**
     * * Click or press enter on a node
     * @returns a promise resolving on a text editor of it's body pane.
     * TODO : Fix undefined return value to only return the promise to a text editor.
     */
    public selectTreeNode(p_node: PNode, p_internalCall?: boolean, p_aside?: boolean): Thenable<vscode.TextEditor> | undefined {
        this.triggerBodySave();

        if (p_node === this.lastSelectedNode) {
            this._locateOpenedBody(p_node.gnx);
            return this.showBody(!!p_aside); // Voluntary exit
        }

        this.lastSelectedNode = p_node;

        this.applyNodeToBody(p_node, !!p_aside, false);
    }

    public applyNodeToBody(p_node: PNode, p_aside: boolean, p_showBodyKeepFocus: boolean): Thenable<vscode.TextEditor> {
        this.triggerBodySave(); // can be called directly so trigger body save also even if called in selectNode
        this.lastSelectedNode = p_node;
        if (this._bodyTextDocument) {
            if (this._bodyTextDocument.isClosed || !this._locateOpenedBody(p_node.gnx)) {
                // if needs switching
                if (this.bodyUri.fsPath.substr(1) !== p_node.gnx) {
                    return this._bodyTextDocument.save()
                        .then(() => {
                            return this._switchBody(p_node.gnx, p_aside, p_showBodyKeepFocus);
                        });
                }
            }
        } else {
            // first time?
            this.bodyUri = vscode.Uri.parse('more:/' + p_node.gnx);
        }
        return this.showBody(p_aside, p_showBodyKeepFocus);
    }

    private _switchBody(p_newGnx: string, p_aside: boolean, p_preserveFocus?: boolean): Thenable<vscode.TextEditor> {

        const w_oldUri: vscode.Uri = this.bodyUri;

        // ? Set timestamps ?
        // this._leoFileSystem.setRenameTime(p_newGnx);

        const w_edit = new vscode.WorkspaceEdit();
        w_edit.deleteFile(w_oldUri, { ignoreIfNotExists: true });

        if (this._bodyPreviewMode) {
            // just show in same column and delete after
            this.bodyUri = vscode.Uri.parse('more:/' + p_newGnx);
            const q_showBody = this.showBody(p_aside, p_preserveFocus);
            vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri.path);
            return q_showBody;
        } else {
            // Gotta delete to close all and re-open, so:
            // Promise to Delete first, synchronously (as thenable),
            // tagged along with automatically removeFromRecentlyOpened in parallel
            return vscode.workspace.applyEdit(w_edit)
                .then(() => {
                    // Set new uri and remove from 'Recently opened'
                    this._bodyPreviewMode = true;
                    this.bodyUri = vscode.Uri.parse('more:/' + p_newGnx);
                    // async, so don't wait for this to finish
                    if (w_oldUri.fsPath !== this.bodyUri.fsPath) {
                        vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri.path);
                    }
                    return this.showBody(p_aside, p_preserveFocus);
                });
        }
    }

    public showBody(p_aside: boolean, p_preserveFocus?: boolean): Thenable<vscode.TextEditor> {
        return vscode.workspace.openTextDocument(this.bodyUri)
            .then((p_document) => {
                this._bodyTextDocument = p_document;
                const w_showOptions: vscode.TextDocumentShowOptions = {
                    viewColumn: p_aside ? vscode.ViewColumn.Beside : this._bodyMainSelectionColumn,
                    preserveFocus: false,
                    preview: true // ! THIS DOES NOT CHANGE A NON-DIRTY TEXT DOCUMENT BACK TO PREVIEW MODE
                };
                return vscode.window
                    .showTextDocument(this._bodyTextDocument, w_showOptions)
                    .then((w_bodyEditor) => {
                        if (w_bodyEditor.viewColumn) {
                            this._bodyMainSelectionColumn = w_bodyEditor.viewColumn;
                        }
                        return Promise.resolve(w_bodyEditor);
                    });
            });
    }

    private _locateOpenedBody(p_gnx: string): boolean {
        let w_found = false;
        this._bodyMainSelectionColumn = 1;
        // * Only gets to visible editors, not every tab per editor
        vscode.window.visibleTextEditors.forEach(p_textEditor => {
            if (p_textEditor.document.uri.fsPath.substr(1) === p_gnx) {
                w_found = true;
                this._bodyTextDocument = p_textEditor.document;
                this._bodyMainSelectionColumn = p_textEditor.viewColumn;
            }
        });
        return w_found;
    }

    private _bodySaveDocument(
        p_document: vscode.TextDocument,
        p_forcedVsCodeSave?: boolean
    ): Thenable<boolean> {
        this._moreOutlineProvider.bodies[p_document.uri.fsPath.substr(1)] = p_document.getText();

        if (p_forcedVsCodeSave) {
            return p_document.save(); // ! This trims trailing spaces
        }
        return Promise.resolve(p_document.isDirty);
    }

    public triggerBodySave(p_forcedVsCodeSave?: boolean): Thenable<boolean> {
        // * Save body to Leo if a change has been made to the body 'document' so far
        if (this._bodyLastChangedDocument && this._bodyLastChangedDocument.isDirty) {
            const w_document = this._bodyLastChangedDocument; // backup for bodySaveDocument before reset
            this._bodyLastChangedDocument = undefined; // reset to make falsy
            return this._bodySaveDocument(w_document, p_forcedVsCodeSave);
        } else {
            return Promise.resolve(false);
        }
    }

    private _onDocumentChanged(p_event: vscode.TextDocumentChangeEvent) {
        // ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if (this.lastSelectedNode && p_event.contentChanges.length && p_event.document.uri.scheme === 'more') {
            // * There was an actual change on a Leo Body by the user
            this._bodyPreviewMode = false;
            this._bodyLastChangedDocument = p_event.document;
        }
    }

    public test(): void {
        console.log('test save !!', this.bodyUri.fsPath);
        vscode.window.showInformationMessage("Test save!! " + this.bodyUri.fsPath);

        if (this._bodyTextDocument) {
            this.triggerBodySave(true)
                .then(() => {
                    const w_showOptions: vscode.TextDocumentShowOptions = {
                        viewColumn: this._bodyMainSelectionColumn,
                        preserveFocus: false,
                        preview: true,
                    };
                    vscode.window.showTextDocument(this._bodyTextDocument!, w_showOptions).then((p_editor: vscode.TextEditor) => {
                        console.log('done reopening');


                    });

                });
        }
    }

}