import * as vscode from 'vscode';
import { JsBodyProvider } from './moreBody';
import { MoreNode, MoreOutlineProvider } from './moreOutline';
/**
 * * Orchestrates More implementation into vscode
 */
export class More {


    // Outline global state variables
    public lastSelectedNode: MoreNode | undefined;

    // Body global state variables
    private _bodyUri: vscode.Uri = vscode.Uri.parse('more:/');
    get bodyUri(): vscode.Uri {
        return this._bodyUri;
    }
    set bodyUri(p_uri: vscode.Uri) {
        this._moreFileSystem.setBodyTime(p_uri);
        this._bodyUri = p_uri;
    }

    // (should be same as _bodyTextDocument if no multiple gnx body support?)
    private _bodyLastChangedDocument: vscode.TextDocument | undefined; // Only set in _onDocumentChanged WHEN USER TYPES.

    private _bodyTextDocument: vscode.TextDocument | undefined; // Set when selected in tree by user, or opening a 'more scheme' file in showBody. and by _locateOpenedBody.
    private _bodyMainSelectionColumn: vscode.ViewColumn | undefined; // Column of last body 'textEditor' found, set to 1

    constructor(
        private _moreOutlineProvider: MoreOutlineProvider,
        private _moreFileSystem: JsBodyProvider
    ) {
        vscode.window.onDidChangeActiveTextEditor((p_event) => this.triggerBodySave()); // also fires when the active editor becomes undefined
        vscode.window.onDidChangeTextEditorViewColumn(() => this.triggerBodySave()); // also triggers after drag and drop
        vscode.window.onDidChangeVisibleTextEditors(() => this.triggerBodySave()); // window.visibleTextEditors changed
        vscode.window.onDidChangeWindowState(() => this.triggerBodySave()); // focus state of the current window changes
        vscode.workspace.onDidChangeTextDocument((p_event) => this._onDocumentChanged(p_event)); // typing and changing body
    }

    /**
     * * Click or press enter on a node
     * @returns a promise resolving on a text editor of it's body pane.
     * TODO : Fix undefined return value to only return the promise to a text editor.
     */
    public selectNode(p_node: MoreNode, p_aside?: boolean): Thenable<vscode.TextEditor> | undefined {
        console.log('selectNode GNX: ', p_node.pnode.gnx);

        if (p_node === this.lastSelectedNode) {
            this._locateOpenedBody(p_node.pnode.gnx);
            return this.showBody(!!p_aside); // Voluntary exit
        }

        this.lastSelectedNode = p_node;

        this._tryApplyNodeToBody(p_node, !!p_aside, false);
    }

    private _tryApplyNodeToBody(p_node: MoreNode, p_aside: boolean, p_showBodyKeepFocus: boolean): Thenable<vscode.TextEditor> {
        this.triggerBodySave();
        this.lastSelectedNode = p_node;
        if (this._bodyTextDocument) {
            if (this._bodyTextDocument.isClosed || !this._locateOpenedBody(p_node.pnode.gnx)) {
                // if needs switching
                if (this.bodyUri.fsPath.substr(1) !== p_node.pnode.gnx) {
                    return this._bodyTextDocument.save()
                        .then(() => {
                            return this._switchBody(p_node.pnode.gnx);
                        }).then(() => {
                            return this.showBody(p_aside, p_showBodyKeepFocus);
                        });

                }
            }
        } else {
            // first time?
            this.bodyUri = vscode.Uri.parse('more:/' + p_node.pnode.gnx);
        }
        return this.showBody(p_aside, p_showBodyKeepFocus);
    }

    private _switchBody(p_newGnx: string): Thenable<boolean> {

        console.log('switchBody to ' + p_newGnx);

        const w_oldUri: vscode.Uri = this.bodyUri;

        const w_edit = new vscode.WorkspaceEdit();

        // * Set timestamps ?
        // this._leoFileSystem.setRenameTime(p_newGnx);

        w_edit.deleteFile(w_oldUri, { ignoreIfNotExists: true });

        // Promise to Delete first sync (as thenable),
        // tagged along with automatically removeFromRecentlyOpened in parallel
        return vscode.workspace.applyEdit(w_edit)
            .then(() => {
                // Set new uri and remove from 'Recently opened'
                this.bodyUri = vscode.Uri.parse('more:/' + p_newGnx);
                // async, so don't wait for this to finish
                if (w_oldUri.fsPath !== this.bodyUri.fsPath) {
                    vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', w_oldUri.path);
                }
                return Promise.resolve(true); // Resolving right away
            });
    }

    public showBody(p_aside: boolean, p_preserveFocus?: boolean): Thenable<vscode.TextEditor> {
        console.log('showBODY!');

        return Promise.resolve(vscode.workspace.openTextDocument(this.bodyUri)).then((p_document) => {
            this._bodyTextDocument = p_document;
            const w_showOptions: vscode.TextDocumentShowOptions = {
                viewColumn: p_aside ? vscode.ViewColumn.Beside : this._bodyMainSelectionColumn,
                preserveFocus: false,
                preview: true,
            };
            return vscode.window
                .showTextDocument(this._bodyTextDocument, w_showOptions)
                .then((w_bodyEditor) => {
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
        console.log('SAVE BODY BACK TO NODE!');

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

        //  else {
        // 	_bodyLastChangedDocument = undefined;
        // 	return _bodySaveSelection(); // not dirty so save cursor selection only
        // }
    }

    private _onDocumentChanged(p_event: vscode.TextDocumentChangeEvent) {
        // ".length" check necessary, see https://github.com/microsoft/vscode/issues/50344
        if (this.lastSelectedNode && p_event.contentChanges.length && p_event.document.uri.scheme === 'more') {
            console.log('MORE DOCUMENT EDITED!');
            // * There was an actual change on a Leo Body by the user
            this._bodyLastChangedDocument = p_event.document;

        }
    }
}