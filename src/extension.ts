// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import noteProcess from "./note.ts";

/**
 * Activates the Notesaw extension
 * This method is called when the extension is activated for the first time
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "notesaw" is now active!');

  // Track the preview panel so we can reuse or update it
  let panel: vscode.WebviewPanel | undefined = undefined;

  // Register the command to show the Notesaw preview
  context.subscriptions.push(
    vscode.commands.registerCommand("notesaw.showPreview", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Verify the document is a Notesaw file
        if (editor.document.languageId !== "notesaw") {
          vscode.window.showErrorMessage("Please open a notesaw file.");
          return;
        }

        // Create the preview panel if it doesn't exist
        if (!panel) {
          panel = vscode.window.createWebviewPanel(
            "notesaw", // Type ID
            "Notesaw", // Panel title
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, // Show beside the current editor
            {
              localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "assets")], // Security: restrict resources to assets folder
              enableScripts: true, // Allow JavaScript in the webview
            }
          );

          // Handle panel disposal
          panel.onDidDispose(
            () => {
              panel = undefined; // Reset the panel reference when closed
            },
            null,
            context.subscriptions
          );
        }

        // Show the panel next to the editor
        panel.reveal(vscode.ViewColumn.Beside, true);

        // Prepare resource URIs for the webview
        const noteCssUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "note.css")
        );
        const ghmCssUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "github-markdown-light.css")
        );
        const katexCssUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "katex.min.css")
        );
        const featherSvgPath = vscode.Uri.joinPath(
          context.extensionUri,
          "assets",
          "icon",
          "feather-sprite.svg"
        ).fsPath;
        const morphdomUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "script", "morphdom-umd.min.js")
        );
        const webviewScriptUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "script", "webview-script.js")
        );

        // Initialize the webview with the HTML content
        const resHtml = await noteProcess(
          editor.document.getText(),
          noteCssUri.toString(),
          ghmCssUri.toString(),
          katexCssUri.toString(),
          featherSvgPath,
          morphdomUri.toString(),
          webviewScriptUri.toString(),
          panel.webview.cspSource
        );
        panel.webview.html = resHtml;

        /**
         * Updates the preview webview with content from the given document
         * @param document The text document to render in the preview
         */
        const updateWebview = async (document: vscode.TextDocument) => {
          if (!panel) return;
          const pureHtml = await noteProcess(
            document.getText(),
            noteCssUri.toString(),
            ghmCssUri.toString(),
            katexCssUri.toString(),
            featherSvgPath,
            morphdomUri.toString(),
            webviewScriptUri.toString(),
            panel.webview.cspSource,
            true // Set pure to true for only body content
          );
          panel.webview.postMessage({
            command: "updateHtml",
            html: pureHtml,
          });
        };

        // Set up event listeners for content updates

        // Update when text changes in the current document
        vscode.workspace.onDidChangeTextDocument(
          (e) => {
            if (e.document.languageId === "notesaw" && panel?.visible) {
              updateWebview(e.document);
            }
          },
          null,
          context.subscriptions
        );

        // Update when the active editor changes to keep preview in sync
        vscode.window.onDidChangeActiveTextEditor(
          (newEditor) => {
            if (newEditor && newEditor.document.languageId === "notesaw" && panel?.visible) {
              updateWebview(newEditor.document);
            }
          },
          null,
          context.subscriptions
        );
      }
    })
  );
}

/**
 * Deactivates the extension
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  // Clean up resources if needed
}
