import * as vscode from "vscode";

/**
 * * Opened More documents shown as a list with this TreeDataProvider implementation
 */
export class MoreDocumentsProvider implements vscode.TreeDataProvider<number> {

    private _onDidChangeTreeData: vscode.EventEmitter<number | undefined> = new vscode.EventEmitter<number | undefined>();

    readonly onDidChangeTreeData: vscode.Event<number | undefined> = this._onDidChangeTreeData.event;

    constructor() { }

    public getTreeItem(element: number): Thenable<vscode.TreeItem> | vscode.TreeItem {
        const w_node = new vscode.TreeItem('More Document' + element.toString());
        w_node.command = {
            command: 'morejs.openMoreDocument',
            title: '',
            arguments: [element]
        };
        return w_node;
    }

    public getChildren(element?: number): number[] {
        const w_children: number[] = [];
        // if called with element, or not ready, give back empty array as there won't be any children
        if (!element) {
            w_children.push(1);
            w_children.push(2);
        }
        return w_children; // Defaults to an empty list of children
    }

    public getParent(element: number): vscode.ProviderResult<number> {
        // Leo documents are just a list, as such, entries are always child of root, so return null
        return undefined;
    }

}