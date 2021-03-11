import * as vscode from 'vscode';
import { JsNode } from './jsNode';
import { Icon, PNode } from './types';

export class JsOutlineProvider implements vscode.TreeDataProvider<JsNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<JsNode | undefined> = new vscode.EventEmitter<JsNode | undefined>();

    private _icons: Icon[];

    public model: PNode[] = [
        {
            header: "node1",
            gnx: "1",
            children: []
        },
        {
            header: "node2",
            gnx: "2",
            children: []
        },

        {
            header: "node3",
            gnx: "3",
            children: [
                {
                    header: "childNode4",
                    gnx: "4",
                    children: []
                },
                {
                    header: "childNode5",
                    gnx: "5",
                    children: []
                }
            ]
        },
    ];

    public bodies: { [key: string]: string } = {
        "1": "node1 body",
        "2": "node2 body",
        "3": "node3 body",
        "4": "node4 body",
        "5": "node5 body"
    };

    public lastSelectedNode: JsNode | undefined;

    constructor(private _context: vscode.ExtensionContext) {
        this._icons = this._buildNodeIconPaths(_context);
        console.log('Starting MOREJS tree provider');

    }

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
            return Promise.resolve(this._jsNodeArray(this.model));
        }
    }

    private _buildNodeIconPaths(p_context: vscode.ExtensionContext): Icon[] {
        return Array(16).fill("").map((p_val, p_index) => {
            return {
                light: p_context.asAbsolutePath("resources/light/box" + ("0" + p_index).slice(-2) + ".svg"),
                dark: p_context.asAbsolutePath("resources/dark/box" + ("0" + p_index).slice(-2) + ".svg")
            };
        });
    }

    private _jsNodeArray(p_children: PNode[]): JsNode[] {
        const w_children: JsNode[] = [];
        if (p_children && p_children.length) {
            p_children.forEach(p_node => {
                let w_body = this.bodies[p_node.gnx];
                w_children.push(new JsNode(p_node.header,
                    p_node.children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    p_node,
                    false,
                    !!w_body && !!w_body.length,
                    this._icons
                ));
            });
        }
        return w_children;
    }

}