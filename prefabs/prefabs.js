(function () {
  const prefabs = (window.EmojiStack && window.EmojiStack.prefabs) || [];
  const grid = document.getElementById("prefab-grid");
  const searchInput = document.getElementById("prefab-search");
  const outputInput = document.getElementById("prefab-copy-output");
  const copyButton = document.getElementById("prefab-copy-button");

  function className(prefab) {
    return `p-${prefab.name}`;
  }

  function setOutput(value) {
    outputInput.value = value;
  }

  function render() {
    grid.innerHTML = "";

    prefabs.forEach((prefab) => {
      const card = document.createElement("article");
      const classValue = className(prefab);
      card.className = "prefab-card";
      card.dataset.search = `${prefab.name} ${prefab.label || ""} ${prefab.base} ${prefab.overlay} ${prefab.baseEmoji} ${prefab.overlayEmoji}`.toLowerCase();
      card.innerHTML =
        `<button type="button" class="prefab-stage" data-copy="${classValue}" title="Click to copy ${classValue}">` +
          `<i class="${prefab.baseEmoji}${prefab.overlayEmoji}"></i>` +
        `</button>` +
        `<div class="prefab-meta">` +
          `<strong title="${prefab.label || prefab.name}">${prefab.label || prefab.name}</strong>` +
          `<span>${prefab.positionLabel || prefab.position}</span>` +
        `</div>` +
        `<code data-copy="${classValue}" title="Click to copy ${classValue}">${classValue}</code>` +
        `<div class="prefab-actions">` +
          `<a class="prefab-action prefab-edit" href="../sandbox/?prefab=${encodeURIComponent(prefab.name)}" title="Open ${prefab.name} in the sandbox editor">Edit</a>` +
          `<button type="button" class="prefab-action prefab-copy" data-copy="${classValue}" title="Copy ${classValue}">Copy</button>` +
        `</div>`;
      grid.appendChild(card);
    });
  }

  function visibleCards() {
    return Array.from(document.querySelectorAll(".prefab-card")).filter((card) => !card.classList.contains("is-hidden"));
  }

  function filter() {
    const query = searchInput.value.trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll(".prefab-card"));

    cards.forEach((card) => {
      const visible = !query || card.dataset.search.includes(query);
      card.classList.toggle("is-hidden", !visible);
    });

    const first = visibleCards()[0];
    setOutput(first ? first.querySelector("code[data-copy]").dataset.copy : "");
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

  render();
  filter();

  if (window.EmojiStack) {
    window.EmojiStack.refresh(document);
  }

  searchInput.addEventListener("input", filter);
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
})();
