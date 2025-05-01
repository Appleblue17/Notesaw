// morphdom is available globally via UMD
function updateContent(newHtml) {
  morphdom(document.getElementsByClassName("markdown-body")[0], newHtml);
}

window.addEventListener("load", () => {
  console.log("Webview loaded");
});

// Handle extension messages
window.addEventListener("message", (event) => {
  switch (event.data.command) {
    case "updateHtml":
      updateContent(event.data.html);
      break;
  }
});
