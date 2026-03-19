(function () {
  const STORAGE_STATE = "emojistack:sandbox-state";
  const STORAGE_PREFABS = "emojistack:local-prefabs";
  const emojiData = (window.EmojiStack && window.EmojiStack.data && window.EmojiStack.data.emojis) || [];
  const positions = (window.EmojiStack && window.EmojiStack.data && window.EmojiStack.data.positions) || [];
  const starterPrefabs = (window.EmojiStack && window.EmojiStack.prefabs) || [];

  const emojiByAlias = Object.fromEntries(emojiData.map((entry) => [entry.alias, entry]));
  const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));
  const macroOrder = ["s-tl", "s-tc", "s-tr", "s-ml", "s-mc", "s-mr", "s-bl", "s-bc", "s-br"];
  const macroGrid = [
    ["s-tl", "s-tc", "s-tr"],
    ["s-ml", "s-mc", "s-mr"],
    ["s-bl", "s-bc", "s-br"]
  ];
  const microGrid = Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 6 }, (_, col) => {
      const macroRows = ["t", "m", "b"];
      const macroCols = ["l", "c", "r"];
      const quadRows = ["n", "s"];
      const quadCols = ["w", "e"];
      const macroId = `${macroRows[Math.floor(row / 2)]}${macroCols[Math.floor(col / 2)]}`;
      const quad = `${quadRows[row % 2]}${quadCols[col % 2]}`;
      return `s-${macroId}-${quad}`;
    })
  );

  const elements = {
    baseSelect: document.getElementById("base-select"),
    overlaySelect: document.getElementById("overlay-select"),
    positionSelect: document.getElementById("position-select"),
    positionNote: document.getElementById("position-note"),
    pickerModeToggle: document.getElementById("picker-mode-toggle"),
    directBoard: document.getElementById("position-direct"),
    macroBoard: document.getElementById("position-macro"),
    microBoard: document.getElementById("position-micro"),
    overlaySize: document.getElementById("overlay-size"),
    overlaySizeValue: document.getElementById("overlay-size-value"),
    iconSize: document.getElementById("icon-size"),
    iconSizeValue: document.getElementById("icon-size-value"),
    prefabName: document.getElementById("prefab-name"),
    modeToggle: document.getElementById("mode-toggle"),
    previewStage: document.getElementById("preview-stage"),
    previewMain: document.getElementById("preview-main"),
    previewCursed: document.getElementById("preview-cursed"),
    previewAlias: document.getElementById("preview-alias"),
    previewPrefab: document.getElementById("preview-prefab"),
    previewTitle: document.getElementById("preview-title"),
    previewSubtitle: document.getElementById("preview-subtitle"),
    cursedHtml: document.getElementById("cursed-html"),
    aliasHtml: document.getElementById("alias-html"),
    prefabHtml: document.getElementById("prefab-html"),
    prefabCss: document.getElementById("prefab-css"),
    prefabJson: document.getElementById("prefab-json"),
    starterPrefabs: document.getElementById("starter-prefabs"),
    localPrefabs: document.getElementById("local-prefabs"),
    prefabFilter: document.getElementById("prefab-filter"),
    savePrefab: document.getElementById("save-prefab"),
    duplicatePrefab: document.getElementById("duplicate-prefab"),
    resetButton: document.getElementById("reset-button"),
    exportJson: document.getElementById("export-json"),
    importJson: document.getElementById("import-json"),
    ioTextarea: document.getElementById("io-textarea"),
    themeToggle: document.getElementById("theme-toggle"),
    statusLine: document.getElementById("status-line")
  };

  const defaults = {
    mode: "prefab",
    base: "bottle",
    overlay: "strawberry",
    position: "s-center",
    pickerMode: "direct",
    subSize: 0.5,
    iconSize: 300,
    prefabName: "strawberry-milk",
    theme: "light"
  };

  let state = loadState();
  let localPrefabs = loadLocalPrefabs();

  function loadState() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_STATE) || "{}") };
    } catch (error) {
      return { ...defaults };
    }
  }

  function loadLocalPrefabs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFABS) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_STATE, JSON.stringify(state));
    localStorage.setItem(STORAGE_PREFABS, JSON.stringify(localPrefabs));
  }

  function titleize(value) {
    return value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function sanitizeName(value) {
    const cleaned = (value || "custom-stack")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "custom-stack";
  }

  function guessPickerMode(positionId) {
    if (positionId === "s-center") {
      return "direct";
    }
    if (/^s-[a-z]{2}$/.test(positionId)) {
      return "macro";
    }
    return "micro";
  }

  function currentDefinition() {
    const base = emojiByAlias[state.base];
    const overlay = emojiByAlias[state.overlay];
    const position = positionById[state.position];
    return {
      name: sanitizeName(state.prefabName),
      base,
      overlay,
      position,
      subSize: Number(state.subSize),
      iconSize: Number(state.iconSize)
    };
  }

  function currentPrefabRecord() {
    const def = currentDefinition();
    return {
      name: def.name,
      label: titleize(def.name),
      category: "custom",
      base: def.base.alias,
      overlay: def.overlay.alias,
      position: def.position.id,
      positionLabel: def.position.label,
      baseEmoji: def.base.emoji,
      overlayEmoji: def.overlay.emoji,
      x: def.position.x,
      y: def.position.y,
      subSize: def.subSize,
      opacity: 1,
      rotate: "0deg"
    };
  }

  function renderSelect(select, selectedAlias) {
    const grouped = emojiData.reduce((acc, entry) => {
      acc[entry.category] ||= [];
      acc[entry.category].push(entry);
      return acc;
    }, {});

    select.innerHTML = "";
    Object.keys(grouped).sort().forEach((category) => {
      const group = document.createElement("optgroup");
      group.label = titleize(category);
      grouped[category].forEach((entry) => {
        const option = document.createElement("option");
        option.value = entry.alias;
        option.textContent = `${entry.emoji} ${entry.label}`;
        option.selected = entry.alias === selectedAlias;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
  }

  function renderPositionSelect() {
    elements.positionSelect.innerHTML = positions
      .map((entry) => `<option value="${entry.id}">${entry.id} · ${entry.label}</option>`)
      .join("");
    elements.positionSelect.value = state.position;
    elements.positionNote.textContent = positionById[state.position].label;
  }

  function makeCell(positionId, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `position-cell${positionId === state.position ? " active" : ""}`;
    button.dataset.position = positionId;
    button.textContent = label;
    return button;
  }

  function renderBoards() {
    elements.directBoard.innerHTML = "";
    elements.macroBoard.innerHTML = "";
    elements.microBoard.innerHTML = "";

    elements.directBoard.appendChild(makeCell("s-center", "center"));

    macroOrder.forEach((id) => {
      elements.macroBoard.appendChild(makeCell(id, id.replace("s-", "")));
    });

    microGrid.flat().forEach((id) => {
      elements.microBoard.appendChild(makeCell(id, id.replace("s-", "")));
    });

    [
      ["direct", elements.directBoard],
      ["macro", elements.macroBoard],
      ["micro", elements.microBoard]
    ].forEach(([mode, node]) => {
      node.hidden = mode !== state.pickerMode;
    });

    elements.pickerModeToggle.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.pickerMode === state.pickerMode);
    });
  }

  function clearInline(node) {
    [
      "--es-base",
      "--es-sub",
      "--es-x",
      "--es-y",
      "--es-opacity",
      "--es-rotate"
    ].forEach((key) => node.style.removeProperty(key));
  }

  function applyPreviewStyle(node) {
    const def = currentDefinition();
    node.style.setProperty("--es-sub-size", def.subSize);
    node.style.fontSize = `${def.iconSize}px`;
  }

  function setClassList(node, tokens) {
    clearInline(node);
    node.className = tokens.filter(Boolean).join(" ");
    applyPreviewStyle(node);
  }

  function applyInlineStack(node, def) {
    node.style.setProperty("--es-base", JSON.stringify(def.base.emoji));
    node.style.setProperty("--es-sub", JSON.stringify(def.overlay.emoji));
    node.style.setProperty("--es-x", `${def.position.x}em`);
    node.style.setProperty("--es-y", `${def.position.y}em`);
    node.style.setProperty("--es-sub-size", def.subSize);
  }

  function updatePreview() {
    const def = currentDefinition();
    const prefabClass = `p-${def.name}`;
    const isStarter = starterPrefabs.some((entry) => entry.name === def.name);
    const isLocal = localPrefabs.some((entry) => entry.name === def.name);

    setClassList(elements.previewCursed, ["es", def.base.emoji, def.overlay.emoji, def.position.id]);
    setClassList(elements.previewAlias, ["es", `e-${def.base.alias}`, `e-${def.overlay.alias}`, def.position.id]);
    setClassList(elements.previewPrefab, ["es", prefabClass]);
    setClassList(
      elements.previewMain,
      state.mode === "cursed"
        ? ["es", def.base.emoji, def.overlay.emoji, def.position.id]
        : state.mode === "alias"
          ? ["es", `e-${def.base.alias}`, `e-${def.overlay.alias}`, def.position.id]
          : ["es", prefabClass]
    );

    if (!isStarter) {
      applyInlineStack(elements.previewPrefab, def);
    }
    if (state.mode === "prefab" && !isStarter) {
      applyInlineStack(elements.previewMain, def);
    }

    elements.previewTitle.textContent = `${def.base.label} + ${def.overlay.label}`;
    elements.previewSubtitle.textContent = `${positionById[state.position].label} · ${state.mode} mode${isLocal ? " · local prefab saved" : ""}`;
    document.documentElement.style.setProperty("--preview-size", `${def.iconSize}px`);

    document.querySelectorAll(".compare-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.preview === state.mode);
    });

    if (window.EmojiStack) {
      window.EmojiStack.refresh(elements.previewStage);
    }

    elements.statusLine.textContent =
      state.mode === "prefab"
        ? isStarter || isLocal
          ? "Prefab preview is using prefab CSS."
          : "Prefab preview is showing the generated CSS variables inline."
        : "Runtime-enhanced pair syntax active.";
  }

  function currentStyleAttribute() {
    const def = currentDefinition();
    return `style="--es-sub-size: ${def.subSize};"`;
  }

  function updateSnippets() {
    const def = currentDefinition();
    const prefab = currentPrefabRecord();
    const styleAttr = currentStyleAttribute();
    const prefabClass = `p-${prefab.name}`;
    const starterExists = starterPrefabs.some((entry) => entry.name === prefab.name);
    const localExists = localPrefabs.some((entry) => entry.name === prefab.name);

    elements.cursedHtml.textContent = `<i class="es ${def.base.emoji} ${def.overlay.emoji} ${def.position.id}" ${styleAttr}></i>`;
    elements.aliasHtml.textContent = `<i class="es e-${def.base.alias} e-${def.overlay.alias} ${def.position.id}" ${styleAttr}></i>`;
    elements.prefabHtml.textContent = starterExists || localExists
      ? `<i class="es ${prefabClass}"></i>`
      : `Save or export CSS first, then use:\n<i class="es ${prefabClass}"></i>`;
    elements.prefabCss.textContent =
      `.${prefabClass} {\n` +
      `  --es-base: ${JSON.stringify(prefab.baseEmoji)};\n` +
      `  --es-sub: ${JSON.stringify(prefab.overlayEmoji)};\n` +
      `  --es-x: ${prefab.x}em;\n` +
      `  --es-y: ${prefab.y}em;\n` +
      `  --es-sub-size: ${prefab.subSize};\n` +
      `  --es-opacity: 1;\n` +
      `  --es-rotate: 0deg;\n` +
      `}`;
    elements.prefabJson.textContent = JSON.stringify(prefab, null, 2);
  }

  function renderPrefabCard(prefab, target, isLocal) {
    const filter = elements.prefabFilter.value.trim().toLowerCase();
    const haystack = `${prefab.name} ${prefab.label || ""} ${prefab.category || ""} ${prefab.base} ${prefab.overlay}`.toLowerCase();
    if (filter && !haystack.includes(filter)) {
      return;
    }

    const article = document.createElement("article");
    article.className = `prefab-card${sanitizeName(state.prefabName) === prefab.name ? " active" : ""}`;

    const icon = document.createElement("i");
    icon.className = "es";
    icon.style.setProperty("--es-base", JSON.stringify(prefab.baseEmoji));
    icon.style.setProperty("--es-sub", JSON.stringify(prefab.overlayEmoji));
    icon.style.setProperty("--es-x", `${prefab.x}em`);
    icon.style.setProperty("--es-y", `${prefab.y}em`);
    icon.style.setProperty("--es-sub-size", prefab.subSize);

    const body = document.createElement("div");
    body.innerHTML =
      `<strong>${prefab.label || titleize(prefab.name)}</strong>` +
      `<div class="badge">${prefab.name} · ${isLocal ? "local" : prefab.category}</div>` +
      `<div class="badge">${prefab.positionLabel || prefab.position}</div>`;

    const actions = document.createElement("div");
    actions.className = "prefab-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.textContent = "Use";
    useButton.addEventListener("click", () => loadPrefab(prefab, false));
    actions.appendChild(useButton);

    if (!isLocal) {
      const duplicateButton = document.createElement("button");
      duplicateButton.type = "button";
      duplicateButton.className = "quiet-button";
      duplicateButton.textContent = "Duplicate";
      duplicateButton.addEventListener("click", () => loadPrefab(prefab, true));
      actions.appendChild(duplicateButton);
    }

    body.appendChild(actions);
    article.append(icon, body);
    target.appendChild(article);
  }

  function renderPrefabLists() {
    elements.starterPrefabs.innerHTML = "";
    elements.localPrefabs.innerHTML = "";
    starterPrefabs.forEach((prefab) => renderPrefabCard(prefab, elements.starterPrefabs, false));
    localPrefabs.forEach((prefab) => renderPrefabCard(prefab, elements.localPrefabs, true));
    if (window.EmojiStack) {
      window.EmojiStack.refresh(elements.starterPrefabs);
      window.EmojiStack.refresh(elements.localPrefabs);
    }
  }

  function loadPrefab(prefab, duplicate) {
    state.base = prefab.base;
    state.overlay = prefab.overlay;
    state.position = prefab.position;
    state.pickerMode = guessPickerMode(prefab.position);
    state.subSize = prefab.subSize;
    state.prefabName = duplicate ? `${prefab.name}-copy` : prefab.name;
    redraw();
  }

  function saveCurrentPrefab() {
    const prefab = currentPrefabRecord();
    const existing = localPrefabs.findIndex((entry) => entry.name === prefab.name);
    if (existing >= 0) {
      localPrefabs.splice(existing, 1, prefab);
    } else {
      localPrefabs.unshift(prefab);
    }
    persist();
    renderPrefabLists();
    updateSnippets();
    elements.statusLine.textContent = `Saved local prefab "${prefab.name}".`;
  }

  function exportLocalJson() {
    elements.ioTextarea.value = JSON.stringify(localPrefabs, null, 2);
    copyText(elements.ioTextarea.value);
  }

  function importLocalJson() {
    let parsed;
    try {
      parsed = JSON.parse(elements.ioTextarea.value);
    } catch (error) {
      elements.statusLine.textContent = "Import failed: invalid JSON.";
      return;
    }

    const entries = Array.isArray(parsed) ? parsed : [parsed];
    entries.forEach((entry) => {
      if (!entry || !entry.name || !emojiByAlias[entry.base] || !emojiByAlias[entry.overlay] || !positionById[entry.position]) {
        return;
      }

      const normalized = {
        ...entry,
        name: sanitizeName(entry.name),
        label: entry.label || titleize(entry.name),
        category: entry.category || "custom",
        baseEmoji: emojiByAlias[entry.base].emoji,
        overlayEmoji: emojiByAlias[entry.overlay].emoji,
        x: positionById[entry.position].x,
        y: positionById[entry.position].y,
        positionLabel: positionById[entry.position].label,
        subSize: Number(entry.subSize || 0.5),
        opacity: 1,
        rotate: entry.rotate || "0deg"
      };
      const existing = localPrefabs.findIndex((item) => item.name === normalized.name);
      if (existing >= 0) {
        localPrefabs.splice(existing, 1, normalized);
      } else {
        localPrefabs.unshift(normalized);
      }
    });
    persist();
    renderPrefabLists();
    elements.statusLine.textContent = "Local prefabs imported.";
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      elements.statusLine.textContent = "Copied to clipboard.";
    } catch (error) {
      elements.statusLine.textContent = "Clipboard access failed. The text is still visible.";
    }
  }

  function syncControls() {
    renderSelect(elements.baseSelect, state.base);
    renderSelect(elements.overlaySelect, state.overlay);
    renderPositionSelect();
    renderBoards();
    elements.overlaySize.value = state.subSize;
    elements.iconSize.value = state.iconSize;
    elements.overlaySizeValue.textContent = Number(state.subSize).toFixed(2);
    elements.iconSizeValue.textContent = `${state.iconSize}px`;
    elements.prefabName.value = state.prefabName;
    elements.modeToggle.querySelectorAll("input").forEach((input) => {
      input.checked = input.value === state.mode;
    });
    const dark = state.theme === "dark";
    elements.previewStage.classList.toggle("preview-dark", dark);
    elements.previewStage.classList.toggle("preview-light", !dark);
    elements.themeToggle.textContent = dark ? "Switch to light" : "Switch backdrop";
  }

  function redraw() {
    persist();
    syncControls();
    updatePreview();
    updateSnippets();
    renderPrefabLists();
  }

  function bindEvents() {
    elements.baseSelect.addEventListener("change", (event) => {
      state.base = event.target.value;
      redraw();
    });

    elements.overlaySelect.addEventListener("change", (event) => {
      state.overlay = event.target.value;
      redraw();
    });

    elements.positionSelect.addEventListener("change", (event) => {
      state.position = event.target.value;
      state.pickerMode = guessPickerMode(state.position);
      redraw();
    });

    [elements.directBoard, elements.macroBoard, elements.microBoard].forEach((board) => {
      board.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-position]");
        if (!button) {
          return;
        }
        state.position = button.dataset.position;
        redraw();
      });
    });

    elements.pickerModeToggle.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-picker-mode]");
      if (!button) {
        return;
      }
      state.pickerMode = button.dataset.pickerMode;
      if (state.pickerMode === "direct") {
        state.position = "s-center";
      } else if (state.pickerMode === "macro" && !/^s-[a-z]{2}$/.test(state.position)) {
        state.position = "s-mc";
      } else if (state.pickerMode === "micro" && guessPickerMode(state.position) !== "micro") {
        state.position = "s-mc-se";
      }
      redraw();
    });

    elements.overlaySize.addEventListener("input", (event) => {
      state.subSize = Number(event.target.value);
      redraw();
    });

    elements.iconSize.addEventListener("input", (event) => {
      state.iconSize = Number(event.target.value);
      redraw();
    });

    elements.prefabName.addEventListener("input", (event) => {
      state.prefabName = event.target.value;
      redraw();
    });

    elements.modeToggle.addEventListener("change", (event) => {
      if (event.target.name === "mode") {
        state.mode = event.target.value;
        redraw();
      }
    });

    elements.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      redraw();
    });

    elements.savePrefab.addEventListener("click", saveCurrentPrefab);
    elements.duplicatePrefab.addEventListener("click", () => {
      state.prefabName = `${sanitizeName(state.prefabName)}-copy`;
      redraw();
    });

    elements.resetButton.addEventListener("click", () => {
      state = { ...defaults };
      redraw();
    });

    elements.exportJson.addEventListener("click", exportLocalJson);
    elements.importJson.addEventListener("click", importLocalJson);
    elements.prefabFilter.addEventListener("input", renderPrefabLists);

    document.querySelectorAll("[data-copy-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const node = document.getElementById(button.dataset.copyTarget);
        copyText(node.textContent);
      });
    });
  }

  bindEvents();
  redraw();
})();
