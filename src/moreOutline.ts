import * as vscode from 'vscode';
import { More } from './more';

/**
 * * Structural node type used by the model.
 * (vscode needs TreeItem via getTreeItem in the TreeDataProvider)
 */
export interface PNode {
    header: string;
    gnx: string;
    children: PNode[];
    parent?: PNode;
    selected?: boolean;
}

/**
 * * Icon path names used in leoNodes for rendering in treeview
 */
interface Icon {
    light: string;
    dark: string;
}

/**
 * * Tree item type node that gets displayed by vscode
 */
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
            arguments: [this.pnode],
        };
    }

    // @ts-ignore
    public get iconPath(): Icon {
        return this._icons[0];
    }
}

/**
 * * Outline Provider for immutable test structures
 */
export class MoreOutlineProvider implements vscode.TreeDataProvider<PNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<PNode | undefined | null | void> = new vscode.EventEmitter<PNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private _icons: Icon[];

    // * IMMUTABLE sample test outline structures. Each with predefined 'selected' node.
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
            selected: true // predefined as 'selected'.
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
            selected: true // predefined as 'selected'.
        }
    ];

    // MUTABLE text bodies to test modifications and display transitions.
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

    constructor(
        private _context: vscode.ExtensionContext,
        private _more: More
    ) {
        this._icons = this._buildNodeIconPaths(_context);
        this.modelId = 0;
        this._buildParents(this.model1);
        this._buildParents(this.model2);
        this.model.push(this.model1);
        this.model.push(this.model2);
        console.log('Starting MOREJS tree provider');
    }

    public switchModel(p_id: number) {
        console.log('switch model to:', p_id);
        // Either 1 or 2
        if (p_id === 1) {
            this.modelId = 0;
        } else {
            this.modelId = 1;
        }
    }

    public refreshTreeRoot(): void {
        console.log('REFRESH');
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: PNode): MoreNode {
        let w_body = this.bodies[element.gnx];
        if (element.selected) {
            setTimeout(() => {
                this._more.revealTreeViewNode(element, { select: true, focus: false });
                this._more!.applyNodeToBody(element, false, false);
            }, 0);
        }
        return new MoreNode(
            element.header,
            element.children.length
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
            element,
            false,
            !!w_body && !!w_body.length,
            this._icons
        );
    }

    public getChildren(element?: PNode): vscode.ProviderResult<PNode[]> {
        if (element) {
            console.log('REFRESH a node');
            return element.children;
            //return Promise.resolve(this._nodeArray(element.pnode.children));
        } else {
            console.log('REFRESH Root!!', this.modelId);
            return this.model[this.modelId];
            //return Promise.resolve(this._nodeArray(this.model[this.modelId]));
        }
    }

    public getParent(p_node: PNode): vscode.ProviderResult<PNode> | null {
        console.log('getParent:', p_node.gnx);

        return p_node.parent;
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

    /**
     * Recursively set node's parent member.
     * @param p_nodes Children array of nodes to have their parents set recursively.
     * @param p_parent Current node being processed. Undefined if root node children.
     */
    private _buildParents(p_nodes: PNode[], p_parent?: PNode): void {
        p_nodes.forEach(p_node => {
            p_node.parent = p_parent;
            this._buildParents(p_node.children, p_node
            );
        });
    }

}
