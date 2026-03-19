(function () {
  const readmeContent = document.getElementById("readme-content");

  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function renderReadme(md) {
    const lines = md.split(/\r?\n/);
    const stopHeadings = new Set(["## Development", "## File Structure"]);
    const chunks = [];
    let inList = false;
    let inCode = false;
    let codeLines = [];

    function closeList() {
      if (inList) {
        chunks.push("</ul>");
        inList = false;
      }
    }

    function closeCode() {
      if (inCode) {
        chunks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLines = [];
      }
    }

    for (const line of lines) {
      if (stopHeadings.has(line.trim())) {
        break;
      }

      if (line.startsWith("```")) {
        if (inCode) {
          closeCode();
        } else {
          closeList();
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!line.trim()) {
        closeList();
        continue;
      }

      if (line.startsWith("# ")) {
        chunks.push(`<h2>${escapeHtml(line.slice(2))}</h2>`);
        continue;
      }

      if (line.startsWith("## ")) {
        closeList();
        chunks.push(`<h3>${escapeHtml(line.slice(3))}</h3>`);
        continue;
      }

      if (line.startsWith("- ")) {
        if (!inList) {
          chunks.push("<ul>");
          inList = true;
        }
        chunks.push(`<li>${escapeHtml(line.slice(2))}</li>`);
        continue;
      }

      closeList();
      chunks.push(`<p>${escapeHtml(line)}</p>`);
    }

    closeList();
    closeCode();
    readmeContent.innerHTML = chunks.join("");
  }

  fetch("./README.md")
    .then((response) => response.text())
    .then(renderReadme)
    .catch(() => {
      readmeContent.innerHTML = "<p>README could not be loaded here. Use the link above for the raw file.</p>";
    });
})();
