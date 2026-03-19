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
  const CACHE_KEY = `emojistack:prefabs:${config.endpoint || "built-in"}`;
  const CACHE_TTL_MS = Number(config.cacheTtlMs) > 0 ? Number(config.cacheTtlMs) : 1000 * 60 * 60 * 12;
  const SAVE_RETRY_DELAY_MS = Number(config.saveRetryDelayMs) > 0 ? Number(config.saveRetryDelayMs) : 900;
  const SAVE_RETRY_COUNT = Number(config.saveRetryCount) > 0 ? Number(config.saveRetryCount) : 3;

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

  function readCache() {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.prefabs) || !Number.isFinite(parsed.cachedAt)) {
        return null;
      }

      if ((Date.now() - parsed.cachedAt) > CACHE_TTL_MS) {
        return null;
      }

      return parsed.prefabs;
    } catch (error) {
      return null;
    }
  }

  function writeCache(list) {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        cachedAt: Date.now(),
        prefabs: list
      }));
    } catch (error) {
      // Ignore quota/storage failures and keep the live in-memory list.
    }
  }

  function clearCache() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function describeEndpointFailure(response, bodyText) {
    const location = response?.url || "";
    const contentType = response?.headers?.get?.("content-type") || "";
    const text = String(bodyText || "");

    if (
      response?.redirected &&
      (location.includes("accounts.google.com") || location.includes("ServiceLogin"))
    ) {
      return "The Google Apps Script endpoint is still private. Redeploy it as a public web app so anonymous visitors can load prefabs.";
    }

    if (location.includes("accounts.google.com") || text.includes("ServiceLogin")) {
      return "The Google Apps Script endpoint is redirecting to Google sign-in instead of returning JSON.";
    }

    if (contentType.includes("text/html")) {
      return "The prefab endpoint returned HTML instead of JSON. The Apps Script deployment is likely not public yet.";
    }

    return null;
  }

  async function fetchJson(url, options) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller
      ? global.setTimeout(() => controller.abort(), config.requestTimeoutMs || 10000)
      : null;

    try {
      let response;

      try {
        response = await fetch(url, {
          method: "GET",
          ...options,
          signal: controller ? controller.signal : undefined
        });
      } catch (error) {
        if (String(error?.message || "").toLowerCase().includes("failed to fetch")) {
          throw new Error(
            "The prefab API could not be reached from this page. The Apps Script web app is likely private or missing CORS access."
          );
        }
        throw error;
      }

      const rawText = await response.text();
      const endpointFailure = describeEndpointFailure(response, rawText);
      if (endpointFailure) {
        throw new Error(endpointFailure);
      }

      let payload;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch (error) {
        throw new Error("The prefab endpoint did not return valid JSON.");
      }

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
    const cached = !force ? readCache() : null;

    if (!force && loadPromise) {
      return loadPromise;
    }

    if (cached) {
      return assignPrefabs(cached);
    }

    if (!config.endpoint) {
      return assignPrefabs(config.useRemoteOnly ? [] : builtIns);
    }

    loadPromise = fetchJson(config.endpoint)
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : payload.prefabs || [];
        writeCache(rows);
        return assignPrefabs(rows);
      })
      .catch((error) => {
        const fallbackCache = readCache();
        if (fallbackCache) {
          return assignPrefabs(fallbackCache);
        }
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

  function delay(ms) {
    return new Promise((resolve) => {
      global.setTimeout(resolve, ms);
    });
  }

  async function refreshUntilVisible(name) {
    for (let attempt = 0; attempt < SAVE_RETRY_COUNT; attempt += 1) {
      const list = await loadPrefabs({ force: true });
      const hit = list.find((entry) => entry.name === name);
      if (hit) {
        return hit;
      }
      await delay(SAVE_RETRY_DELAY_MS);
    }

    throw new Error("The prefab save request was sent, but the updated sheet row did not appear yet.");
  }

  function buildSaveUrl(payload) {
    const params = new URLSearchParams();
    params.set("action", "save");
    Object.entries(payload).forEach(([key, value]) => {
      params.set(key, String(value));
    });
    return `${config.endpoint}?${params.toString()}`;
  }

  async function saveViaIframe(payload) {
    if (typeof document === "undefined" || !document.body) {
      throw new Error("Iframe save is not available in this environment.");
    }

    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.display = "none";

    const cleanup = () => {
      iframe.onload = null;
      iframe.onerror = null;
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const completion = new Promise((resolve, reject) => {
      const timer = global.setTimeout(() => {
        cleanup();
        reject(new Error("The browser could not complete the Google Sheets save navigation."));
      }, config.requestTimeoutMs || 10000);

      iframe.onload = () => {
        global.clearTimeout(timer);
        cleanup();
        resolve();
      };

      iframe.onerror = () => {
        global.clearTimeout(timer);
        cleanup();
        reject(new Error("The browser blocked the Google Sheets save navigation."));
      };
    });

    document.body.appendChild(iframe);
    iframe.src = buildSaveUrl(payload);
    await completion;

    const saved = await refreshUntilVisible(payload.name);
    return {
      ok: true,
      prefab: saved,
      transport: "query-iframe"
    };
  }

  async function saveViaPostFallback(payload) {
    try {
      await global.fetch(config.endpoint, {
        method: "POST",
        mode: "no-cors",
        redirect: "follow",
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Even if the browser cannot read the POST response, the write may still land.
    }

    const saved = await refreshUntilVisible(payload.name);
    return {
      ok: true,
      prefab: saved,
      transport: "post-fallback"
    };
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

    try {
      return await saveViaIframe(payload);
    } catch (error) {
      return saveViaPostFallback(payload);
    }
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
