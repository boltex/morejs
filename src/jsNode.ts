import * as vscode from "vscode";
import { Icon, PNode } from "./types";

export class JsNode extends vscode.TreeItem {

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
            command: "morejs.selectNode",
            title: '',
            arguments: [this]
        };
    }

    // @ts-ignore
    public get iconPath(): Icon {
        return this._icons[0];
    }

}