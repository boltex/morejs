// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JsonOutlineProvider } from './jsonOutline';
import { PNode } from './moreOutline';
import { More } from './more';

export function activate(context: vscode.ExtensionContext) {
    console.log('Starting morejs activation');

    // SHORTCUTS *******************************************************************************
    function subPush(p_disposable: vscode.Disposable) {
        context.subscriptions.push(p_disposable);
    }
    const regTree = vscode.window.registerTreeDataProvider;
    const regCmd = vscode.commands.registerCommand;

    // JSON TREEVIEW SAMPLE EXAMPLE *****************************************************************
    const jsonOutlineProvider = new JsonOutlineProvider(context);
    subPush(regTree('jsonOutline', jsonOutlineProvider));
    subPush(regCmd('morejs.refresh', () => jsonOutlineProvider.refresh()));
    subPush(regCmd('morejs.refreshNode', (offset) => jsonOutlineProvider.refresh(offset)));
    subPush(regCmd('morejs.renameNode', (offset) => jsonOutlineProvider.rename(offset)));

    // MOREJS IMPLEMENTATION *********************************************************
    const more = new More(context); // *

    subPush(regCmd('morejs.selectNode', (p_node: PNode) => more.selectNode(p_node))); // *
    subPush(regCmd('morejs.helloWorld', () => more.switchDocument())); // *

    vscode.commands.executeCommand('setContext', 'moreOutlineEnabled', true); // *

    console.log('Finished activating morejs');
}

// this method is called when your extension is deactivated
export function deactivate() { }
