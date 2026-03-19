(function () {
  const STORAGE_BASE_DEFAULTS = "emojistack:base-defaults";
  const STORAGE_SUB_DEFAULTS = "emojistack:sub-defaults";
  const store = window.EmojiStackPrefabStore;
  const emojis = window.EmojiStack?.data?.emojis || [];
  const positions = (window.EmojiStack?.data?.positions || []).slice().sort((left, right) => left.id.localeCompare(right.id));
  const emojiByAlias = Object.fromEntries(emojis.map((entry) => [entry.alias, entry]));
  const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));
  const SIZE_MAP = {
    small: 0.32,
    medium: 0.58,
    large: 0.82
  };
  const params = new URLSearchParams(window.location.search);
  const PREVIEW_VAR_KEYS = [
    "--es-base",
    "--es-sub",
    "--es-base-ox",
    "--es-base-oy",
    "--es-x",
    "--es-y",
    "--es-sub-size",
    "--es-sub-ox",
    "--es-sub-oy",
    "--es-rotate",
    "--es-opacity"
  ];

  const el = {
    prefabSearch: document.getElementById("prefab-search"),
    prefabJump: document.getElementById("prefab-jump"),
    duplicate: document.getElementById("duplicate-prefab"),
    save: document.getElementById("save-prefab"),
    reset: document.getElementById("reset-button"),
    status: document.getElementById("status-line"),
    previewHero: document.getElementById("preview-hero"),
    previewMain: document.getElementById("preview-main"),
    previewTitle: document.getElementById("preview-title"),
    previewSubtitle: document.getElementById("preview-subtitle"),
    copyClass: document.getElementById("copy-class"),
    classOutput: document.getElementById("class-output"),
    prefabName: document.getElementById("prefab-name"),
    base: document.getElementById("base-select"),
    overlay: document.getElementById("overlay-select"),
    positionNote: document.getElementById("position-note"),
    sizeMode: document.getElementById("picker-mode-toggle"),
    positionGrid: document.getElementById("position-grid"),
    makeBaseDefault: document.getElementById("make-base-default"),
    makeSubDefault: document.getElementById("make-sub-default"),
    clearBaseDefault: document.getElementById("clear-base-default"),
    clearSubDefault: document.getElementById("clear-sub-default"),
    baseDefaultNote: document.getElementById("base-default-note"),
    subDefaultNote: document.getElementById("sub-default-note")
  };

  const defaults = {
    base: "bottle",
    overlay: "strawberry",
    position: "s-44",
    sizeMode: "medium",
    prefabName: ""
  };

  let baseDefaults = sanitizeDefaultMap(loadJson(STORAGE_BASE_DEFAULTS, {}));
  let subDefaults = sanitizeDefaultMap(loadJson(STORAGE_SUB_DEFAULTS, {}));
  let catalogPrefabs = [];
  let catalogLoaded = false;
  let state = { ...defaults };
  let source = "custom";
  let dragPointerId = null;
  let dragAnchor = { x: 0, y: 0 };

  function loadJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value === null ? structuredClone(fallback) : value;
    } catch (error) {
      return structuredClone(fallback);
    }
  }

  function persistDefaults() {
    localStorage.setItem(STORAGE_BASE_DEFAULTS, JSON.stringify(baseDefaults));
    localStorage.setItem(STORAGE_SUB_DEFAULTS, JSON.stringify(subDefaults));
  }

  function sanitizeDefaultEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    if (!positionById[entry.position]) {
      return null;
    }

    return {
      position: entry.position,
      x: Number.isFinite(Number(entry.x)) ? Number(entry.x) : positionById[entry.position].x,
      y: Number.isFinite(Number(entry.y)) ? Number(entry.y) : positionById[entry.position].y,
      unit: entry.unit === "em" ? "em" : "%",
      sizeMode: SIZE_MAP[entry.sizeMode] ? entry.sizeMode : inferSizeMode(entry.subSize),
      subSize: Number.isFinite(Number(entry.subSize)) ? Number(entry.subSize) : SIZE_MAP.medium,
      opacity: Number.isFinite(Number(entry.opacity)) ? Number(entry.opacity) : 1,
      rotate: typeof entry.rotate === "string" ? entry.rotate : "0deg"
    };
  }

  function sanitizeDefaultMap(source) {
    const output = {};
    Object.entries(source || {}).forEach(([key, value]) => {
      const sanitized = sanitizeDefaultEntry(value);
      if (sanitized) {
        output[key] = sanitized;
      }
    });
    return output;
  }

  function titleize(value) {
    return String(value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function sanitizeName(value) {
    return store ? store.sanitizeName(value) : String(value || "").toLowerCase();
  }

  function defaultPrefabName() {
    return sanitizeName(`${state.base}-${state.overlay}`);
  }

  function saveName() {
    const typedName = sanitizeName(el.prefabName?.value || "");
    return typedName || defaultPrefabName();
  }

  function inferSizeMode(subSize) {
    return store ? store.inferSizeMode(subSize) : "medium";
  }

  function currentBaseDefault() {
    const value = sanitizeDefaultEntry(baseDefaults[state.base]);
    if (!value) {
      delete baseDefaults[state.base];
      return null;
    }
    baseDefaults[state.base] = value;
    return value;
  }

  function currentSubDefault() {
    const value = sanitizeDefaultEntry(subDefaults[state.overlay]);
    if (!value) {
      delete subDefaults[state.overlay];
      return null;
    }
    subDefaults[state.overlay] = value;
    return value;
  }

  function applySavedDefault() {
    const preset = currentSubDefault() || currentBaseDefault();
    if (!preset || !positionById[preset.position]) {
      return;
    }
    state.position = preset.position;
    state.sizeMode = preset.sizeMode || inferSizeMode(preset.subSize);
  }

  function ensureValidState() {
    if (!emojiByAlias[state.base] && emojis[0]) {
      state.base = emojis[0].alias;
    }

    if (!emojiByAlias[state.overlay]) {
      const fallback = emojis.find((entry) => entry.alias !== state.base) || emojis[0];
      if (fallback) {
        state.overlay = fallback.alias;
      }
    }

    if (!positionById[state.position]) {
      state.position = "s-44";
    }

    if (!SIZE_MAP[state.sizeMode]) {
      state.sizeMode = "medium";
    }
  }

  function selectedPrefab() {
    if (source !== "remote" || !state.prefabName) {
      return null;
    }
    return catalogPrefabs.find((entry) => entry.name === sanitizeName(state.prefabName)) || null;
  }

  function currentDefinition() {
    const base = emojiByAlias[state.base];
    const overlay = emojiByAlias[state.overlay];
    const position = positionById[state.position];
    const prefab = selectedPrefab();

    if (prefab) {
      return {
        name: prefab.name,
        base,
        overlay,
        position,
        x: typeof prefab.x === "number" ? prefab.x : position.x,
        y: typeof prefab.y === "number" ? prefab.y : position.y,
        unit: prefab.unit || prefab.xUnit || position.unit || "%",
        subSize: prefab.subSize || SIZE_MAP[state.sizeMode],
        rotate: prefab.rotate || "0deg",
        opacity: typeof prefab.opacity === "number" ? prefab.opacity : 1
      };
    }

    return {
      name: saveName(),
      base,
      overlay,
      position,
      x: position.x,
      y: position.y,
      unit: position.unit || "%",
      subSize: SIZE_MAP[state.sizeMode],
      rotate: "0deg",
      opacity: 1
    };
  }

  function currentRecord() {
    const def = currentDefinition();
    return {
      name: def.name,
      label: titleize(def.name),
      base: def.base.alias,
      overlay: def.overlay.alias,
      position: def.position.id,
      positionLabel: def.position.label,
      baseEmoji: def.base.emoji,
      overlayEmoji: def.overlay.emoji,
      x: def.x,
      y: def.y,
      unit: def.unit,
      sizeMode: state.sizeMode,
      subSize: def.subSize,
      opacity: def.opacity,
      rotate: def.rotate
    };
  }

  function currentClassString() {
    const prefab = selectedPrefab();
    if (prefab) {
      return `es p-${prefab.name}`;
    }

    const base = emojiByAlias[state.base];
    const overlay = emojiByAlias[state.overlay];
    const sizeClass = state.sizeMode === "small" ? " sm" : state.sizeMode === "large" ? " lg" : "";
    return `es ${base.emoji}${overlay.emoji} ${state.position}${sizeClass}`;
  }

  function setStatus(text) {
    el.status.textContent = text;
  }

  function setCustomState() {
    source = "custom";
    state.prefabName = "";
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    return Promise.resolve();
  }

  function syncRuntimeDefaults() {
    if (window.EmojiStack?.setBaseDefaults) {
      window.EmojiStack.setBaseDefaults(baseDefaults);
    }
    if (window.EmojiStack?.setSubDefaults) {
      window.EmojiStack.setSubDefaults(subDefaults);
    }
  }

  function populateEmojiSelect(node, selected) {
    node.innerHTML = "";
    emojis
      .slice()
      .sort((left, right) => String(left.label).localeCompare(String(right.label)))
      .forEach((item) => {
        const option = document.createElement("option");
        option.value = item.alias;
        option.textContent = `${item.emoji} ${item.label}`;
        option.selected = item.alias === selected;
        node.appendChild(option);
      });
  }

  function filteredPrefabs() {
    const query = normalizeText(el.prefabSearch.value);
    if (!query) {
      return catalogPrefabs;
    }
    return catalogPrefabs.filter((prefab) => prefab.searchText.includes(query));
  }

  function renderPrefabJump() {
    const items = filteredPrefabs();
    el.prefabJump.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = items.length
      ? "Pick a prefab to edit"
      : catalogLoaded
        ? "No prefabs found"
        : "Loading prefabs...";
    placeholder.selected = source === "custom" || !state.prefabName;
    el.prefabJump.appendChild(placeholder);

    items.forEach((prefab) => {
      const option = document.createElement("option");
      option.value = prefab.name;
      option.textContent = `${prefab.label} · ${prefab.name}`;
      option.selected = source === "remote" && prefab.name === sanitizeName(state.prefabName);
      el.prefabJump.appendChild(option);
    });
  }

  function positionCellText(positionId) {
    return positionId === "s-44" ? "C" : positionId.slice(2);
  }

  function renderGrid() {
    el.positionGrid.innerHTML = positions
      .map((item) => `<button type="button" class="position-cell${item.id === state.position ? " active" : ""}" data-position="${item.id}" title="${item.label}">${positionCellText(item.id)}</button>`)
      .join("");
  }

  function nearestPosition(clientX, clientY) {
    const rect = el.previewMain.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const scale = rect.width || 1;
    const dx = ((clientX - centerX) / scale) - dragAnchor.x;
    const dy = ((clientY - centerY) / scale) - dragAnchor.y;

    return positions.reduce((best, item) => {
      const distance = ((item.x - dx) ** 2) + ((item.y - dy) ** 2);
      return distance < best.distance ? { distance, item } : best;
    }, { distance: Infinity, item: positionById[state.position] }).item;
  }

  function applyPreview() {
    const def = currentDefinition();
    const prefab = selectedPrefab();
    const icon = el.previewMain;
    const heightSize = Math.max(180, Math.floor(window.innerHeight * 0.44));
    const widthSize = window.innerWidth > 1220
      ? Math.max(220, Math.floor(window.innerWidth * 0.27))
      : Math.max(220, Math.floor(window.innerWidth * 0.6));
    const size = Math.min(320, heightSize, widthSize);

    PREVIEW_VAR_KEYS.forEach((key) => icon.style.removeProperty(key));
    icon.style.fontSize = `${size}px`;

    if (prefab) {
      icon.className = `es p-${prefab.name}`;
      if (window.EmojiStack) {
        window.EmojiStack.refresh(icon);
      }
    } else {
      icon.className = "es";
      icon.style.setProperty("--es-base", JSON.stringify(def.base.emoji));
      icon.style.setProperty("--es-sub", JSON.stringify(def.overlay.emoji));
      icon.style.setProperty("--es-base-ox", `${def.base.ox || 0}em`);
      icon.style.setProperty("--es-base-oy", `${def.base.oy || 0}em`);
      icon.style.setProperty("--es-x", formatCoord(def.x, def.unit));
      icon.style.setProperty("--es-y", formatCoord(def.y, def.unit));
      icon.style.setProperty("--es-sub-size", `${def.subSize}`);
      icon.style.setProperty("--es-sub-ox", `${def.overlay.ox || 0}em`);
      icon.style.setProperty("--es-sub-oy", `${def.overlay.oy || 0}em`);
      icon.style.setProperty("--es-rotate", def.rotate);
      icon.style.setProperty("--es-opacity", `${def.opacity}`);
    }

    el.previewTitle.textContent = prefab ? `p-${prefab.name}` : `${def.base.label} + ${def.overlay.label}`;
    el.previewSubtitle.textContent = prefab
      ? `${prefab.label} · ${def.position.label} · ${titleize(state.sizeMode)}`
      : `${def.position.label} · ${titleize(state.sizeMode)}`;
    el.positionNote.textContent = def.position.label;
    el.previewHero.title = "Drag the top emoji to place it";
  }

  function syncUi() {
    populateEmojiSelect(el.base, state.base);
    populateEmojiSelect(el.overlay, state.overlay);
    renderPrefabJump();
    renderGrid();
    el.prefabName.placeholder = defaultPrefabName();

    el.sizeMode.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.sizeMode === state.sizeMode);
    });

    const baseDefault = currentBaseDefault();
    const subDefault = currentSubDefault();
    el.baseDefaultNote.textContent = baseDefault ? `Base default: ${positionById[baseDefault.position].label}` : "No base default.";
    el.subDefaultNote.textContent = subDefault ? `Sub default: ${positionById[subDefault.position].label}` : "No sub default.";
    el.clearBaseDefault.disabled = !baseDefault;
    el.clearSubDefault.disabled = !subDefault;
    el.classOutput.textContent = currentClassString();
    el.copyClass.title = `Click to copy ${currentClassString()}`;
  }

  function redraw() {
    ensureValidState();
    persistDefaults();
    syncRuntimeDefaults();
    syncUi();
    applyPreview();
  }

  function loadPrefab(prefab) {
    state.base = prefab.base;
    state.overlay = prefab.overlay;
    state.position = positionById[prefab.position] ? prefab.position : "s-44";
    state.sizeMode = prefab.sizeMode || inferSizeMode(prefab.subSize || SIZE_MAP.medium);
    state.prefabName = prefab.name;
    el.prefabName.value = prefab.name;
    source = "remote";
    setStatus(`Loaded ${prefab.label}.`);
    redraw();
  }

  async function loadCatalog(options = {}) {
    if (!store) {
      catalogPrefabs = window.EmojiStack?.prefabs || [];
      catalogLoaded = true;
      return;
    }

    catalogPrefabs = await store.loadPrefabs(options);
    catalogLoaded = true;
  }

  async function savePrefab() {
    if (!store) {
      setStatus("Prefab store is not available.");
      return;
    }

    const record = currentRecord();
    setStatus("Saving to the Google sheet...");
    try {
      const response = await store.savePrefab(record);
      await loadCatalog({ force: true });
      source = "remote";
      state.prefabName = record.name;
      el.prefabName.value = record.name;
      if (response?.transport === "query-iframe") {
        setStatus(`Saved ${record.name} to the sheet.`);
      } else {
        setStatus(`Saved ${record.name} to the sheet. Browser navigation save failed, so the editor used the POST fallback.`);
      }
      redraw();
    } catch (error) {
      setStatus(`${error.message || "Could not save prefab."} If you just changed Code.gs, redeploy the Apps Script web app and use the new /exec URL.`);
    }
  }

  function bind() {
    el.prefabSearch.addEventListener("input", renderPrefabJump);
    el.prefabJump.addEventListener("change", (event) => {
      const prefab = catalogPrefabs.find((entry) => entry.name === event.target.value);
      if (prefab) {
        loadPrefab(prefab);
        return;
      }
      setCustomState();
      el.prefabName.value = "";
      redraw();
    });

    el.base.addEventListener("change", (event) => {
      state.base = event.target.value;
      setCustomState();
      el.prefabName.value = "";
      applySavedDefault();
      redraw();
    });

    el.overlay.addEventListener("change", (event) => {
      state.overlay = event.target.value;
      setCustomState();
      el.prefabName.value = "";
      applySavedDefault();
      redraw();
    });

    el.prefabName.addEventListener("input", () => {
      state.prefabName = sanitizeName(el.prefabName.value);
      source = state.prefabName ? "custom" : source;
      redraw();
    });

    el.positionGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-position]");
      if (!button || button.disabled) {
        return;
      }
      setCustomState();
      state.position = button.dataset.position;
      redraw();
    });

    el.sizeMode.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-size-mode]");
      if (!button) {
        return;
      }
      setCustomState();
      state.sizeMode = button.dataset.sizeMode;
      redraw();
    });

    el.previewHero.addEventListener("pointerdown", (event) => {
      const position = positionById[state.position];
      const rect = el.previewMain.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const scale = rect.width || 1;
      dragPointerId = event.pointerId;
      dragAnchor = {
        x: ((event.clientX - centerX) / scale) - position.x,
        y: ((event.clientY - centerY) / scale) - position.y
      };
      el.previewHero.classList.add("is-dragging");
      el.previewHero.setPointerCapture(event.pointerId);
    });

    el.previewHero.addEventListener("pointermove", (event) => {
      if (event.pointerId !== dragPointerId) {
        return;
      }
      const next = nearestPosition(event.clientX, event.clientY);
      if (next.id !== state.position) {
        setCustomState();
        state.position = next.id;
        redraw();
      }
    });

    ["pointerup", "pointercancel"].forEach((type) => {
      el.previewHero.addEventListener(type, (event) => {
        if (dragPointerId !== null && event.pointerId !== dragPointerId) {
          return;
        }
        dragPointerId = null;
        el.previewHero.classList.remove("is-dragging");
      });
    });

    el.makeBaseDefault.addEventListener("click", () => {
      const record = currentRecord();
      baseDefaults[state.base] = {
        position: record.position,
        x: record.x,
        y: record.y,
        unit: record.unit,
        sizeMode: record.sizeMode,
        subSize: record.subSize,
        opacity: record.opacity,
        rotate: record.rotate
      };
      setStatus(`Saved base default for ${state.base}.`);
      redraw();
    });

    el.makeSubDefault.addEventListener("click", () => {
      const record = currentRecord();
      subDefaults[state.overlay] = {
        position: record.position,
        x: record.x,
        y: record.y,
        unit: record.unit,
        sizeMode: record.sizeMode,
        subSize: record.subSize,
        opacity: record.opacity,
        rotate: record.rotate
      };
      setStatus(`Saved sub default for ${state.overlay}.`);
      redraw();
    });

    el.clearBaseDefault.addEventListener("click", () => {
      delete baseDefaults[state.base];
      setStatus(`Cleared base default for ${state.base}.`);
      redraw();
    });

    el.clearSubDefault.addEventListener("click", () => {
      delete subDefaults[state.overlay];
      setStatus(`Cleared sub default for ${state.overlay}.`);
      redraw();
    });

    el.save.addEventListener("click", savePrefab);
    el.duplicate.addEventListener("click", () => {
      const name = saveName();
      setCustomState();
      state.prefabName = `${name}-copy`;
      el.prefabName.value = state.prefabName;
      setStatus("Duplicated into the editor.");
      redraw();
    });

    el.reset.addEventListener("click", () => {
      state = { ...defaults };
      source = "custom";
      el.prefabName.value = "";
      setStatus("Reset.");
      redraw();
    });

    el.copyClass.addEventListener("click", () => {
      const className = currentClassString();
      copyText(className).then(() => {
        setStatus(`Copied ${className}`);
      });
    });

    window.addEventListener("resize", redraw);
  }

  async function boot() {
    bind();
    redraw();

    try {
      await loadCatalog();
    } catch (error) {
      setStatus(error.message || "Prefab feed could not load.");
      redraw();
      return;
    }

    const requestedPrefab = sanitizeName(params.get("prefab") || "");
    if (requestedPrefab) {
      const prefab = catalogPrefabs.find((entry) => entry.name === requestedPrefab);
      if (prefab) {
        loadPrefab(prefab);
        return;
      }
    }

    setStatus(store?.config?.endpoint ? "Sheet prefabs loaded." : "Using the built-in prefab list until the sheet endpoint is configured.");
    redraw();
  }

  function formatCoord(value, unit) {
    if ((unit || "em") === "%") {
      return `${Number(value) * 100}%`;
    }
    return `${value}em`;
  }

  boot();
})();
