import * as vscode from 'vscode';

/**
 * * Structure for testing basic body pane switching without other operations
 */
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

    private _onDidChangeTreeData: vscode.EventEmitter<MoreNode | undefined | null | void> = new vscode.EventEmitter<MoreNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MoreNode | undefined | null | void> = this._onDidChangeTreeData.event;


    private _icons: Icon[];

    public modelId: number;
    public model: PNode[][] = [];
    public model1: PNode[] = [
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
    public model2: PNode[] = [
        {
            header: 'node6',
            gnx: '6',
            children: [],
        },
        {
            header: 'node7',
            gnx: '7',
            children: [
                {
                    header: 'node8',
                    gnx: '8',
                    children: [
                        {
                            header: 'childNode9',
                            gnx: '9',
                            children: [],
                        },
                    ],
                },
            ],
        },
        {
            header: 'childNode10',
            gnx: '10',
            children: [],
        }
    ];

    public bodies: { [gnx: string]: string } = {
        '1': 'node1 body',
        '2': 'node2 body',
        '3': 'node3 body',
        '4': 'node4 body',
        '5': 'node5 body',
        '6': 'node6 body',
        '7': 'node7 body',
        '8': 'node8 body',
        '9': 'node9 body',
        '10': 'node10 body',
    };

    constructor(private _context: vscode.ExtensionContext) {
        this._icons = this._buildNodeIconPaths(_context);
        this.modelId = 0;
        this.model.push(this.model1);
        this.model.push(this.model2);
        console.log('Starting MOREJS tree provider');
    }

    public switchModel() {
        if (this.modelId) {
            this.modelId = 0;
        } else {
            this.modelId = 1;
        }
    }

    public refreshTreeRoot(): void {
        console.log('REFRESH');

        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: MoreNode): Thenable<MoreNode> | MoreNode {
        return element;
    }

    public getChildren(element?: MoreNode): Thenable<MoreNode[]> {

        if (element) {
            console.log('REFRESH a node');

            return Promise.resolve(this._nodeArray(element.pnode.children));
        } else {
            console.log('REFRESH Root!!', this.modelId);
            return Promise.resolve(this._nodeArray(this.model[this.modelId]));
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
