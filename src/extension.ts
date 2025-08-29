/**
 * Notesaw VS Code Extension
 *
 * This extension provides a live preview for Notesaw documents.
 * Notesaw is a custom markup language that extends Markdown with additional features.
 * The extension renders Notesaw files with syntax highlighting, mathematical expressions via KaTeX,
 * and provides a synchronized scrolling experience between the editor and preview.
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import noteProcess, { noteProcessPure } from "./note-extention.ts";

/**
 * Activates the Notesaw extension
 * This method is called when the extension is activated for the first time
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
  // Track the preview panel so we can reuse or update it
  let panel: vscode.WebviewPanel | undefined = undefined;
  let activeCursorLine = 0;
  let visibleRange: vscode.Range | undefined = undefined;
  let mapLast: String[] = []; // Maps editor line numbers to block IDs for scrolling
  let mapNext: String[] = []; // Maps editor line numbers to next block IDs for boundary detection

  /**
   * Synchronizes the preview panel with the editor
   * Sends the current cursor position and visible range to the webview
   * so it can scroll to the appropriate position
   */
  const handlePreviewSync = () => {
    if (!panel || !visibleRange) return;
    const rangeStart = visibleRange.start.line + 1,
      rangeEnd = visibleRange.end.line + 1;
    const line = Math.max(rangeStart, Math.min(rangeEnd, activeCursorLine + 1));
    panel.webview.postMessage({
      command: "syncPreview",
      line,
      rangeStart,
      rangeEnd,
      last: mapLast[line],
      next: mapNext[line],
    });
  };

  /**
   * Updates the preview webview with content from the given document
   * @param document The text document to render in the preview
   */
  const handleDocChange = async (document: vscode.TextDocument) => {
    if (!panel) return;
    const res = await noteProcessPure(document.getText());
    mapLast = res.mapLast;
    mapNext = res.mapNext;
    panel.webview.postMessage({
      command: "updateHtml",
      html: res.html,
    });
    handlePreviewSync();
  };

  /**
   * Handles cursor position changes in the editor
   * Updates the stored cursor line and triggers a preview sync
   * @param line The new line number of the cursor (0-based)
   */
  const handleCursorLineChange = (line: number) => {
    if (!panel) return;
    activeCursorLine = line;
    handlePreviewSync();
  };

  /**
   * Handles changes to the visible range in the editor
   * Updates the stored visible range and triggers a preview sync
   * @param range The new visible range of the editor
   */
  const handleVisibleRangeChange = (range: vscode.Range) => {
    if (!panel) return;
    visibleRange = range;
    handlePreviewSync();
  };

  // Register the command to show the Notesaw preview
  context.subscriptions.push(
    vscode.commands.registerCommand("notesaw.showPreview", async () => {
      // The main command handler that creates and manages the preview panel
      // This is triggered when the user runs the "Notesaw: Show Preview" command

      console.log("Notesaw extension is now active!");

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Verify the document is a Notesaw file
        if (editor.document.languageId !== "notesaw") {
          vscode.window.showErrorMessage("Please open a Notesaw file.");
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
              enableScripts: true, // Allow JavaScript in the webview for interactivity
            }
          );

          handleCursorLineChange(editor.selection.active.line);
          handleVisibleRangeChange(editor.visibleRanges[0]);

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
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "github-markdown.css")
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
        handleDocChange(editor.document);

        // Set up event listeners for content updates

        // Update when text changes in the current document
        vscode.workspace.onDidChangeTextDocument(
          (e) => {
            if (e.document.languageId === "notesaw" && panel?.visible) {
              handleDocChange(e.document);
            }
          },
          null,
          context.subscriptions
        );

        // Update when the active editor changes to keep preview in sync
        vscode.window.onDidChangeActiveTextEditor(
          (newEditor) => {
            if (newEditor && newEditor.document.languageId === "notesaw" && panel?.visible) {
              handleDocChange(newEditor.document);
              handleCursorLineChange(editor.selection.active.line);
              handleVisibleRangeChange(editor.visibleRanges[0]);
            }
          },
          null,
          context.subscriptions
        );

        // Listen for selection changes to sync cursor position with preview
        vscode.window.onDidChangeTextEditorSelection((e) => {
          if (e.textEditor.document.languageId !== "notesaw") return;

          const line = e.selections[0].active.line;
          if (line !== activeCursorLine) {
            handleCursorLineChange(line);
          }
        });

        // Listen for scrolling to sync visible range with preview
        vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
          if (e.textEditor.document.languageId !== "notesaw") return;

          const range = e.visibleRanges[0];
          if (
            range.start.line !== visibleRange?.start.line ||
            range.end.line !== visibleRange?.end.line
          ) {
            handleVisibleRangeChange(range);
          }
        });
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
