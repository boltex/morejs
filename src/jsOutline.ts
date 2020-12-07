import * as vscode from 'vscode';
import { JsNode } from './jsNode';
import { ProviderResult } from "vscode";
import { Icon, PNode } from './types';


export class JsOutlineProvider implements vscode.TreeDataProvider<JsNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<JsNode | undefined> = new vscode.EventEmitter<JsNode | undefined>();

    private _icons: Icon[];

    private _model: PNode[] = [
        {
            header: "node1",
            body: "node1 body",
            children: []
        },
        {
            header: "node2",
            body: "node2 body",
            children: []
        },

        {
            header: "node3",
            body: "node3 body",
            children: []
        },
    ];

    constructor(private _context: vscode.ExtensionContext) {
        this._icons = this._buildNodeIconPaths(_context);
    }


    /**
     * * Refresh the whole outline
     */
    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: JsNode): Thenable<JsNode> | JsNode {
        return element;
    }

    public getChildren(element?: JsNode): Thenable<JsNode[]> {
        if (element) {
            return Promise.resolve(this._jsNodeArray(element.pnode.children));
        } else {
            return Promise.resolve(this._jsNodeArray(this._model));
        }
    }

    public getParent(element: JsNode): ProviderResult<JsNode> | null {
        // Buttons are just a list, as such, entries are always child of root so return null
        return null;
    }

    private _buildNodeIconPaths(p_context: vscode.ExtensionContext): Icon[] {
        return Array(16).fill("").map((p_val, p_index) => {
            return {
                light: p_context.asAbsolutePath("resources/light/box" + this._padNumber2(p_index) + ".svg"),
                dark: p_context.asAbsolutePath("resources/dark/box" + this._padNumber2(p_index) + ".svg")
            };
        });
    }

    private _jsNodeArray(p_children: PNode[]): JsNode[] {
        const w_children: JsNode[] = [];
        if (p_children && p_children.length) {
            p_children.forEach(p_node => {
                w_children.push(new JsNode(p_node.header,
                    vscode.TreeItemCollapsibleState.None,
                    p_node,
                    false,
                    !!p_node.body && !!p_node.body.length,
                    this._icons
                ));
            });
        }
        return w_children;
    }

    private _padNumber2(p_number: number): string {
        return ("0" + p_number).slice(-2);
    }

}