// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import getWebviewContent from "./tmp.ts";
import noteProcess from './note.ts';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "notesaw" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('notesaw.start', async () => {
		const panel = vscode.window.createWebviewPanel(
			'notesaw',
			'Notesaw',
			vscode.ViewColumn.One,
			{}
		);

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			console.log(editor.document.languageId);
			const content = editor.document.getText();
			const resHtml = await noteProcess(content);
			panel.webview.html = resHtml;
		}
	})
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }

