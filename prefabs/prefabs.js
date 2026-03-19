(function () {
  const store = window.EmojiStackPrefabStore;
  const grid = document.getElementById("prefab-grid");
  const searchInput = document.getElementById("prefab-search");
  const outputInput = document.getElementById("prefab-copy-output");
  const copyButton = document.getElementById("prefab-copy-button");

  let prefabs = [];

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function className(prefab) {
    return `p-${prefab.name}`;
  }

  function htmlSnippet(prefab) {
    return `<i class="es p-${prefab.name}"></i>`;
  }

  function setOutput(value) {
    outputInput.value = value;
  }

  function filteredPrefabs() {
    const query = normalizeText(searchInput.value);
    if (!query) {
      return prefabs;
    }
    return prefabs.filter((prefab) => prefab.searchText.includes(query));
  }

  function render() {
    const visible = filteredPrefabs();
    grid.innerHTML = "";

    if (!visible.length) {
      grid.innerHTML = '<article class="prefab-card prefab-empty"><strong>No prefabs match.</strong><span>Try another name, emoji, or position.</span></article>';
      setOutput("");
      return;
    }

    visible.forEach((prefab) => {
      const classValue = className(prefab);
      const card = document.createElement("article");
      card.className = "prefab-card";
      card.innerHTML =
        `<button type="button" class="prefab-stage" data-copy="${classValue}" title="Click to copy ${classValue}">` +
          `<i class="es p-${prefab.name}" title="${prefab.label || prefab.name}"></i>` +
        `</button>` +
        `<div class="prefab-meta">` +
          `<strong title="${prefab.label || prefab.name}">${prefab.label || prefab.name}</strong>` +
          `<span>${prefab.positionLabel || prefab.position}</span>` +
        `</div>` +
        `<code data-copy="${classValue}" title="Click to copy ${classValue}">${classValue}</code>` +
        `<div class="prefab-actions">` +
          `<a class="prefab-action prefab-edit" href="../sandbox/?prefab=${encodeURIComponent(prefab.name)}" title="Open ${prefab.name} in the sandbox editor">Edit</a>` +
          `<button type="button" class="prefab-action prefab-copy" data-copy="${htmlSnippet(prefab).replace(/"/g, "&quot;")}" title="Copy ${htmlSnippet(prefab)}">Copy HTML</button>` +
        `</div>`;
      grid.appendChild(card);
    });

    setOutput(className(visible[0]));
    if (window.EmojiStack) {
      window.EmojiStack.refresh(grid);
    }
  }

  async function copyText(value) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1000);
    } catch (error) {
      copyButton.textContent = "Clipboard blocked";
    }
  }

  async function boot() {
    prefabs = store ? await store.loadPrefabs() : (window.EmojiStack?.prefabs || []);
    render();
  }

  searchInput.addEventListener("input", render);
  copyButton.addEventListener("click", () => copyText(outputInput.value));
  document.addEventListener("click", (event) => {
    const copyTarget = event.target.closest("[data-copy]");
    if (!copyTarget) {
      return;
    }

    const value = copyTarget.dataset.copy;
    setOutput(value);
    copyText(value);
  });

  boot().catch(() => {
    grid.innerHTML = '<article class="prefab-card prefab-empty"><strong>Prefab list could not load.</strong><span>Check the configured sheet endpoint.</span></article>';
  });
})();
