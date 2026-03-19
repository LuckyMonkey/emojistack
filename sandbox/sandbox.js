(function () {
  const STORAGE_PREFABS = "emojistack:local-prefabs";
  const STORAGE_BASE_DEFAULTS = "emojistack:base-defaults";
  const STORAGE_SUB_DEFAULTS = "emojistack:sub-defaults";

  const emojis = window.EmojiStack?.data?.emojis || [];
  const positions = window.EmojiStack?.data?.positions || [];
  const starters = window.EmojiStack?.prefabs || [];

  const emojiByAlias = Object.fromEntries(emojis.map((entry) => [entry.alias, entry]));
  const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));

  const el = {
    prefabSearch: document.getElementById("prefab-search"),
    prefabJump: document.getElementById("prefab-jump"),
    duplicate: document.getElementById("duplicate-prefab"),
    save: document.getElementById("save-prefab"),
    remove: document.getElementById("delete-prefab"),
    reset: document.getElementById("reset-button"),
    status: document.getElementById("status-line"),
    previewStage: document.getElementById("preview-stage"),
    previewHero: document.getElementById("preview-hero"),
    previewMain: document.getElementById("preview-main"),
    previewTitle: document.getElementById("preview-title"),
    previewSubtitle: document.getElementById("preview-subtitle"),
    base: document.getElementById("base-select"),
    overlay: document.getElementById("overlay-select"),
    positionNote: document.getElementById("position-note"),
    pickerMode: document.getElementById("picker-mode-toggle"),
    directBoard: document.getElementById("position-direct"),
    macroBoard: document.getElementById("position-macro"),
    microBoard: document.getElementById("position-micro"),
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
    position: "s-center",
    pickerMode: "direct",
    prefabName: "strawberry-milk"
  };

  let localPrefabs = loadJson(STORAGE_PREFABS, []);
  let baseDefaults = loadJson(STORAGE_BASE_DEFAULTS, {});
  let subDefaults = loadJson(STORAGE_SUB_DEFAULTS, {});
  let state = { ...defaults };
  let source = "starter";
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

  function pickerModeFor(positionId) {
    if (positionId === "s-center") {
      return "direct";
    }
    return /^s-[a-z]{2}$/.test(positionId) ? "macro" : "micro";
  }

  function subSizeFor(mode) {
    if (mode === "direct") {
      return 0.82;
    }
    if (mode === "macro") {
      return 0.58;
    }
    return 0.32;
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
    state.pickerMode = preset.gridMode || pickerModeFor(state.position);
  }

  function currentDefinition() {
    const base = emojiByAlias[state.base];
    const overlay = emojiByAlias[state.overlay];
    const position = positionById[state.position];
    return {
      name: sanitizeName(state.prefabName || `${state.base}-${state.overlay}`),
      base,
      overlay,
      position,
      subSize: subSizeFor(state.pickerMode)
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
      x: def.position.x,
      y: def.position.y,
      unit: def.position.unit || "%",
      gridMode: state.pickerMode,
      subSize: def.subSize,
      opacity: 1,
      rotate: "0deg"
    };
  }

  function setStatus(text) {
    el.status.textContent = text;
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

    if (!items.length) {
      el.prefabJump.innerHTML = '<option value="">No prefab match</option>';
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
        option.selected = prefab.name === sanitizeName(state.prefabName) && source === kind;
        group.appendChild(option);
      });
      el.prefabJump.appendChild(group);
    });
  }

  function boardItems(mode) {
    if (mode === "direct") {
      return [{ id: "s-center", text: "center" }];
    }
    if (mode === "micro") {
      const macroRows = ["t", "m", "b"];
      const macroCols = ["l", "c", "r"];
      const quadRows = [["nw", "ne"], ["sw", "se"]];
      const items = [];

      macroRows.forEach((macroRow) => {
        quadRows.forEach((pair) => {
          macroCols.forEach((macroCol) => {
            pair.forEach((quad) => {
              const id = `s-${macroRow}${macroCol}-${quad}`;
              items.push({ id, text: id.replace("s-", "") });
            });
          });
        });
      });

      return items;
    }
    return positions
      .filter((item) => pickerModeFor(item.id) === mode)
      .map((item) => ({ id: item.id, text: item.id.replace("s-", "") }));
  }

  function renderBoard(node, mode) {
    const isMicro = mode === "micro";
    node.hidden = state.pickerMode !== mode;
    node.innerHTML = boardItems(mode)
      .map((item) => `<button type="button" class="position-cell${item.id === state.position ? " active" : ""}" data-position="${item.id}" title="${positionById[item.id].label}">${item.text}</button>`)
      .join("");

    if (isMicro) {
      node.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="position-center-dot${state.position === "s-center" ? " active" : ""}" data-position="s-center" title="Center">C</button>`
      );
    }
  }

  function renderBoards() {
    renderBoard(el.directBoard, "direct");
    renderBoard(el.macroBoard, "macro");
    renderBoard(el.microBoard, "micro");
    el.pickerMode.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.pickerMode === state.pickerMode);
    });
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
    icon.style.setProperty("--es-x", formatCoord(def.position.x, def.position.unit));
    icon.style.setProperty("--es-y", formatCoord(def.position.y, def.position.unit));
    icon.style.setProperty("--es-sub-size", `${def.subSize}`);
    icon.style.setProperty("--es-sub-ox", `${def.overlay.ox || 0}em`);
    icon.style.setProperty("--es-sub-oy", `${def.overlay.oy || 0}em`);

    el.previewTitle.textContent = `${def.base.label} + ${def.overlay.label}`;
    el.previewSubtitle.textContent = def.position.label;
    el.positionNote.textContent = def.position.label;
    el.previewHero.title = state.pickerMode === "direct"
      ? "Large size stays centered"
      : "Drag the top emoji to place it";
    el.previewHero.classList.toggle("is-static", state.pickerMode === "direct");
  }

  function syncUi() {
    populateEmojiSelect(el.base, state.base);
    populateEmojiSelect(el.overlay, state.overlay);
    renderPrefabJump();
    renderBoards();

    const baseDefault = currentBaseDefault();
    const subDefault = currentSubDefault();
    el.baseDefaultNote.textContent = baseDefault ? `Base default: ${positionById[baseDefault.position].label}` : "No base default.";
    el.subDefaultNote.textContent = subDefault ? `Sub default: ${positionById[subDefault.position].label}` : "No sub default.";
    el.clearBaseDefault.disabled = !baseDefault;
    el.clearSubDefault.disabled = !subDefault;
    el.remove.disabled = source !== "local";
  }

  function redraw() {
    persist();
    syncRuntimeDefaults();
    syncUi();
    applyPreview();
  }

  function loadPrefab(prefab, kind, duplicate) {
    state.base = prefab.base;
    state.overlay = prefab.overlay;
    state.position = prefab.position;
    state.pickerMode = prefab.gridMode || pickerModeFor(prefab.position);
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

  function nearestPosition(clientX, clientY) {
    const rect = el.previewMain.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const scale = rect.width || 1;
    const dx = ((clientX - centerX) / scale) - dragAnchor.x;
    const dy = ((clientY - centerY) / scale) - dragAnchor.y;

    return positions
      .filter((item) => pickerModeFor(item.id) === state.pickerMode)
      .reduce((best, item) => {
        const distance = ((item.x - dx) ** 2) + ((item.y - dy) ** 2);
        return distance < best.distance ? { distance, item } : best;
      }, { distance: Infinity, item: positionById[state.position] }).item;
  }

  function bind() {
    el.prefabSearch.addEventListener("input", renderPrefabJump);
    el.prefabJump.addEventListener("change", (event) => {
      const [kind, name] = String(event.target.value).split(":");
      const list = kind === "local" ? localPrefabs : starters;
      const prefab = list.find((entry) => entry.name === name);
      if (prefab) {
        loadPrefab(prefab, kind, false);
      }
    });

    el.base.addEventListener("change", (event) => {
      state.base = event.target.value;
      state.prefabName = `${state.base}-${state.overlay}`;
      applySavedDefault();
      source = "custom";
      redraw();
    });

    el.overlay.addEventListener("change", (event) => {
      state.overlay = event.target.value;
      state.prefabName = `${state.base}-${state.overlay}`;
      applySavedDefault();
      source = "custom";
      redraw();
    });

    [el.directBoard, el.macroBoard, el.microBoard].forEach((board) => {
      board.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-position]");
        if (!button) {
          return;
        }
        state.position = button.dataset.position;
        source = "custom";
        redraw();
      });
    });

    el.pickerMode.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-picker-mode]");
      if (!button) {
        return;
      }
      state.pickerMode = button.dataset.pickerMode;
      state.position = state.pickerMode === "direct"
        ? "s-center"
        : state.pickerMode === "macro"
          ? "s-mc"
          : "s-center";
      source = "custom";
      redraw();
    });

    el.previewHero.addEventListener("pointerdown", (event) => {
      if (state.pickerMode === "direct") {
        return;
      }
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
        state.position = next.id;
        source = "custom";
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
      baseDefaults[state.base] = { position: record.position, x: record.x, y: record.y, unit: record.unit, gridMode: record.gridMode, subSize: record.subSize, opacity: 1, rotate: "0deg" };
      setStatus(`Saved base default for ${state.base}.`);
      redraw();
    });

    el.makeSubDefault.addEventListener("click", () => {
      const record = currentRecord();
      subDefaults[state.overlay] = { position: record.position, x: record.x, y: record.y, unit: record.unit, gridMode: record.gridMode, subSize: record.subSize, opacity: 1, rotate: "0deg" };
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
      state.prefabName = `${sanitizeName(state.prefabName)}-copy`;
      source = "custom";
      setStatus("Duplicated.");
      redraw();
    });
    el.reset.addEventListener("click", () => {
      state = { ...defaults };
      source = "starter";
      setStatus("Reset.");
      redraw();
    });

    window.addEventListener("resize", redraw);
  }

  bind();
  syncRuntimeDefaults();
  redraw();

  function formatCoord(value, unit) {
    if ((unit || "em") === "%") {
      return `${Number(value) * 100}%`;
    }
    return `${value}em`;
  }
})();
