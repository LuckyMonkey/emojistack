(function () {
  const store = window.EmojiStackPrefabStore;
  const readmeContent = document.getElementById("readme-content");
  const showcaseRoot = document.getElementById("random-showcases");
  const rouletteIcon = document.getElementById("roulette-icon");
  const rouletteNote = document.getElementById("roulette-note");
  const rouletteStage = document.getElementById("roulette-stage");
  const rouletteCopy = document.getElementById("roulette-copy");
  const tones = ["peach", "mint", "butter", "sky", "rose", "lavender"];
  let prefabs = [];
  let rouletteTimer = null;
  let rouletteActive = false;

  function escapeHtml(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function renderReadme(md) {
    const lines = md.split(/\r?\n/);
    const stopHeadings = new Set(["## Usage", "## Install", "## Development", "## File Structure"]);
    const chunks = [];
    let inList = false;
    let inCode = false;
    let codeLines = [];
    let paragraph = [];
    let paragraphCount = 0;

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
        paragraphCount += 1;
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
        if (paragraphCount >= 3) {
          break;
        }
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

  function prefabSnippet(prefab) {
    return `<i class="es p-${prefab.name}"></i>`;
  }

  function pickRandomPrefab() {
    return prefabs[Math.floor(Math.random() * prefabs.length)];
  }

  function renderRoulette(prefab) {
    if (!prefab || !rouletteIcon) {
      return;
    }

    rouletteIcon.className = `es p-${prefab.name}`;
    rouletteIcon.title = prefab.label || prefab.name;
    rouletteStage.title = `${prefab.label || prefab.name} · click to stop and copy`;
    rouletteNote.textContent = rouletteActive
      ? "Click the spinner to stop on one and copy it."
      : "Copied. Click again to spin.";
    rouletteCopy.textContent = prefabSnippet(prefab);
    rouletteCopy.dataset.copy = prefabSnippet(prefab);
    rouletteCopy.title = `${prefab.label || prefab.name} · click to copy`;

    if (window.EmojiStack) {
      window.EmojiStack.refresh(rouletteIcon);
    }
  }

  function startRoulette() {
    if (!rouletteIcon || !rouletteStage || prefabs.length === 0 || rouletteActive) {
      return;
    }

    rouletteActive = true;
    rouletteStage.classList.add("is-spinning");
    rouletteTimer = window.setInterval(() => {
      renderRoulette(pickRandomPrefab());
    }, 120);
  }

  async function stopRouletteAndCopy() {
    if (!rouletteActive) {
      startRoulette();
      return;
    }

    rouletteActive = false;
    window.clearInterval(rouletteTimer);
    rouletteTimer = null;
    rouletteStage.classList.remove("is-spinning");
    const selected = pickRandomPrefab();
    renderRoulette(selected);
    await copyText(prefabSnippet(selected), rouletteCopy);
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
      const snippet = prefabSnippet(prefab);
      section.className = "showcase-panel";
      section.innerHTML =
        `<article class="showcase-card" data-tone="${tone}">` +
        `<div class="showcase-inner">` +
        `<div class="showcase-icon"><i class="es p-${prefab.name}" title="${escapeHtml(prefab.label || prefab.name)}"></i></div>` +
        `<code class="showcase-code" title="Click to copy" data-copy="${snippet.replace(/"/g, "&quot;")}">${escapeHtml(snippet)}</code>` +
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
    const rouletteCode = event.target.closest(".roulette-copy[data-copy]");

    if (code) {
      copyText(code.dataset.copy, code);
      return;
    }

    if (rouletteCode) {
      copyText(rouletteCode.dataset.copy, rouletteCode);
    }
  });

  if (rouletteStage) {
    rouletteStage.addEventListener("click", stopRouletteAndCopy);
  }

  fetch("./README.md")
    .then((response) => response.text())
    .then(renderReadme)
    .catch(() => {
      readmeContent.innerHTML = "<p>README could not be loaded here. Use the GitHub button for the full file.</p>";
    });

  async function boot() {
    prefabs = store ? await store.loadPrefabs() : (window.EmojiStack?.prefabs || []);
    renderShowcases();
    if (prefabs.length) {
      renderRoulette(prefabs[0]);
      startRoulette();
    }
  }

  boot().catch(() => {
    rouletteNote.textContent = "Prefab feed could not load.";
  });
})();
