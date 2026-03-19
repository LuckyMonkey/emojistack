(function () {
  const prefabs = (window.EmojiStack && window.EmojiStack.prefabs) || [];
  const grid = document.getElementById("prefab-grid");
  const searchInput = document.getElementById("prefab-search");
  const outputInput = document.getElementById("prefab-copy-output");
  const copyButton = document.getElementById("prefab-copy-button");
  const positions = (window.EmojiStack && window.EmojiStack.data && window.EmojiStack.data.positions) || [];
  const positionDefaults = Object.fromEntries(positions.map((entry) => [entry.id, entry]));

  function styleString(prefab) {
    const rules = [];
    const position = positionDefaults[prefab.position];
    if (typeof prefab.subSize === "number") {
      rules.push(`--es-sub-size: ${prefab.subSize};`);
    }
    if (prefab.rotate && prefab.rotate !== "0deg") {
      rules.push(`--es-rotate: ${prefab.rotate};`);
    }
    if (position && typeof prefab.x === "number" && typeof prefab.y === "number") {
      if (prefab.x !== position.x) {
        rules.push(`--es-x: ${prefab.x}em;`);
      }
      if (prefab.y !== position.y) {
        rules.push(`--es-y: ${prefab.y}em;`);
      }
    }
    return rules.length ? ` style="${rules.join(" ")}"` : "";
  }

  function snippet(prefab) {
    return `<i class="es ${prefab.baseEmoji} ${prefab.overlayEmoji} ${prefab.position}"${styleString(prefab)}></i>`;
  }

  function render() {
    grid.innerHTML = "";
    prefabs.forEach((prefab) => {
      const card = document.createElement("article");
      card.className = "prefab-card";
      card.dataset.search = `${prefab.name} ${prefab.label || ""} ${prefab.base} ${prefab.overlay} ${prefab.baseEmoji} ${prefab.overlayEmoji} ${prefab.category || ""}`.toLowerCase();
      const copy = snippet(prefab);
      card.innerHTML =
        `<i class="es ${prefab.baseEmoji} ${prefab.overlayEmoji} ${prefab.position}"${styleString(prefab)}></i>` +
        `<strong>p-${prefab.name}</strong>` +
        `<span>${prefab.positionLabel || prefab.position}</span>` +
        `<code data-copy="${copy.replace(/"/g, "&quot;")}">${copy.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>`;
      grid.appendChild(card);
    });
  }

  function filter() {
    const query = searchInput.value.trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll(".prefab-card"));
    const matches = cards.filter((card) => !query || card.dataset.search.includes(query));
    cards.forEach((card) => {
      card.classList.toggle("is-hidden", query && !card.dataset.search.includes(query));
    });
    outputInput.value = matches[0] ? matches[0].querySelector("code").dataset.copy : searchInput.value;
  }

  async function copyText(value) {
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

  render();
  filter();
  if (window.EmojiStack) {
    window.EmojiStack.refresh(document);
  }

  searchInput.addEventListener("input", filter);
  copyButton.addEventListener("click", () => copyText(outputInput.value));
  document.addEventListener("click", (event) => {
    const code = event.target.closest("code[data-copy]");
    if (!code) {
      return;
    }
    outputInput.value = code.dataset.copy;
    copyText(code.dataset.copy);
  });
})();
