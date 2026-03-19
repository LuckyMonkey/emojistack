(function () {
  const readmeContent = document.getElementById("readme-content");
  const showcaseRoot = document.getElementById("random-showcases");
  const prefabs = (window.EmojiStack && window.EmojiStack.prefabs) || [];
  const tones = ["peach", "mint", "butter", "sky", "rose", "lavender"];

  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function renderReadme(md) {
    const lines = md.split(/\r?\n/);
    const stopHeadings = new Set(["## Install", "## Development", "## File Structure"]);
    const chunks = [];
    let inList = false;
    let inCode = false;
    let codeLines = [];
    let paragraph = [];

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

    function closeParagraph() {
      if (paragraph.length) {
        chunks.push(`<p>${escapeHtml(paragraph.join(" "))}</p>`);
        paragraph = [];
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
          closeParagraph();
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
        closeParagraph();
        closeList();
        continue;
      }

      if (line.startsWith("# ")) {
        closeParagraph();
        chunks.push(`<h2>${escapeHtml(line.slice(2))}</h2>`);
        continue;
      }

      if (line.startsWith("## ")) {
        closeParagraph();
        closeList();
        chunks.push(`<h3>${escapeHtml(line.slice(3))}</h3>`);
        continue;
      }

      if (line.startsWith("- ")) {
        closeParagraph();
        if (!inList) {
          chunks.push("<ul>");
          inList = true;
        }
        chunks.push(`<li>${escapeHtml(line.slice(2))}</li>`);
        continue;
      }

      closeList();
      paragraph.push(line.trim());
    }

    closeParagraph();
    closeList();
    closeCode();
    readmeContent.innerHTML = chunks.join("");
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function pairSnippet(prefab) {
    return `<i class="${prefab.baseEmoji}${prefab.overlayEmoji}"></i>`;
  }

  function renderShowcases() {
    if (!showcaseRoot) {
      return;
    }

    const picked = shuffle(prefabs).slice(0, 5);
    showcaseRoot.innerHTML = "";

    picked.forEach((prefab, index) => {
      const section = document.createElement("section");
      const tone = tones[index % tones.length];
      const snippet = pairSnippet(prefab);
      section.className = "showcase-panel";
      section.innerHTML =
        `<article class="showcase-card" data-tone="${tone}">` +
        `<div class="showcase-inner">` +
        `<span class="showcase-kicker">${escapeHtml(prefab.category || "prefab")}</span>` +
        `<h2 class="showcase-title">${escapeHtml(prefab.label || prefab.name)}</h2>` +
        `<p class="showcase-note">${escapeHtml((prefab.positionLabel || prefab.position) + " placement with pair-token syntax.")}</p>` +
        `<div class="showcase-icon"><i class="${prefab.baseEmoji}${prefab.overlayEmoji}"></i></div>` +
        `<code class="showcase-code" data-copy="${snippet.replace(/"/g, "&quot;")}">${escapeHtml(snippet)}</code>` +
        `</div>` +
        `</article>`;
      showcaseRoot.appendChild(section);
    });

    if (window.EmojiStack) {
      window.EmojiStack.refresh(showcaseRoot);
    }
  }

  async function copyText(value, target) {
    try {
      await navigator.clipboard.writeText(value);
      const original = target.textContent;
      target.textContent = "Copied";
      window.setTimeout(() => {
        target.textContent = original;
      }, 900);
    } catch (error) {
      target.textContent = "Clipboard blocked";
    }
  }

  document.addEventListener("click", (event) => {
    const code = event.target.closest(".showcase-code[data-copy]");
    if (!code) {
      return;
    }
    copyText(code.dataset.copy, code);
  });

  fetch("./README.md")
    .then((response) => response.text())
    .then(renderReadme)
    .catch(() => {
      readmeContent.innerHTML = "<p>README could not be loaded here. Use the GitHub button for the full file.</p>";
    });

  renderShowcases();
})();
