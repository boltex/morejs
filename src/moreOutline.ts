import * as vscode from 'vscode';

interface PNode {
    header: string;
    gnx: string;
    children: PNode[];
    parent?: PNode;
}
/**
 * * Icon path names used in leoNodes for rendering in treeview
 */
interface Icon {
    light: string;
    dark: string;
}

export class MoreOutlineProvider implements vscode.TreeDataProvider<MoreNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        MoreNode | undefined
    > = new vscode.EventEmitter<MoreNode | undefined>();

    private _icons: Icon[];

    public model: PNode[] = [
        {
            header: 'node1',
            gnx: '1',
            children: [],
        },
        {
            header: 'node2',
            gnx: '2',
            children: [],
        },
        {
            header: 'node3',
            gnx: '3',
            children: [
                {
                    header: 'childNode4',
                    gnx: '4',
                    children: [],
                },
                {
                    header: 'childNode5',
                    gnx: '5',
                    children: [],
                },
            ],
        },
    ];

    public bodies: { [gnx: string]: string } = {
        '1': 'node1 body',
        '2': 'node2 body',
        '3': 'node3 body',
        '4': 'node4 body',
        '5': 'node5 body',
    };

    constructor(private _context: vscode.ExtensionContext) {
        this._icons = this._buildNodeIconPaths(_context);
        console.log('Starting MOREJS tree provider');
    }

    public refreshTreeRoot(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: MoreNode): Thenable<MoreNode> | MoreNode {
        return element;
    }

    public getChildren(element?: MoreNode): Thenable<MoreNode[]> {
        if (element) {
            return Promise.resolve(this._nodeArray(element.pnode.children));
        } else {
            return Promise.resolve(this._nodeArray(this.model));
        }
    }

    private _buildNodeIconPaths(p_context: vscode.ExtensionContext): Icon[] {
        return Array(16)
            .fill('')
            .map((p_val, p_index) => {
                return {
                    light: p_context.asAbsolutePath(
                        'resources/light/box' + ('0' + p_index).slice(-2) + '.svg'
                    ),
                    dark: p_context.asAbsolutePath(
                        'resources/dark/box' + ('0' + p_index).slice(-2) + '.svg'
                    ),
                };
            });
    }

    private _nodeArray(p_children: PNode[]): MoreNode[] {
        const w_children: MoreNode[] = [];
        if (p_children && p_children.length) {
            p_children.forEach((p_node) => {
                let w_body = this.bodies[p_node.gnx];
                w_children.push(
                    new MoreNode(
                        p_node.header,
                        p_node.children.length
                            ? vscode.TreeItemCollapsibleState.Collapsed
                            : vscode.TreeItemCollapsibleState.None,
                        p_node,
                        false,
                        !!w_body && !!w_body.length,
                        this._icons
                    )
                );
            });
        }
        return w_children;
    }
}

export class MoreNode extends vscode.TreeItem {
    constructor(
        public label: string, // Node headline
        public collapsibleState: vscode.TreeItemCollapsibleState, // Computed in receiver/creator
        public pnode: PNode,
        public dirty: boolean,
        public hasBody: boolean,
        private _icons: Icon[]
    ) {
        super(label, collapsibleState);
        this.command = {
            command: 'morejs.selectNode',
            title: '',
            arguments: [this],
        };
    }

    // @ts-ignore
    public get iconPath(): Icon {
        return this._icons[0];
    }
}
