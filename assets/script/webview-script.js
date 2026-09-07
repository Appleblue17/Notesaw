let scrollSyncMode = "instant"; // default mode
let scrollSyncThreshold = 0.1; // default threshold (10% of viewport height)
let crossPageThreshold = 1; // default cross-page threshold (1 pages)

// Bridge back to the extension host. Falls back to a no-op outside a webview
// (e.g. when this script is unit-tested in plain DOM).
let vscode = null;
try {
  vscode = acquireVsCodeApi();
} catch (e) {
  vscode = null;
}

let lastRefreshRequest = 0;

/**
 * Asks the extension to fully re-render the preview. Used as a self-healing
 * fallback when a partial (incremental) DOM update cannot locate its target
 * elements, instead of silently stalling the preview.
 */
function requestFullRefresh(reason) {
  if (!vscode) return;
  // Throttle to at most one request per 200ms to avoid a message storm.
  const now = Date.now();
  if (now - lastRefreshRequest < 200) return;
  lastRefreshRequest = now;
  vscode.postMessage({ command: "requestFullRefresh", reason });
  console.warn("[notesaw] Requesting full preview refresh:", reason);
}

// morphdom is available globally via UMD
function updateHtml(newHtml) {
  morphdom(document.getElementsByClassName("markdown-body")[0], newHtml);
}

function partialUpdateHtml(newHtml, x, y, fat) {
  const markdownBody = document.getElementsByClassName("markdown-body")[0];
  if (!markdownBody) {
    requestFullRefresh("markdown-body missing");
    return;
  }

  // Parse newHtml into a list of sibling nodes. The fragment is wrapped in a
  // single <div class="markdown-body"> root, so its children are the siblings
  // to insert. Fall back to the whole fragment when the shape is unexpected.
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = newHtml;
  let newChildren;
  if (
    tempDiv.childNodes.length === 1 &&
    tempDiv.firstChild.nodeType === Node.ELEMENT_NODE
  ) {
    newChildren = Array.from(tempDiv.firstChild.childNodes);
  } else {
    newChildren = Array.from(tempDiv.childNodes);
  }

  // Find the parent element (fat) in the current DOM
  const parent = document.getElementById(fat);
  if (!parent) {
    requestFullRefresh("parent id not found: " + fat);
    return;
  }

  // Both x and y are children of fat, and x comes before y
  const children = Array.from(parent.childNodes);
  const startIdx = children.findIndex((node) => node.id === String(x));
  const endIdx = children.findIndex((node) => node.id === String(y));

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    requestFullRefresh("target range not found: x=" + x + " y=" + y + " fat=" + fat);
    return;
  }

  const refNode = children[endIdx].nextSibling;

  // Delete all nodes from startIdx to endIdx (inclusive)
  for (let i = startIdx; i <= endIdx; i++) {
    parent.removeChild(children[i]);
  }

  // Insert all new children before the reference node
  newChildren.forEach((child) => {
    parent.insertBefore(child, refNode);
  });
}

/**
 * Synchronizes the preview with the editor's cursor position
 * @param {Object} data - Synchronization data from the editor
 * @param {number} data.line - Current cursor line
 * @param {number} data.rangeStart - First visible line in editor
 * @param {number} data.rangeEnd - Last visible line in editor
 * @param {string} data.last - ID of the block containing or before cursor
 * @param {string} data.next - ID of the block after cursor
 */
