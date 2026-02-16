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
import * as path from "path";
import { noteProcessInit, noteProcess } from "./note-extention.ts";
import noteProcessConvert from "./note-convert.ts";
import {
  counter,
  setCounter,
  map,
  mapStartLine,
  mapEndLine,
  mapDepth,
  mapFather,
  extendMapArray,
  shrinkMapArray,
} from "./transformer.ts";
import { setWorkspaceUri } from "./env.ts";
import puppeteer from "puppeteer";

type TextChangeMessage = {
  editor: vscode.TextEditor;
  change: vscode.TextDocumentContentChangeEvent;
};

let totalLines = 0;

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
  let mapLast: (number | undefined)[] = []; // Maps editor line numbers to block IDs for scrolling
  let mapNext: (number | undefined)[] = []; // Maps editor line numbers to next block IDs for boundary detection

  // Message queue for pending text changes to throttle updates
  const messageQueue: TextChangeMessage[] = [];
  let isProcessing = false;

  const cleanUp = () => {
    // console.log("Cleaning up...");
    totalLines = 0;
    activeCursorLine = 0;
    visibleRange = undefined;
    mapLast = [];
    mapNext = [];
    setCounter(0);

    map.length = 1;
    mapStartLine.length = 1;
    mapEndLine.length = 1;
    mapDepth.length = 1;
    mapFather.length = 1;

    messageQueue.length = 0;
    isProcessing = false;
  };

  const updateMapLastNext = () => {
    mapLast = [...map];
    mapNext = [...map];
    for (let i = 1; i < map.length; i++) {
      if (!mapLast[i]) mapLast[i] = mapLast[i - 1];
    }
    for (let i = map.length - 2; i >= 0; i--) {
      if (!mapNext[i]) mapNext[i] = mapNext[i + 1];
    }
  };

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
    const last = mapLast[line],
      next = mapNext[line];

    // console.log("Syncing preview:", { line, last, next });
    panel.webview.postMessage({
      command: "syncPreview",
      line,
      rangeStart,
      rangeEnd,
      last,
      next,
      lastStartLine: last !== undefined ? mapStartLine[last] : undefined,
      lastEndLine: last !== undefined ? mapEndLine[last] : undefined,
    });
  };

  /**
   * Updates the preview webview with content from the given document
   * @param document The text document to render in the preview
   */
  const handleDocChange = async (editor: vscode.TextEditor, document: vscode.TextDocument) => {
    if (!panel) return;
    totalLines = editor.document.lineCount;
    extendMapArray(totalLines);

    // console.log("Start rendering document in preview...");
    const html = await noteProcess(document.getText(), 0, 0, true);
    // console.log(html);
    updateMapLastNext();

    panel.webview.postMessage({
      command: "updateHtml",
      html,
    });

    // console.log("Total lines:", totalLines);
    // console.log("Map:", map);
    // console.log("Map Start Line:", mapStartLine);
    // console.log("Map End Line:", mapEndLine);

    handlePreviewSync();
  };

  const handleTextChange = async ({ editor, change }: TextChangeMessage) => {
    if (!panel) return;
    const startLine = change.range.start.line + 1;
    const endLine = change.range.end.line + 1;
    const textLines = change.text.split(/\r?\n/).length;
    // console.log("/------ Start Handling Change ------/");
    // console.log("startLine:", startLine, "endLine:", endLine, "textLines:", textLines);

    const getTextFromLineRange = (start: number, end: number) => {
      const range = new vscode.Range(
        start - 1,
        0,
        end - 1,
        editor.document.lineAt(end - 1).text.length,
      );
      return editor.document.getText(range);
    };
    const findLCA = (x: number, y: number) => {
      while (mapDepth[x] > mapDepth[y]) x = mapFather[x];
      while (mapDepth[y] > mapDepth[x]) y = mapFather[y];
      if (x === y) return [x, x, mapFather[x]];

      while (mapFather[x] !== mapFather[y]) {
        x = mapFather[x];
        y = mapFather[y];
      }
      return [x, y, mapFather[x]];
    };

    const newEndLine = startLine + textLines - 1;
    const deltaLength = newEndLine - endLine;

    let last = mapLast[startLine] !== undefined ? mapLast[startLine] : mapNext[startLine];
    let next = mapNext[endLine] !== undefined ? mapNext[endLine] : mapLast[endLine];
    if (last === undefined || next === undefined) {
      handleDocChange(editor, editor.document);
      return;
    }
    const [x, y, fat] = findLCA(last, next);

    // console.log("Last:", last, "Next:", next, "lca: ", x, y, fat);
    // console.log("newEndLine:", newEndLine, "deltaLength:", deltaLength);

    const xLine = Math.min(mapStartLine[x], startLine);
    const yLine = Math.max(mapEndLine[y], endLine);
    const newYLine = yLine + deltaLength;

    // console.log("xLine:", xLine, "yLine:", yLine, "newYLine:", newYLine, "totalLines:", totalLines);

    // Maintain map arrays to ensure they are in sync
    const editorTotalLines = editor.document.lineCount;

    for (let i = 1; i <= counter; i++) {
      if (mapStartLine[i] > yLine) mapStartLine[i] += deltaLength;
      if (mapEndLine[i] > yLine) mapEndLine[i] += deltaLength;
    }

    extendMapArray(editorTotalLines);
    if (deltaLength > 0) {
      for (let i = totalLines; i > yLine; i--) map[i + deltaLength] = map[i];
    } else {
      for (let i = yLine + 1; i <= totalLines; i++) map[i + deltaLength] = map[i];
    }
    for (let i = xLine; i <= newYLine; i++) map[i] = undefined;

    const raw = getTextFromLineRange(xLine, newYLine);
    const html = await noteProcess(raw, xLine - 1, fat, false);

    updateMapLastNext();
    totalLines = editorTotalLines;

    // console.log("changed range:", xLine, yLine, newYLine);
    // console.log("Changed text:\n" + raw);
    // console.log("Now map:");
    // for (let i = 1; i <= totalLines; i++) {
    //   console.log(i, map[i], mapLast[i], mapNext[i]);
    // }
    // console.log("Now tree:");
    // for (let i = 1; i <= counter; i++) {
    //   console.log(i, mapStartLine[i], mapEndLine[i], mapFather[i]);
    // }
    // console.log("Partial update:", { x, y, fat });
    // console.log("update html:");
    // console.log(html);

    // Send message to update the preview
    panel.webview.postMessage({
      command: "partialUpdateHtml",
      html,
      x,
      y,
      fat,
    });

    // console.log("/------ End Handling Change ------/");
  };

  // Message queue for pending text changes to throttle updates
  const enqueueMessage = (message: TextChangeMessage) => {
    if (!message.change) return;
    // console.log("Enqueuing message:", message);
    messageQueue.push(message);
    processQueue();
  };
  const processQueue = async () => {
    if (isProcessing || messageQueue.length === 0) {
      return;
    }
    isProcessing = true;

    const message = messageQueue.shift();
    try {
      await handleTextChange(message!);
    } catch (err) {
      console.error("Error processing message:", err);
    }

    isProcessing = false;
    processQueue();
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

  // Set up event listeners for content updates

  // Update when text changes in the current document
  let textChangeTimeout: NodeJS.Timeout | undefined;
  let isThrottling = false;
  let pendingChanges: vscode.TextDocumentContentChangeEvent[] = [];

  vscode.workspace.onDidChangeTextDocument(
    (e) => {
      if (e.document.languageId === "markdown" && panel?.visible) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          enqueueMessage({
            editor,
            change: e.contentChanges[0],
          });
        }
      }
    },
    null,
    context.subscriptions,
  );

  // Update when the active editor changes to keep preview in sync
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && editor.document.languageId === "markdown" && panel?.visible) {
        cleanUp();
        handleDocChange(editor, editor.document);
        handleCursorLineChange(editor.selection.active.line);
        handleVisibleRangeChange(editor.visibleRanges[0]);
      }
    },
    null,
    context.subscriptions,
  );

  // Listen for selection changes to sync cursor position with preview
  vscode.window.onDidChangeTextEditorSelection((e) => {
    if (e.textEditor.document.languageId !== "markdown") return;

    const line = e.selections[0].active.line;
    if (line !== activeCursorLine) {
      handleCursorLineChange(line);
    }
  });

  // Listen for scrolling to sync visible range with preview
  vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
    if (e.textEditor.document.languageId !== "markdown") return;

    const range = e.visibleRanges[0];
    if (
      range.start.line !== visibleRange?.start.line ||
      range.end.line !== visibleRange?.end.line
    ) {
      handleVisibleRangeChange(range);
    }
  });

  // Register the command to show the Notesaw preview
  context.subscriptions.push(
    vscode.commands.registerCommand("notesaw.showPreview", async () => {
      // The main command handler that creates and manages the preview panel
      // This is triggered when the user runs the "Notesaw: Show Preview" command

      // console.log("Show Preview command triggered");

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Verify the document is a Markdown file
        if (editor.document.languageId !== "markdown") {
          vscode.window.showErrorMessage("Please open a Markdown file.");
          return;
        }

        const currentFileUri = editor.document.uri;
        const currentDirUri = vscode.Uri.joinPath(currentFileUri, "..");

        // Create the preview panel if it doesn't exist
        if (!panel) {
          // console.log("Creating new panel");
          panel = vscode.window.createWebviewPanel(
            "notesaw", // Type ID
            "Notesaw", // Panel title
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, // Show beside the current editor
            {
              localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, "assets"), // Security: restrict resources to assets folder
                currentDirUri, // user's current directory
              ],
              enableScripts: true, // Allow JavaScript in the webview for interactivity
              retainContextWhenHidden: true, // Keep the webview context even when it's not visible
            },
          );

          handleCursorLineChange(editor.selection.active.line);
          handleVisibleRangeChange(editor.visibleRanges[0]);

          // Handle panel disposal
          panel.onDidDispose(
            () => {
              cleanUp();
              panel = undefined;
            },
            null,
            context.subscriptions,
          );
        }

        // Show the panel next to the editor
        panel.reveal(vscode.ViewColumn.Beside, true);

        // Prepare resource URIs for the webview
        const noteCssUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "note.css"),
        );
        const ghmCssUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "github-markdown.css"),
        );
        const katexCssUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "styles", "katex.min.css"),
        );
        const featherSvgPath = vscode.Uri.joinPath(
          context.extensionUri,
          "assets",
          "icon",
          "feather-sprite.svg",
        ).fsPath;
        const morphdomUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "script", "morphdom-umd.min.js"),
        );
        const webviewScriptUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, "assets", "script", "webview-script.js"),
        );

        // image from the user's current workspace
        const workspaceUri = panel.webview.asWebviewUri(currentDirUri);

        setWorkspaceUri(workspaceUri.toString());

        const prefTheme =
          vscode.workspace.getConfiguration("notesaw").get<string>("theme") || "follow-system";
        let theme: "light" | "dark" | undefined = undefined;
        if (prefTheme === "follow-vscode") {
          // Apply VSCode theme styles
          theme =
            vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? "dark" : "light";
        } else if (prefTheme === "light" || prefTheme === "dark") {
          theme = prefTheme;
        } else {
          theme = undefined;
        }

        // console.log("Starting to initialize webview with theme:", theme);
        // Initialize the webview with the HTML content (don't need text)
        const resHtml = await noteProcessInit(
          noteCssUri.toString(),
          ghmCssUri.toString(),
          katexCssUri.toString(),
          featherSvgPath,
          morphdomUri.toString(),
          webviewScriptUri.toString(),
          panel.webview.cspSource,
          theme,
        );
        panel.webview.html = resHtml;
        console.log("Webview initialized");
        handleDocChange(editor, editor.document);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("notesaw.export_to_html", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Verify the document is a Markdown file
        if (editor.document.languageId !== "markdown") {
          vscode.window.showErrorMessage("Please open a Markdown file.");
          return;
        }
        vscode.window.showInformationMessage("Start exporting Markdown file to raw HTML...");

        const html = await noteProcess(editor.document.getText(), 0, 0, true);
        const savePath = editor.document.uri.fsPath.replace(/\.md$/, ".html");
        const htmlUri = editor.document.uri.with({ path: savePath });
        const writeData = new TextEncoder().encode(String(html));
        await vscode.workspace.fs.writeFile(htmlUri, writeData);

        // Notify the user of success, and display the path under the workspace root
        let dispPath = vscode.workspace.asRelativePath(htmlUri);
        vscode.window.showInformationMessage(`Exported to HTML: ${dispPath}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("notesaw.export_to_pdf", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Verify the document is a Markdown file
        if (editor.document.languageId !== "markdown") {
          vscode.window.showErrorMessage("Please open a Markdown file.");
          return;
        }

        // Get user configuration
        const config = vscode.workspace.getConfiguration("notesaw");
        const pdfOptions = config.get<any>("pdfOptions") || {};
        const puppeteerPath = pdfOptions.puppeteerPath || "";
        const format = pdfOptions.format || "A4";
        const forceWhiteBackground = pdfOptions.forceWhiteBackground || false;
        const landscape = pdfOptions.landscape || false;
        const margin = pdfOptions.margin || {
          top: "10mm",
          bottom: "10mm",
          left: "15mm",
          right: "15mm",
        };
        const scale = pdfOptions.scale || 1.0;
        const displayHeaderFooter = pdfOptions.displayHeaderFooter || false;
        const headerTemplate = pdfOptions.headerTemplate || "<div></div>";
        const footerTemplate = pdfOptions.footerTemplate || "<div></div>";

        const noteCssPath = vscode.Uri.joinPath(
          context.extensionUri,
          "assets",
          "styles",
          "note.css",
        ).fsPath;
        const ghmCssPath = vscode.Uri.joinPath(
          context.extensionUri,
          "assets",
          "styles",
          "github-markdown.css",
        ).fsPath;
        const katexCssPath = vscode.Uri.joinPath(
          context.extensionUri,
          "assets",
          "styles",
          "katex.min.css",
        ).fsPath;
        const featherSvgPath = vscode.Uri.joinPath(
          context.extensionUri,
          "assets",
          "icon",
          "feather-sprite.svg",
        ).fsPath;

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Exporting Notesaw to PDF",
            cancellable: false,
          },
          async (progress) => {
            try {
              progress.report({ message: "Converting Notesaw to HTML...", increment: 10 });

              let folderPath = undefined;
              if (editor) {
                const absPath = editor.document.uri.fsPath;
                folderPath = "file://" + path.dirname(absPath);
              } else {
                vscode.window.showErrorMessage("Please open a Markdown file.");
                return;
              }

              const html = await noteProcessConvert(
                editor.document.getText(),
                undefined,
                undefined,
                katexCssPath,
                folderPath,
                featherSvgPath,
              );

              // Use Puppeteer to convert HTML to PDF
              const pdfPath = editor.document.uri.fsPath.replace(/\.md$/, ".pdf");

              // 1. [PDF Generation] Save HTML to a temporary file
              progress.report({ message: "Exporting to temporary HTML...", increment: 30 });
              const htmlPath = editor.document.uri.fsPath.replace(/\.md$/, ".export.html");
              await vscode.workspace.fs.writeFile(
                vscode.Uri.file(htmlPath),
                new TextEncoder().encode(html),
              );

              // 2. [PDF Generation] Launch browser and load HTML
              progress.report({ message: "Launching browser...", increment: 20 });

              let browser;
              try {
                browser = await puppeteer.launch({
                  headless: true,
                  executablePath: puppeteerPath || undefined,
                  args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--allow-file-access-from-files",
                  ],
                });
              } catch (e) {
                vscode.window.showErrorMessage(
                  "Launch failed, probably because Chrome executable is not found. Please refer to [Get Started - Exporting](https://github.com/Appleblue17/Notesaw?tab=readme-ov-file#get-started) to install and configure it.",
                );
                throw e;
              }
              const page = await browser.newPage();

              progress.report({ message: "Rendering PDF...", increment: 20 });
              await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
              await page.addStyleTag({ path: noteCssPath });
              await page.addStyleTag({ path: ghmCssPath });

              await page.pdf({
                path: pdfPath,
                format,
                landscape,
                margin,
                displayHeaderFooter,
                headerTemplate,
                footerTemplate,
                scale,
                omitBackground: !forceWhiteBackground,
                printBackground: !forceWhiteBackground,
              });
              await browser.close();

              // 3. [PDF Generation] Delete the temporary HTML file
              progress.report({ message: "Cleaning up...", increment: 20 });
              await vscode.workspace.fs.delete(vscode.Uri.file(htmlPath));

              vscode.window.showInformationMessage(`Exported to PDF: ${pdfPath}`);
            } catch (err) {
              console.error("Error generating PDF:", err);
              vscode.window.showErrorMessage(`Failed to export to PDF: ${err}`);
            }
          },
        );
      }
    }),
  );
}

/**
 * Deactivates the extension
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  // Clean up resources if needed
}
