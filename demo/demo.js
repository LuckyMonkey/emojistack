(function () {
  const positions = (window.EmojiStack && window.EmojiStack.data && window.EmojiStack.data.positions) || [];
  const prefabs = (window.EmojiStack && window.EmojiStack.prefabs) || [];
  const prefabByName = Object.fromEntries(prefabs.map((prefab) => [prefab.name, prefab]));
  const positionDefaults = Object.fromEntries(positions.map((entry) => [entry.id, entry]));

  const showcaseEntries = [
    {
      title: "Strawberry Milk",
      kicker: "Starter prefab",
      note: "The strawberry sits on the bottle body and the copied snippet stays short.",
      prefab: "strawberry-milk",
      tone: "peach",
      search: ["strawberry", "milk", "bottle", "prefab", "literal"]
    },
    {
      title: "Fire Laptop",
      kicker: "Starter prefab",
      note: "A tech stack with offset fire that feels intentional instead of accidental.",
      prefab: "fire-laptop",
      tone: "sky",
      search: ["fire", "laptop", "tech", "prefab", "literal"]
    },
    {
      title: "Literal Pair Syntax",
      kicker: "Literal classes",
      note: "Actual emoji classes. First emoji becomes the base, second becomes the overlay.",
      snippet: '<i class="🍼🍓"></i>',
      className: "🍼🍓",
      tone: "rose",
      search: ["literal", "emoji class", "strawberry", "bottle"]
    },
    {
      title: "Alias Pair Syntax",
      kicker: "Alias classes",
      note: "Same visual result, safer class names, same runtime ordering.",
      snippet: '<i class="es es-l e-bottle e-strawberry s-44"></i>',
      className: "es es-l e-bottle e-strawberry s-44",
      tone: "mint",
      search: ["alias", "safe", "bottle", "strawberry"]
    },
    {
      title: "Warning Folder",
      kicker: "Starter prefab",
      note: "Folder and box badges copy as literal emoji classes with the tuned placement intact.",
      prefab: "warning-folder",
      tone: "butter",
      search: ["warning", "folder", "office", "prefab", "literal"]
    },
    {
      title: "Bubble Brain",
      kicker: "New prefab",
      note: "A deliberately ridiculous drink preset with a tuned center-body placement.",
      prefab: "bubble-tea-brain",
      tone: "lavender",
      search: ["bubble", "brain", "tea", "drink", "new"]
    },
    {
      title: "Robot TV",
      kicker: "New prefab",
      note: "More glitz, more cartoon logic, cleaner placement on a rectangular base.",
      prefab: "robot-tv",
      tone: "sky",
      search: ["robot", "tv", "screen", "new"]
    },
    {
      title: "Calendar Bomb",
      kicker: "New prefab",
      note: "A playful badge composition showing off top-cell placement and rotation.",
      prefab: "calendar-bomb",
      tone: "peach",
      search: ["calendar", "bomb", "cursed", "new"]
    },
    {
      title: "Coffee Heart",
      kicker: "New prefab",
      note: "Mood stack with a smaller overlay so the cup still reads first.",
      prefab: "coffee-heart",
      tone: "rose",
      search: ["coffee", "heart", "mood", "new"]
    },
    {
      title: "Sparkle Phone",
      kicker: "Starter prefab",
      note: "Sparkles land in the upper-left and the copied snippet stays in literal emoji-class form.",
      prefab: "sparkle-phone",
      tone: "mint",
      search: ["sparkle", "phone", "glitz", "prefab"]
    }
  ];

  const searchInput = document.getElementById("quick-search");
  const outputInput = document.getElementById("quick-output");
  const copyButton = document.getElementById("copy-output");
  const searchResults = document.getElementById("search-results");
  const showcaseStack = document.getElementById("showcase-stack");
  const positionGallery = document.getElementById("position-gallery");
  const prefabGallery = document.getElementById("prefab-gallery");

  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

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

  function snippetFromPrefab(prefab) {
    return `<i class="${prefab.baseEmoji}${prefab.overlayEmoji}"></i>`;
  }

  function classNameFromPrefab(prefab) {
    return `${prefab.baseEmoji}${prefab.overlayEmoji}`;
  }

  function renderShowcases() {
    showcaseStack.innerHTML = "";
    showcaseEntries.forEach((entry) => {
      const prefab = entry.prefab ? prefabByName[entry.prefab] : null;
      const snippet = prefab ? snippetFromPrefab(prefab) : entry.snippet;
      const className = prefab ? classNameFromPrefab(prefab) : entry.className;
      const inlineStyle = "";
      const section = document.createElement("section");
      section.className = "showcase-panel";
      section.dataset.tone = entry.tone;
      section.dataset.search = `${entry.title} ${entry.note} ${className} ${snippet} ${entry.search.join(" ")}`.toLowerCase();
      section.innerHTML =
        `<div class="showcase-inner">` +
        `<span class="showcase-kicker">${entry.kicker}</span>` +
        `<h2 class="showcase-title">${entry.title}</h2>` +
        `<p class="showcase-note">${entry.note}</p>` +
        `<div class="showcase-icon"><i class="${className}"${inlineStyle}></i></div>` +
        `<code class="showcase-code" data-copy="${escapeHtml(snippet)}">${escapeHtml(snippet)}</code>` +
        `</div>`;
      showcaseStack.appendChild(section);
    });
  }

  function renderPositions() {
    positions.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "position-swatch";
      const snippet = `<i class="es 📦 🔌 ${entry.id}"></i>`;
      card.innerHTML =
        `<i class="es 📦 🔌 ${entry.id}"></i>` +
        `<strong data-copy="${escapeHtml(snippet)}">${entry.id}</strong>` +
        `<span>${entry.label}</span>`;
      positionGallery.appendChild(card);
    });
  }

  function renderPrefabs() {
    prefabs.slice(0, 16).forEach((prefab) => {
      const tile = document.createElement("article");
      tile.className = "prefab-tile";
      const snippet = snippetFromPrefab(prefab);
      tile.innerHTML =
        `<i class="${classNameFromPrefab(prefab)}"></i>` +
        `<strong data-copy="${escapeHtml(snippet)}">p-${prefab.name}</strong>` +
        `<span>${prefab.positionLabel || prefab.position}</span>`;
      prefabGallery.appendChild(tile);
    });
  }

  function updateSearch() {
    const query = searchInput.value.trim().toLowerCase();
    const showcasePanels = Array.from(document.querySelectorAll(".showcase-panel"));
    const matchingEntries = [];

    showcasePanels.forEach((panel, index) => {
      const entry = showcaseEntries[index];
      const match = !query || panel.dataset.search.includes(query);
      panel.classList.toggle("is-hidden", !match);
      if (match) {
        matchingEntries.push(entry);
      }
    });

    searchResults.innerHTML = "";
    matchingEntries.slice(0, 8).forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = entry.title;
      button.addEventListener("click", () => {
        outputInput.value = entry.snippet;
        searchInput.value = entry.title;
        updateSearch();
        Array.from(document.querySelectorAll(".showcase-panel"))
          .find((panel) => panel.dataset.search.includes(entry.title.toLowerCase()))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      searchResults.appendChild(button);
    });

    const first = matchingEntries[0];
    if (first && first.prefab && prefabByName[first.prefab]) {
      outputInput.value = snippetFromPrefab(prefabByName[first.prefab]);
    } else {
      outputInput.value = first ? first.snippet : searchInput.value;
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(outputInput.value);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1200);
    } catch (error) {
      copyButton.textContent = "Clipboard blocked";
    }
  }

  async function copyText(value) {
    outputInput.value = value;
    await copyOutput();
  }

  renderShowcases();
  renderPositions();
  renderPrefabs();
  updateSearch();

  if (window.EmojiStack) {
    window.EmojiStack.refresh(document);
  }

  searchInput.addEventListener("input", updateSearch);
  copyButton.addEventListener("click", copyOutput);
  document.addEventListener("click", (event) => {
    const copyNode = event.target.closest("[data-copy]");
    if (!copyNode) {
      return;
    }
    copyText(copyNode.dataset.copy);
  });
})();
