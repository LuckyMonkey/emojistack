(function () {
  const STORAGE_STATE = "emojistack:sandbox-state";
  const STORAGE_PREFABS = "emojistack:local-prefabs";
  const STORAGE_BASE_DEFAULTS = "emojistack:base-defaults";
  const STORAGE_SUB_DEFAULTS = "emojistack:sub-defaults";

  const emojiData = window.EmojiStack?.data?.emojis || [];
  const positions = window.EmojiStack?.data?.positions || [];
  const starterPrefabs = window.EmojiStack?.prefabs || [];

  const emojiByAlias = Object.fromEntries(emojiData.map((entry) => [entry.alias, entry]));
  const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));

  const elements = {
    prefabSearch: document.getElementById("prefab-search"),
    prefabJump: document.getElementById("prefab-jump"),
    savePrefab: document.getElementById("save-prefab"),
    deletePrefab: document.getElementById("delete-prefab"),
    duplicatePrefab: document.getElementById("duplicate-prefab"),
    themeToggle: document.getElementById("theme-toggle"),
    resetButton: document.getElementById("reset-button"),
    statusLine: document.getElementById("status-line"),
    previewStage: document.getElementById("preview-stage"),
    previewHero: document.getElementById("preview-hero"),
    previewMain: document.getElementById("preview-main"),
    previewTitle: document.getElementById("preview-title"),
    previewSubtitle: document.getElementById("preview-subtitle"),
    baseSelect: document.getElementById("base-select"),
    overlaySelect: document.getElementById("overlay-select"),
    modeToggle: document.getElementById("mode-toggle"),
    positionSelect: document.getElementById("position-select"),
    positionNote: document.getElementById("position-note"),
    pickerModeToggle: document.getElementById("picker-mode-toggle"),
    sizeModeNote: document.getElementById("size-mode-note"),
    iconSize: document.getElementById("icon-size"),
    iconSizeValue: document.getElementById("icon-size-value"),
    prefabName: document.getElementById("prefab-name"),
    directBoard: document.getElementById("position-direct"),
    macroBoard: document.getElementById("position-macro"),
    microBoard: document.getElementById("position-micro"),
    makeBaseDefault: document.getElementById("make-base-default"),
    makeSubDefault: document.getElementById("make-sub-default"),
    clearBaseDefault: document.getElementById("clear-base-default"),
    clearSubDefault: document.getElementById("clear-sub-default"),
    baseDefaultNote: document.getElementById("base-default-note"),
    subDefaultNote: document.getElementById("sub-default-note"),
    cursedHtml: document.getElementById("cursed-html"),
    aliasHtml: document.getElementById("alias-html"),
    prefabHtml: document.getElementById("prefab-html"),
    prefabCss: document.getElementById("prefab-css"),
    prefabJson: document.getElementById("prefab-json"),
    exportJson: document.getElementById("export-json"),
    importJson: document.getElementById("import-json"),
    ioTextarea: document.getElementById("io-textarea")
  };

  const defaults = {
    mode: "prefab",
    base: "bottle",
    overlay: "strawberry",
    position: "s-center",
    pickerMode: "direct",
    iconSize: 300,
    prefabName: "strawberry-milk",
    theme: "light"
  };

  let state = loadJson(STORAGE_STATE, defaults);
  let localPrefabs = loadJson(STORAGE_PREFABS, []);
  let baseDefaults = loadJson(STORAGE_BASE_DEFAULTS, {});
  let subDefaults = loadJson(STORAGE_SUB_DEFAULTS, {});
  let editingSource = "starter";
  let dragPointerId = null;

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      if (parsed === null) {
        return Array.isArray(fallback) ? fallback.slice() : { ...fallback };
      }
      return parsed;
    } catch (error) {
      return Array.isArray(fallback) ? fallback.slice() : { ...fallback };
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_STATE, JSON.stringify(state));
    localStorage.setItem(STORAGE_PREFABS, JSON.stringify(localPrefabs));
    localStorage.setItem(STORAGE_BASE_DEFAULTS, JSON.stringify(baseDefaults));
    localStorage.setItem(STORAGE_SUB_DEFAULTS, JSON.stringify(subDefaults));
  }

  function titleize(value) {
    return String(value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function sanitizeName(value) {
    const cleaned = String(value || "custom-stack")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "custom-stack";
  }

  function guessPickerMode(positionId) {
    if (positionId === "s-center") {
      return "direct";
    }
    return /^s-[a-z]{2}$/.test(positionId) ? "macro" : "micro";
  }

  function subSizeForPosition(positionId) {
    const mode = guessPickerMode(positionId);
    if (mode === "direct") {
      return 0.92;
    }
    if (mode === "macro") {
      return 0.58;
    }
    return 0.36;
  }

  function sizeLabelForPosition(positionId) {
    const mode = guessPickerMode(positionId);
    if (mode === "direct") {
      return "Direct overlay";
    }
    if (mode === "macro") {
      return "3x3 badge";
    }
    return "6x6 micro badge";
  }

  function currentBaseDefault() {
    return baseDefaults[state.base] || null;
  }

  function currentSubDefault() {
    return subDefaults[state.overlay] || null;
  }

  function currentDefaultPreset() {
    return currentSubDefault() || currentBaseDefault();
  }

  function currentUsesDefaultPreset() {
    const preset = currentDefaultPreset();
    return Boolean(preset && preset.position === state.position);
  }

  function applySavedDefault() {
    const preset = currentDefaultPreset();
    if (!preset || !positionById[preset.position]) {
      return false;
    }
    state.position = preset.position;
    state.pickerMode = guessPickerMode(preset.position);
    return true;
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
      subSize: subSizeForPosition(state.position),
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

  function prefabKey(prefab, source) {
    return `${source}:${prefab.name}`;
  }

  function findPrefabByKey(key) {
    const [source, name] = String(key || "").split(":");
    const list = source === "local" ? localPrefabs : starterPrefabs;
    const prefab = list.find((entry) => entry.name === name);
    return prefab ? { prefab, source } : null;
  }

  function syncRuntimeDefaults() {
    if (window.EmojiStack?.setBaseDefaults) {
      window.EmojiStack.setBaseDefaults(baseDefaults);
    } else {
      window.EmojiStackBaseDefaults = { ...baseDefaults };
    }

    if (window.EmojiStack?.setSubDefaults) {
      window.EmojiStack.setSubDefaults(subDefaults);
    } else {
      window.EmojiStackSubDefaults = { ...subDefaults };
    }
  }

  function renderEmojiSelect(select, selectedAlias) {
    const grouped = emojiData.reduce((acc, entry) => {
      acc[entry.category] ||= [];
      acc[entry.category].push(entry);
      return acc;
    }, {});

    select.innerHTML = "";
    Object.keys(grouped).sort().forEach((category) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = titleize(category);
      grouped[category].forEach((entry) => {
        const option = document.createElement("option");
        option.value = entry.alias;
        option.textContent = `${entry.emoji} ${entry.label}`;
        option.selected = entry.alias === selectedAlias;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
  }

  function renderPositionSelect() {
    elements.positionSelect.innerHTML = positions
      .map((entry) => `<option value="${entry.id}">${entry.id} · ${entry.label}</option>`)
      .join("");
    elements.positionSelect.value = state.position;
    elements.positionNote.textContent = positionById[state.position].label;
  }

  function boardEntries(mode) {
    if (mode === "direct") {
      return [["s-center", "center"]];
    }
    return positions
      .filter((entry) => guessPickerMode(entry.id) === mode)
      .map((entry) => [entry.id, entry.id.replace("s-", "")]);
  }

  function renderBoard(node, mode) {
    node.innerHTML = boardEntries(mode)
      .map(([id, label]) => (
        `<button type="button" class="position-cell${id === state.position ? " active" : ""}" data-position="${id}" title="${positionById[id].label}">${label}</button>`
      ))
      .join("");
    node.hidden = state.pickerMode !== mode;
  }

  function renderBoards() {
    renderBoard(elements.directBoard, "direct");
    renderBoard(elements.macroBoard, "macro");
    renderBoard(elements.microBoard, "micro");
    elements.pickerModeToggle.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.pickerMode === state.pickerMode);
    });
  }

  function filteredPrefabs() {
    const query = elements.prefabSearch.value.trim().toLowerCase();
    const withSource = starterPrefabs
      .map((prefab) => ({ prefab, source: "starter" }))
      .concat(localPrefabs.map((prefab) => ({ prefab, source: "local" })));

    return withSource.filter(({ prefab, source }) => {
      if (!query) {
        return true;
      }
      const text = `${prefab.name} ${prefab.label || ""} ${prefab.base} ${prefab.overlay} ${prefab.category || ""} ${source}`.toLowerCase();
      return text.includes(query);
    });
  }

  function renderPrefabPicker() {
    const items = filteredPrefabs();
    const currentName = sanitizeName(state.prefabName);
    elements.prefabJump.innerHTML = "";

    if (!items.length) {
      elements.prefabJump.innerHTML = '<option value="">No prefab match</option>';
      return;
    }

    const groups = {
      starter: items.filter((entry) => entry.source === "starter"),
      local: items.filter((entry) => entry.source === "local")
    };

    ["starter", "local"].forEach((source) => {
      if (!groups[source].length) {
        return;
      }
      const optgroup = document.createElement("optgroup");
      optgroup.label = source === "starter" ? "Starter prefabs" : "Local prefabs";
      groups[source].forEach(({ prefab }) => {
        const option = document.createElement("option");
        option.value = prefabKey(prefab, source);
        option.textContent = `${prefab.label || titleize(prefab.name)} · ${prefab.name}`;
        option.selected = currentName === prefab.name && editingSource === source;
        optgroup.appendChild(option);
      });
      elements.prefabJump.appendChild(optgroup);
    });

    if (!elements.prefabJump.value) {
      elements.prefabJump.selectedIndex = 0;
    }
  }

  function setPreview() {
    const def = currentDefinition();
    const icon = elements.previewMain;
    const maxByHeight = Math.max(160, Math.floor(window.innerHeight * 0.46));
    const maxByWidth = window.innerWidth > 1220
      ? Math.max(220, Math.floor(window.innerWidth * 0.28))
      : Math.max(220, Math.floor(window.innerWidth * 0.62));
    const appliedSize = Math.min(def.iconSize, maxByHeight, maxByWidth);
    icon.className = "es";
    icon.style.fontSize = `${appliedSize}px`;
    icon.style.setProperty("--es-base", JSON.stringify(def.base.emoji));
    icon.style.setProperty("--es-sub", JSON.stringify(def.overlay.emoji));
    icon.style.setProperty("--es-x", `${def.position.x}em`);
    icon.style.setProperty("--es-y", `${def.position.y}em`);
    icon.style.setProperty("--es-sub-size", `${def.subSize}`);

    elements.previewTitle.textContent = `${def.base.label} + ${def.overlay.label}`;
    elements.previewSubtitle.textContent = `${def.position.label} · ${sizeLabelForPosition(def.position.id)}`;
    elements.previewHero.title = `${def.base.label} + ${def.overlay.label} · drag to place`;

    elements.previewStage.classList.toggle("preview-dark", state.theme === "dark");
    elements.previewStage.classList.toggle("preview-light", state.theme !== "dark");
  }

  function literalClassString(def) {
    const tokens = ["es", def.base.emoji, def.overlay.emoji];
    if (!currentUsesDefaultPreset()) {
      tokens.push(def.position.id);
    }
    return tokens.join(" ");
  }

  function aliasClassString(def) {
    const tokens = ["es", `e-${def.base.alias}`, `e-${def.overlay.alias}`];
    if (!currentUsesDefaultPreset()) {
      tokens.push(def.position.id);
    }
    return tokens.join(" ");
  }

  function updateSnippets() {
    const def = currentDefinition();
    const prefab = currentPrefabRecord();
    const prefabClass = `p-${prefab.name}`;
    const saved = starterPrefabs.some((entry) => entry.name === prefab.name) || localPrefabs.some((entry) => entry.name === prefab.name);

    elements.cursedHtml.textContent = `<i class="${literalClassString(def)}"></i>`;
    elements.aliasHtml.textContent = `<i class="${aliasClassString(def)}"></i>`;
    elements.prefabHtml.textContent = saved
      ? `<i class="es ${prefabClass}"></i>`
      : `Save first, then use:\n<i class="es ${prefabClass}"></i>`;
    elements.prefabCss.textContent =
      `.${prefabClass} {\n` +
      `  --es-base: ${JSON.stringify(prefab.baseEmoji)};\n` +
      `  --es-sub: ${JSON.stringify(prefab.overlayEmoji)};\n` +
      `  --es-x: ${prefab.x}em;\n` +
      `  --es-y: ${prefab.y}em;\n` +
      `  --es-sub-size: ${prefab.subSize};\n` +
      `}`;
    elements.prefabJson.textContent = JSON.stringify(prefab, null, 2);
  }

  function syncControls() {
    renderEmojiSelect(elements.baseSelect, state.base);
    renderEmojiSelect(elements.overlaySelect, state.overlay);
    renderPositionSelect();
    renderBoards();
    renderPrefabPicker();

    elements.iconSize.value = state.iconSize;
    elements.iconSizeValue.textContent = `${state.iconSize}px`;
    elements.sizeModeNote.textContent = sizeLabelForPosition(state.position);
    elements.prefabName.value = state.prefabName;
    elements.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
    elements.savePrefab.textContent = editingSource === "local" ? "Save" : "Save";
    elements.deletePrefab.disabled = editingSource !== "local";

    const baseDefault = currentBaseDefault();
    const subDefault = currentSubDefault();
    elements.baseDefaultNote.textContent = baseDefault
      ? `Base default: ${positionById[baseDefault.position].label}`
      : "No base default.";
    elements.subDefaultNote.textContent = subDefault
      ? `Sub default: ${positionById[subDefault.position].label}`
      : "No sub default.";
    elements.clearBaseDefault.disabled = !baseDefault;
    elements.clearSubDefault.disabled = !subDefault;

    elements.modeToggle.querySelectorAll("input").forEach((input) => {
      input.checked = input.value === state.mode;
    });
  }

  function redraw() {
    persist();
    syncRuntimeDefaults();
    syncControls();
    setPreview();
    updateSnippets();
  }

  function setStatus(message) {
    elements.statusLine.textContent = message;
  }

  function loadPrefab(prefab, source, duplicate) {
    state.base = prefab.base;
    state.overlay = prefab.overlay;
    state.position = prefab.position;
    state.pickerMode = guessPickerMode(prefab.position);
    state.prefabName = duplicate ? `${prefab.name}-copy` : prefab.name;
    editingSource = duplicate ? "custom" : source;
    setStatus(duplicate ? "Prefab duplicated." : `Loaded ${prefab.label || titleize(prefab.name)}.`);
    redraw();
  }

  function saveCurrentPrefab() {
    const prefab = currentPrefabRecord();
    const index = localPrefabs.findIndex((entry) => entry.name === prefab.name);
    if (index >= 0) {
      localPrefabs.splice(index, 1, prefab);
    } else {
      localPrefabs.unshift(prefab);
    }
    editingSource = "local";
    setStatus(`Saved ${prefab.name}.`);
    redraw();
  }

  function deleteCurrentPrefab() {
    const name = sanitizeName(state.prefabName);
    const index = localPrefabs.findIndex((entry) => entry.name === name);
    if (index < 0) {
      return;
    }
    localPrefabs.splice(index, 1);
    editingSource = starterPrefabs.some((entry) => entry.name === name) ? "starter" : "custom";
    setStatus(`Deleted ${name}.`);
    redraw();
  }

  function makeDefaultRecord() {
    const def = currentDefinition();
    return {
      position: def.position.id,
      x: def.position.x,
      y: def.position.y,
      subSize: def.subSize,
      opacity: 1,
      rotate: "0deg"
    };
  }

  function copyText(value) {
    return navigator.clipboard.writeText(value)
      .then(() => setStatus("Copied."))
      .catch(() => setStatus("Clipboard blocked."));
  }

  function exportLocalJson() {
    const value = JSON.stringify(localPrefabs, null, 2);
    elements.ioTextarea.value = value;
    copyText(value);
  }

  function importLocalJson() {
    let parsed;
    try {
      parsed = JSON.parse(elements.ioTextarea.value);
    } catch (error) {
      setStatus("Import failed.");
      return;
    }

    const entries = Array.isArray(parsed) ? parsed : [parsed];
    entries.forEach((entry) => {
      if (!entry?.name || !emojiByAlias[entry.base] || !emojiByAlias[entry.overlay] || !positionById[entry.position]) {
        return;
      }

      const normalized = {
        name: sanitizeName(entry.name),
        label: entry.label || titleize(entry.name),
        category: entry.category || "custom",
        base: entry.base,
        overlay: entry.overlay,
        position: entry.position,
        positionLabel: positionById[entry.position].label,
        baseEmoji: emojiByAlias[entry.base].emoji,
        overlayEmoji: emojiByAlias[entry.overlay].emoji,
        x: positionById[entry.position].x,
        y: positionById[entry.position].y,
        subSize: subSizeForPosition(entry.position),
        opacity: 1,
        rotate: "0deg"
      };

      const index = localPrefabs.findIndex((item) => item.name === normalized.name);
      if (index >= 0) {
        localPrefabs.splice(index, 1, normalized);
      } else {
        localPrefabs.unshift(normalized);
      }
    });

    setStatus("Imported local prefabs.");
    redraw();
  }

  function candidatePositions() {
    return positions.filter((entry) => guessPickerMode(entry.id) === state.pickerMode);
  }

  function dragToPosition(clientX, clientY) {
    const rect = elements.previewMain.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const scale = rect.width || 1;
    const dx = (clientX - centerX) / scale;
    const dy = (clientY - centerY) / scale;

    let next = candidatePositions()[0];
    let bestDistance = Infinity;

    candidatePositions().forEach((entry) => {
      const distance = ((entry.x - dx) ** 2) + ((entry.y - dy) ** 2);
      if (distance < bestDistance) {
        bestDistance = distance;
        next = entry;
      }
    });

    if (next && next.id !== state.position) {
      state.position = next.id;
      redraw();
    }
  }

  function bindEvents() {
    elements.prefabSearch.addEventListener("input", renderPrefabPicker);
    elements.prefabJump.addEventListener("change", (event) => {
      const selected = findPrefabByKey(event.target.value);
      if (selected) {
        loadPrefab(selected.prefab, selected.source, false);
      }
    });

    elements.baseSelect.addEventListener("change", (event) => {
      state.base = event.target.value;
      applySavedDefault();
      redraw();
    });

    elements.overlaySelect.addEventListener("change", (event) => {
      state.overlay = event.target.value;
      applySavedDefault();
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
        state.pickerMode = guessPickerMode(state.position);
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
      } else if (state.pickerMode === "macro" && guessPickerMode(state.position) !== "macro") {
        state.position = "s-mc";
      } else if (state.pickerMode === "micro" && guessPickerMode(state.position) !== "micro") {
        state.position = "s-mc-se";
      }
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
      if (event.target.name !== "mode") {
        return;
      }
      state.mode = event.target.value;
      redraw();
    });

    elements.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      redraw();
    });

    elements.resetButton.addEventListener("click", () => {
      state = { ...defaults };
      editingSource = "starter";
      setStatus("Reset.");
      redraw();
    });

    elements.savePrefab.addEventListener("click", saveCurrentPrefab);
    elements.deletePrefab.addEventListener("click", deleteCurrentPrefab);
    elements.duplicatePrefab.addEventListener("click", () => {
      state.prefabName = `${sanitizeName(state.prefabName)}-copy`;
      editingSource = "custom";
      setStatus("Duplicated into a new draft.");
      redraw();
    });

    elements.makeBaseDefault.addEventListener("click", () => {
      baseDefaults[state.base] = makeDefaultRecord();
      setStatus(`Saved base default for ${state.base}.`);
      redraw();
    });

    elements.makeSubDefault.addEventListener("click", () => {
      subDefaults[state.overlay] = makeDefaultRecord();
      setStatus(`Saved sub default for ${state.overlay}.`);
      redraw();
    });

    elements.clearBaseDefault.addEventListener("click", () => {
      delete baseDefaults[state.base];
      setStatus(`Cleared base default for ${state.base}.`);
      redraw();
    });

    elements.clearSubDefault.addEventListener("click", () => {
      delete subDefaults[state.overlay];
      setStatus(`Cleared sub default for ${state.overlay}.`);
      redraw();
    });

    document.querySelectorAll("[data-copy-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.copyTarget);
        copyText(target.textContent);
      });
    });

    elements.exportJson.addEventListener("click", exportLocalJson);
    elements.importJson.addEventListener("click", importLocalJson);

    elements.previewHero.addEventListener("pointerdown", (event) => {
      dragPointerId = event.pointerId;
      elements.previewHero.classList.add("is-dragging");
      elements.previewHero.setPointerCapture(event.pointerId);
      dragToPosition(event.clientX, event.clientY);
    });

    elements.previewHero.addEventListener("pointermove", (event) => {
      if (event.pointerId !== dragPointerId) {
        return;
      }
      dragToPosition(event.clientX, event.clientY);
    });

    elements.previewHero.addEventListener("pointerup", (event) => {
      if (event.pointerId !== dragPointerId) {
        return;
      }
      dragPointerId = null;
      elements.previewHero.classList.remove("is-dragging");
    });

    elements.previewHero.addEventListener("pointercancel", () => {
      dragPointerId = null;
      elements.previewHero.classList.remove("is-dragging");
    });

    window.addEventListener("resize", redraw);
  }

  bindEvents();
  syncRuntimeDefaults();
  redraw();
})();
