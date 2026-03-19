(function () {
  const STORAGE_PREFABS = "emojistack:local-prefabs";
  const STORAGE_BASE_DEFAULTS = "emojistack:base-defaults";
  const STORAGE_SUB_DEFAULTS = "emojistack:sub-defaults";

  const emojis = window.EmojiStack?.data?.emojis || [];
  const positions = (window.EmojiStack?.data?.positions || []).slice().sort((left, right) => left.id.localeCompare(right.id));
  const starters = window.EmojiStack?.prefabs || [];

  const emojiByAlias = Object.fromEntries(emojis.map((entry) => [entry.alias, entry]));
  const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));
  const SIZE_MAP = {
    small: 0.32,
    medium: 0.58,
    large: 0.82
  };

  const el = {
    prefabSearch: document.getElementById("prefab-search"),
    prefabJump: document.getElementById("prefab-jump"),
    duplicate: document.getElementById("duplicate-prefab"),
    save: document.getElementById("save-prefab"),
    remove: document.getElementById("delete-prefab"),
    reset: document.getElementById("reset-button"),
    status: document.getElementById("status-line"),
    previewHero: document.getElementById("preview-hero"),
    previewMain: document.getElementById("preview-main"),
    previewTitle: document.getElementById("preview-title"),
    previewSubtitle: document.getElementById("preview-subtitle"),
    copyClass: document.getElementById("copy-class"),
    classOutput: document.getElementById("class-output"),
    base: document.getElementById("base-select"),
    overlay: document.getElementById("overlay-select"),
    positionNote: document.getElementById("position-note"),
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

  let localPrefabs = loadJson(STORAGE_PREFABS, []);
  let baseDefaults = loadJson(STORAGE_BASE_DEFAULTS, {});
  let subDefaults = loadJson(STORAGE_SUB_DEFAULTS, {});
  let state = { ...defaults };
  let source = "starter";
  let dragPointerId = null;
  let dragAnchor = { x: 0, y: 0 };
  const params = new URLSearchParams(window.location.search);

  function loadJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value === null ? structuredClone(fallback) : value;
    } catch (error) {
      return structuredClone(fallback);
    }
  }

  function persist() {
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

  function inferSizeMode(subSize) {
    if (subSize >= 0.72) {
      return "large";
    }
    if (subSize <= 0.4) {
      return "small";
    }
    return "medium";
  }

  function currentBaseDefault() {
    return baseDefaults[state.base] || null;
  }

  function currentSubDefault() {
    return subDefaults[state.overlay] || null;
  }

  function applySavedDefault() {
    const preset = currentSubDefault() || currentBaseDefault();
    if (!preset || !positionById[preset.position]) {
      return;
    }
    state.position = preset.position;
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
        unit: prefab.xUnit || prefab.unit || position.unit || "%",
        subSize: prefab.subSize || SIZE_MAP[state.sizeMode],
        rotate: prefab.rotate || "0deg",
        opacity: prefab.opacity || 1
      };
    }

    return {
      name: sanitizeName(state.prefabName || `${state.base}-${state.overlay}`),
      base,
      overlay,
      position,
      x: position.x,
      y: position.y,
      unit: position.unit || "%",
      subSize: SIZE_MAP.medium,
      rotate: "0deg",
      opacity: 1
    };
  }

  function currentRecord() {
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
      x: def.x,
      y: def.y,
      unit: def.unit,
      sizeMode: inferSizeMode(def.subSize),
      subSize: def.subSize,
      opacity: def.opacity,
      rotate: def.rotate
    };
  }

  function selectedPrefab() {
    if (source === "custom" || !state.prefabName) {
      return null;
    }
    const list = source === "local" ? localPrefabs : starters;
    return list.find((entry) => entry.name === sanitizeName(state.prefabName)) || null;
  }

  function currentClassString() {
    const prefab = selectedPrefab();

    if (prefab && state.base === prefab.base && state.overlay === prefab.overlay && state.position === prefab.position) {
      const prefabSize = prefab.sizeMode || inferSizeMode(prefab.subSize || SIZE_MAP.medium);
      if (prefabSize === state.sizeMode) {
        return `es p-${prefab.name}`;
      }
    }

    const base = emojiByAlias[state.base];
    const overlay = emojiByAlias[state.overlay];
    return `es ${base.emoji}${overlay.emoji} ${state.position}`;
  }

  function setStatus(text) {
    el.status.textContent = text;
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
    const query = el.prefabSearch.value.trim().toLowerCase();
    return starters
      .map((prefab) => ({ prefab, source: "starter" }))
      .concat(localPrefabs.map((prefab) => ({ prefab, source: "local" })))
      .filter(({ prefab, source: kind }) => {
        if (!query) {
          return true;
        }
        const text = `${prefab.name} ${prefab.label || ""} ${prefab.base} ${prefab.overlay} ${kind}`.toLowerCase();
        return text.includes(query);
      });
  }

  function renderPrefabJump() {
    const items = filteredPrefabs();
    el.prefabJump.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pick a prefab to edit";
    placeholder.selected = source === "custom" || !state.prefabName;
    el.prefabJump.appendChild(placeholder);

    if (!items.length) {
      return;
    }

    ["starter", "local"].forEach((kind) => {
      const matches = items.filter((item) => item.source === kind);
      if (!matches.length) {
        return;
      }
      const group = document.createElement("optgroup");
      group.label = kind === "starter" ? "Starter prefabs" : "Local prefabs";
      matches.forEach(({ prefab }) => {
        const option = document.createElement("option");
        option.value = `${kind}:${prefab.name}`;
        option.textContent = `${prefab.label || titleize(prefab.name)} · ${prefab.name}`;
        option.selected = source === kind && prefab.name === sanitizeName(state.prefabName);
        group.appendChild(option);
      });
      el.prefabJump.appendChild(group);
    });
  }

  function setCustomState() {
    source = "custom";
    state.prefabName = "";
    state.sizeMode = "medium";
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
    const icon = el.previewMain;
    const heightSize = Math.max(180, Math.floor(window.innerHeight * 0.44));
    const widthSize = window.innerWidth > 1220
      ? Math.max(220, Math.floor(window.innerWidth * 0.27))
      : Math.max(220, Math.floor(window.innerWidth * 0.6));
    const size = Math.min(320, heightSize, widthSize);

    icon.className = "es";
    icon.style.fontSize = `${size}px`;
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

    const prefab = selectedPrefab();
    el.previewTitle.textContent = prefab ? `p-${prefab.name}` : `${def.base.label} + ${def.overlay.label}`;
    el.previewSubtitle.textContent = prefab
      ? `${prefab.label || titleize(prefab.name)} · ${def.position.label}`
      : `${def.position.label}`;
    el.positionNote.textContent = def.position.label;
    el.previewHero.title = "Drag the top emoji to place it";
    el.previewHero.classList.remove("is-static");
  }

  function syncUi() {
    populateEmojiSelect(el.base, state.base);
    populateEmojiSelect(el.overlay, state.overlay);
    renderPrefabJump();
    renderGrid();

    const baseDefault = currentBaseDefault();
    const subDefault = currentSubDefault();
    el.baseDefaultNote.textContent = baseDefault ? `Base default: ${positionById[baseDefault.position].label}` : "No base default.";
    el.subDefaultNote.textContent = subDefault ? `Sub default: ${positionById[subDefault.position].label}` : "No sub default.";
    el.clearBaseDefault.disabled = !baseDefault;
    el.clearSubDefault.disabled = !subDefault;
    el.remove.disabled = source !== "local";
    el.classOutput.textContent = currentClassString();
    el.copyClass.title = `Click to copy ${currentClassString()}`;
  }

  function redraw() {
    ensureValidState();
    persist();
    syncRuntimeDefaults();
    syncUi();
    applyPreview();
  }

  function loadPrefab(prefab, kind, duplicate) {
    state.base = prefab.base;
    state.overlay = prefab.overlay;
    state.position = positionById[prefab.position] ? prefab.position : "s-44";
    state.sizeMode = prefab.sizeMode || inferSizeMode(prefab.subSize || SIZE_MAP.medium);
    state.prefabName = duplicate ? `${prefab.name}-copy` : prefab.name;
    source = duplicate ? "custom" : kind;
    setStatus(duplicate ? "Duplicated." : `Loaded ${prefab.label || titleize(prefab.name)}.`);
    redraw();
  }

  function savePrefab() {
    const record = currentRecord();
    const index = localPrefabs.findIndex((entry) => entry.name === record.name);
    if (index >= 0) {
      localPrefabs.splice(index, 1, record);
    } else {
      localPrefabs.unshift(record);
    }
    source = "local";
    state.prefabName = record.name;
    setStatus(`Saved ${record.name}.`);
    redraw();
  }

  function removePrefab() {
    const name = sanitizeName(state.prefabName);
    const index = localPrefabs.findIndex((entry) => entry.name === name);
    if (index < 0) {
      return;
    }
    localPrefabs.splice(index, 1);
    source = "starter";
    setStatus(`Deleted ${name}.`);
    redraw();
  }

  function bind() {
    el.prefabSearch.addEventListener("input", renderPrefabJump);
    el.prefabJump.addEventListener("change", (event) => {
      if (!event.target.value) {
        setCustomState();
        redraw();
        return;
      }
      const [kind, name] = String(event.target.value).split(":");
      const list = kind === "local" ? localPrefabs : starters;
      const prefab = list.find((entry) => entry.name === name);
      if (prefab) {
        loadPrefab(prefab, kind, false);
      }
    });

    el.base.addEventListener("change", (event) => {
      state.base = event.target.value;
      setCustomState();
      applySavedDefault();
      redraw();
    });

    el.overlay.addEventListener("change", (event) => {
      state.overlay = event.target.value;
      setCustomState();
      applySavedDefault();
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
      baseDefaults[state.base] = { position: record.position, x: record.x, y: record.y, unit: record.unit, sizeMode: record.sizeMode, subSize: record.subSize, opacity: 1, rotate: "0deg" };
      setStatus(`Saved base default for ${state.base}.`);
      redraw();
    });

    el.makeSubDefault.addEventListener("click", () => {
      const record = currentRecord();
      subDefaults[state.overlay] = { position: record.position, x: record.x, y: record.y, unit: record.unit, sizeMode: record.sizeMode, subSize: record.subSize, opacity: 1, rotate: "0deg" };
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
    el.remove.addEventListener("click", removePrefab);
    el.duplicate.addEventListener("click", () => {
      const name = sanitizeName(state.prefabName || `${state.base}-${state.overlay}`);
      state.prefabName = `${name}-copy`;
      source = "custom";
      setStatus("Duplicated.");
      redraw();
    });
    el.reset.addEventListener("click", () => {
      state = { ...defaults };
      source = "custom";
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

  bind();
  syncRuntimeDefaults();
  const requestedPrefab = sanitizeName(params.get("prefab") || "");
  if (requestedPrefab) {
    const initialPrefab = starters.find((entry) => entry.name === requestedPrefab) || localPrefabs.find((entry) => entry.name === requestedPrefab);
    if (initialPrefab) {
      loadPrefab(initialPrefab, starters.some((entry) => entry.name === requestedPrefab) ? "starter" : "local", false);
    } else {
      redraw();
    }
  } else {
    source = "custom";
    redraw();
  }

  function formatCoord(value, unit) {
    if ((unit || "em") === "%") {
      return `${Number(value) * 100}%`;
    }
    return `${value}em`;
  }
})();
