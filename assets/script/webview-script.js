// morphdom is available globally via UMD
function updateHtml(newHtml) {
  morphdom(document.getElementsByClassName("markdown-body")[0], newHtml);
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
  let { line, rangeStart, rangeEnd, last, next } = data;
  const viewportHeight = window.innerHeight;
  const markdownBody = document.getElementsByClassName("markdown-body")[0];

  if (!markdownBody) {
    console.error("Markdown body element not found");
    return;
  }

  // Calculate relative cursor position within the visible editor range
  let percent = (line - rangeStart + 0.5) / (rangeEnd - rangeStart + 1);
  // Clamp percentage to reasonable bounds to avoid scrolling too far
  if (percent < 0.2) percent = 0.2;
  if (percent > 0.8) percent = 0.8;
  const editorCursorPos = viewportHeight * percent;

  if (!last) {
    // At the beginning, scroll to the top smoothly
    markdownBody.scrollIntoView({
      block: "start",
    });
  } else if (!next) {
    // At the end, scroll to the bottom smoothly
    markdownBody.scrollIntoView({
      block: "end",
    });
  } else if (last === next) {
    // Cursor is within an element
    const info = last.split("-");
    const blockStart = parseInt(info[1]),
      blockEnd = parseInt(info[2]);
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
      window.scrollTo({
        top: scrollPosition,
        // behavior: "smooth",
      });
    }
  } else {
    // Cursor is between two elements
    const blockLastInfo = last.split("-");
    const blockNextInfo = next.split("-");
    const blockLastEnd = parseInt(blockLastInfo[2]);
    const blockNextStart = parseInt(blockNextInfo[1]);

    const blockLast = document.getElementById(last);
    const blockNext = document.getElementById(next);

    if (blockLast && blockNext) {
      const blockLastTop = blockLast.getBoundingClientRect().top;
      const blockNextTop = blockNext.getBoundingClientRect().top;
      const blockGap = blockNextTop - blockLastTop;
      const scrollTop = window.pageYOffset;

      // Calculate proportional position in the gap between blocks
      const previewCursorPos =
        (blockGap * (line - blockLastEnd + 0.5)) / (blockNextStart - blockLastEnd + 1);
      // Calculate the scroll position
      const scrollPosition = scrollTop + blockLastTop + previewCursorPos - editorCursorPos;

      // Scroll to the calculated position smoothly
      window.scrollTo({
        top: scrollPosition,
        // behavior: "smooth",
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
    case "syncPreview":
      syncPreview(event.data);
      break;
  }
});
