// morphdom is available globally via UMD
function updateHtml(newHtml) {
  morphdom(document.getElementsByClassName("markdown-body")[0], newHtml);
}

function partialUpdateHtml(newHtml, x, y, fat) {
  const markdownBody = document.getElementsByClassName("markdown-body")[0];
  if (!markdownBody) return;

  // 解析 newHtml 为 DOM 节点集合
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = newHtml;
  const newChildren = Array.from(tempDiv.childNodes[0].childNodes);
  // console.log("newChildren:", newChildren);

  // 找到父节点 fat
  const parent = document.getElementById(fat);
  if (!parent) return;

  if (x === y) {
    const target = document.getElementById(x);
    if (!target) return;

    const refNode = target.nextSibling; // 记录插入点
    parent.removeChild(target); // 删除 target 节点本身

    // 插入 newHtml 的所有儿子到原位置
    newChildren.forEach((child) => parent.insertBefore(child, refNode));
  } else {
    // console.log("Replacing children between:", x, y);

    // x 和 y 都是 fat 的儿子，且 x 在 y 前面
    const children = Array.from(parent.childNodes);
    const startIdx = children.findIndex((node) => node.id === String(x));
    const endIdx = children.findIndex((node) => node.id === String(y));

    // console.log("Found indices:", startIdx, endIdx);

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return;
    // console.log("Replacing nodes between indices:", startIdx, endIdx);

    const refNode = children[endIdx].nextSibling;
    // console.log("refNode:", refNode);

    // 删除 x 到 y 之间的所有节点（包括 x 和 y）
    for (let i = startIdx; i <= endIdx; i++) {
      parent.removeChild(children[i]);
    }

    // 在 refNode 之前插入 newHtml 的所有儿子
    newChildren.forEach((child) => {
      parent.insertBefore(child, refNode);
    });
  }
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
        behavior: "auto",
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
        behavior: "auto",
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
  }
});
