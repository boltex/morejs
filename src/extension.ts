// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JsonOutlineProvider } from './jsonOutline';
import { JsOutlineProvider } from './jsOutline';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "morejs" is now active!');

	// TREEVIEW SAMPLE EXAMPLE
	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
	vscode.commands.registerCommand('morejs.refresh', () => jsonOutlineProvider.refresh());
	vscode.commands.registerCommand('morejs.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	vscode.commands.registerCommand('morejs.renameNode', offset => jsonOutlineProvider.rename(offset));

	// MOREJS  test
	const jsOutlineProvider = new JsOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsOutline', jsOutlineProvider);
	vscode.commands.executeCommand('setContext', 'jsOutlineEnabled', true);


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('morejs.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from morejs!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