function syncPreview(data) {
  let { line, rangeStart, rangeEnd, last, next, lastStartLine, lastEndLine } = data;
  const viewportHeight = window.innerHeight;
  const markdownBody = document.getElementsByClassName("markdown-body")[0];

  if (!markdownBody) {
    console.error("Markdown body element not found");
    return;
  }

  // Calculate relative cursor position within the visible editor range
  let percent = (line - rangeStart + 0.5) / (rangeEnd - rangeStart + 1);
  // Clamp percentage to reasonable bounds to avoid scrolling too far
  if (percent < 0.1) percent = 0.1;
  if (percent > 0.9) percent = 0.9;
  const editorCursorPos = viewportHeight * percent;

  if (!next) {
    // At the end, scroll to the bottom smoothly
    markdownBody.scrollIntoView({
      block: "end",
    });
  } else if (!last) {
    // At the beginning, scroll to the top smoothly
    markdownBody.scrollIntoView({
      block: "start",
    });
  } else if (last === next) {
    const blockStart = lastStartLine,
      blockEnd = lastEndLine;
    const block = document.getElementById(last);

    if (block) {
      const blockTop = block.getBoundingClientRect().top;
      const blockHeight = block.getBoundingClientRect().height;
      const scrollTop = window.pageYOffset;

      // Calculate proportional position within the block
      const previewCursorPos =
        (blockHeight * (line - blockStart + 0.5)) / (blockEnd - blockStart + 1);
      // Calculate the scroll position
      const scrollPosition = scrollTop + blockTop + previewCursorPos - editorCursorPos;

      // Scroll to the calculated position smoothly
      // Calculate the scroll distance
      const scrollDistance = Math.abs(scrollPosition - window.scrollY);

      // Use smooth behavior only for longer scrolls
      window.scrollTo({
        top: scrollPosition,
        behavior:
          scrollDistance <= crossPageThreshold * window.innerHeight &&
          (scrollSyncMode === "smooth" ||
            (scrollSyncMode === "intelligent" &&
              scrollDistance > window.innerHeight * scrollSyncThreshold))
            ? "smooth"
            : "auto",
      });
    }
  } else {
    // Cursor is between two elements
    const blockLast = document.getElementById(last);
    const blockNext = document.getElementById(next);

    if (blockLast && blockNext) {
      const blockLastBottom = blockLast.getBoundingClientRect().bottom;
      const blockNextTop = blockNext.getBoundingClientRect().top;
      const blockGap = blockNextTop - blockLastBottom;
      const scrollTop = window.pageYOffset;

      // Calculate proportional position in the gap between blocks
      const previewCursorPos = blockGap * 0.5;
      // Calculate the scroll position
      const scrollPosition = scrollTop + blockLastBottom + previewCursorPos - editorCursorPos;

      // Scroll to the calculated position smoothly
      // Calculate the scroll distance
      const scrollDistance = Math.abs(scrollPosition - window.scrollY);

      // Use smooth behavior only for longer scrolls
      window.scrollTo({
        top: scrollPosition,
        behavior:
          scrollDistance <= crossPageThreshold * window.innerHeight &&
          (scrollSyncMode === "smooth" ||
            (scrollSyncMode === "intelligent" &&
              scrollDistance > window.innerHeight * scrollSyncThreshold))
            ? "smooth"
            : "auto",
      });
    }
  }
}

// Handle extension messages
window.addEventListener("message", (event) => {
  switch (event.data.command) {
    case "updateHtml":
      updateHtml(event.data.html);
      break;
    case "partialUpdateHtml":
      partialUpdateHtml(event.data.html, event.data.x, event.data.y, event.data.fat);
      break;
    case "syncPreview":
      syncPreview(event.data);
      break;
    case "setScrollSyncConfig":
      scrollSyncMode = event.data.mode || scrollSyncMode;
      scrollSyncThreshold = event.data.threshold || scrollSyncThreshold;
      crossPageThreshold = event.data.crossPageThreshold || crossPageThreshold;
      break;
    case "updateTheme":
      // Re-apply the resolved light/dark theme without a full re-render. An
      // undefined value means "follow system", so the attribute is removed and
      // the CSS `prefers-color-scheme` media query takes over.
      if (event.data.theme) {
        document.body.setAttribute("data-theme", event.data.theme);
      } else {
        document.body.removeAttribute("data-theme");
      }
      break;
  }
});

/**
 * Language label / "copy" chrome for fenced code blocks.
 *
 * The copy button in the webview routes the (un-numbered) raw code text to the
 * VS Code clipboard through the extension host, since the webview sandbox cannot
 * always use `navigator.clipboard` directly. Line numbers live in CSS pseudo
 * content (`::before { content: attr(data-line-number) }`), so reading
 * `textContent` of the `<code>` yields exactly the source, without numbering.
 */
document.addEventListener("click", (event) => {
  const button = event.target.closest && event.target.closest(".sn-copy");
  if (!button) return;
  const block = button.closest && button.closest("pre.sn-block");
  if (!block) return;
  event.preventDefault();
  const code = block.querySelector("code.sn-code");
  if (!code) return;
  // Line-numbered rows keep numbers in a separate `.sn-no` cell; copy only the
  // code cells so the clipboard text is exactly the source.
  const parts = Array.prototype.map.call(
    code.querySelectorAll(".sn-line .sn-code-part"),
    (el) => el.textContent || "",
  );
  const text = parts.length > 0 ? parts.join("\n") : code.textContent || "";
  if (!vscode) return;
  vscode.postMessage({ command: "copyCodeToClipboard", text });
  // Brief visual confirmation that the click landed.
  const original = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
});

