(function (global) {
  const config = global.EmojiStackPrefabConfig || {};
  const data = global.EmojiStack?.data || { emojis: [], positions: [] };
  const builtIns = Array.isArray(global.EmojiStack?.prefabs) ? global.EmojiStack.prefabs.slice() : [];
  const emojis = data.emojis || [];
  const positions = data.positions || [];
  const emojiByAlias = Object.fromEntries(
    emojis.flatMap((entry) => (entry.aliases || [entry.alias]).map((alias) => [alias, entry]))
  );
  const emojiByLiteral = Object.fromEntries(emojis.map((entry) => [entry.emoji, entry]));
  const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));
  const SIZE_MAP = {
    small: 0.32,
    medium: 0.58,
    large: 0.82
  };

  let prefabs = builtIns.slice();
  let loadPromise = null;

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function sanitizeName(value) {
    const cleaned = String(value || "custom-stack")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "custom-stack";
  }

  function titleize(value) {
    return String(value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function inferSizeMode(subSize) {
    if (Number(subSize) >= 0.72) {
      return "large";
    }
    if (Number(subSize) <= 0.4) {
      return "small";
    }
    return "medium";
  }

  function numericOr(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function resolveEmoji(value, fallbackKey) {
    if (value && emojiByLiteral[value]) {
      return emojiByLiteral[value];
    }

    const normalized = String(value || fallbackKey || "").replace(/^e-/, "");
    return emojiByAlias[normalized] || null;
  }

  function normalizePrefab(input) {
    const position = positionById[input.position] || positionById.s-44;
    const baseEntry = resolveEmoji(input.base, input.baseEmoji);
    const overlayEntry = resolveEmoji(input.overlay, input.overlayEmoji);

    if (!baseEntry || !overlayEntry || !position) {
      return null;
    }

    const sizeMode = ["small", "medium", "large"].includes(input.sizeMode)
      ? input.sizeMode
      : inferSizeMode(input.subSize || SIZE_MAP.medium);
    const xUnit = input.xUnit || input.unit || position.unit || "%";
    const yUnit = input.yUnit || input.unit || position.unit || "%";

    return {
      name: sanitizeName(input.name || `${baseEntry.alias}-${overlayEntry.alias}`),
      label: input.label || titleize(input.name || `${baseEntry.alias}-${overlayEntry.alias}`),
      base: baseEntry.alias,
      overlay: overlayEntry.alias,
      baseEmoji: baseEntry.emoji,
      overlayEmoji: overlayEntry.emoji,
      position: position.id,
      positionLabel: input.positionLabel || position.label,
      sizeMode,
      subSize: numericOr(input.subSize, SIZE_MAP[sizeMode]),
      x: numericOr(input.x, position.x),
      y: numericOr(input.y, position.y),
      xUnit,
      yUnit,
      opacity: numericOr(input.opacity, 1),
      rotate: input.rotate || "0deg",
      searchText: normalizeText([
        input.name,
        input.label,
        baseEntry.alias,
        overlayEntry.alias,
        baseEntry.emoji,
        overlayEntry.emoji,
        position.label
      ].join(" "))
    };
  }

  function assignPrefabs(list) {
    prefabs = list
      .map(normalizePrefab)
      .filter(Boolean)
      .sort((left, right) => left.label.localeCompare(right.label));

    if (global.EmojiStack) {
      global.EmojiStack.prefabs = prefabs;
      if (typeof document !== "undefined") {
        global.EmojiStack.refresh(document);
      }
    }

    return prefabs.slice();
  }

  async function fetchJson(url, options) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller
      ? global.setTimeout(() => controller.abort(), config.requestTimeoutMs || 10000)
      : null;

    try {
      const response = await fetch(url, {
        method: "GET",
        ...options,
        signal: controller ? controller.signal : undefined
      });
      const payload = await response.json();

      if (!response.ok || (payload && payload.ok === false)) {
        throw new Error(payload?.error || `Request failed with ${response.status}`);
      }

      return payload;
    } finally {
      if (timeout) {
        global.clearTimeout(timeout);
      }
    }
  }

  async function loadPrefabs(options = {}) {
    const force = Boolean(options.force);

    if (!force && loadPromise) {
      return loadPromise;
    }

    if (!config.endpoint) {
      return assignPrefabs(config.useRemoteOnly ? [] : builtIns);
    }

    loadPromise = fetchJson(config.endpoint)
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : payload.prefabs || [];
        return assignPrefabs(rows);
      })
      .catch((error) => {
        if (!config.useRemoteOnly) {
          return assignPrefabs(builtIns);
        }
        throw error;
      })
      .finally(() => {
        loadPromise = null;
      });

    return loadPromise;
  }

  async function savePrefab(prefab) {
    if (!config.endpoint) {
      throw new Error("Prefab API endpoint is not configured.");
    }

    const payload = {
      name: sanitizeName(prefab.name),
      label: prefab.label || titleize(prefab.name),
      base: prefab.base,
      overlay: prefab.overlay,
      position: prefab.position,
      sizeMode: prefab.sizeMode || inferSizeMode(prefab.subSize),
      x: prefab.x,
      y: prefab.y,
      unit: prefab.unit || "%",
      subSize: prefab.subSize,
      rotate: prefab.rotate || "0deg",
      opacity: typeof prefab.opacity === "number" ? prefab.opacity : 1
    };

    const response = await fetchJson(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    await loadPrefabs({ force: true });
    return response;
  }

  function getPrefabs() {
    return prefabs.slice();
  }

  function getPrefab(name) {
    const key = sanitizeName(name);
    return prefabs.find((entry) => entry.name === key) || null;
  }

  assignPrefabs(config.useRemoteOnly ? [] : builtIns);

  global.EmojiStackPrefabStore = {
    config,
    getPrefabs,
    getPrefab,
    loadPrefabs,
    savePrefab,
    normalizePrefab,
    titleize,
    sanitizeName,
    inferSizeMode
  };
})(window);
