(function (global) {
  const data = global.EmojiStackData || { emojis: [], aliasToEmoji: {} };
  const prefabs = global.EmojiStackPrefabs || [];
  const emojiToAlias = Object.fromEntries((data.emojis || []).map((entry) => [entry.emoji, entry.alias]));
  const emojiMeta = Object.fromEntries((data.emojis || []).map((entry) => [entry.emoji, entry]));
  const literalEmojiList = (data.emojis || [])
    .map((entry) => entry.emoji)
    .sort((left, right) => right.length - left.length);
  const prefabByPair = new Map(
    prefabs.map((prefab) => [`${prefab.baseEmoji}${prefab.overlayEmoji}`, prefab])
  );
  const AUTO_PREFAB_KEYS = ["--es-x", "--es-y", "--es-sub-size", "--es-opacity", "--es-rotate"];
  const baseDefaults = global.EmojiStackBaseDefaults || {};
  const subDefaults = global.EmojiStackSubDefaults || {};

  function getClassTokens(node) {
    const value = node.getAttribute("class") || "";
    return value.split(/\s+/).filter(Boolean);
  }

  function resolveToken(token) {
    if (data.aliasToEmoji && data.aliasToEmoji[token]) {
      return data.aliasToEmoji[token];
    }

    if (data.literalToEmoji && data.literalToEmoji[token]) {
      return data.literalToEmoji[token];
    }

    return null;
  }

  function resolvePairToken(token) {
    if (!token || typeof token !== "string") {
      return null;
    }

    for (const emoji of literalEmojiList) {
      if (!token.startsWith(emoji) || token === emoji) {
        continue;
      }

      const remainder = token.slice(emoji.length);
      if (data.literalToEmoji && data.literalToEmoji[remainder]) {
        return {
          base: emoji,
          sub: data.literalToEmoji[remainder],
          pairKey: token
        };
      }
    }

    return null;
  }

  function hasPositionToken(tokens) {
    return tokens.some((token) => /^s-/.test(token));
  }

  function hasPrefabToken(tokens) {
    return tokens.some((token) => /^p-/.test(token));
  }

  function clearAutoPrefab(node) {
    if (!node.dataset || node.dataset.esAutoPrefab !== "1") {
      return;
    }

    AUTO_PREFAB_KEYS.forEach((key) => node.style.removeProperty(key));
    delete node.dataset.esAutoPrefab;
  }

  function applyAutoPrefab(node, prefab) {
    node.style.setProperty("--es-x", `${prefab.x}em`);
    node.style.setProperty("--es-y", `${prefab.y}em`);
    node.style.setProperty("--es-sub-size", `${prefab.subSize}`);
    node.style.setProperty("--es-opacity", `${prefab.opacity || 1}`);
    node.style.setProperty("--es-rotate", prefab.rotate || "0deg");
    node.dataset.esAutoPrefab = "1";
  }

  function applyBaseDefault(node, baseEmoji) {
    const alias = emojiToAlias[baseEmoji];
    const preset = alias ? baseDefaults[alias] : null;
    if (!preset) {
      return;
    }

    node.style.setProperty("--es-x", `${preset.x}em`);
    node.style.setProperty("--es-y", `${preset.y}em`);
    node.style.setProperty("--es-sub-size", `${preset.subSize}`);
    node.style.setProperty("--es-opacity", `${preset.opacity || 1}`);
    node.style.setProperty("--es-rotate", preset.rotate || "0deg");
    node.dataset.esAutoPrefab = "1";
  }

  function applySubDefault(node, subEmoji) {
    const alias = emojiToAlias[subEmoji];
    const preset = alias ? subDefaults[alias] : null;
    if (!preset) {
      return false;
    }

    node.style.setProperty("--es-x", `${preset.x}em`);
    node.style.setProperty("--es-y", `${preset.y}em`);
    node.style.setProperty("--es-sub-size", `${preset.subSize}`);
    node.style.setProperty("--es-opacity", `${preset.opacity || 1}`);
    node.style.setProperty("--es-rotate", preset.rotate || "0deg");
    node.dataset.esAutoPrefab = "1";
    return true;
  }

  function apply(node) {
    if (!node || !node.classList || !node.classList.contains("es")) {
      return;
    }

    const tokens = getClassTokens(node);
    let base = null;
    let sub = null;
    let pairKey = null;

    for (const token of tokens) {
      const pair = resolvePairToken(token);
      if (pair && !base && !sub) {
        base = pair.base;
        sub = pair.sub;
        pairKey = pair.pairKey;
        continue;
      }

      const resolved = resolveToken(token);
      if (!resolved) {
        continue;
      }
      if (!base) {
        base = resolved;
        continue;
      }
      sub = resolved;
      break;
    }

    if (!base && !sub) {
      return;
    }

    if (base) {
      node.style.setProperty("--es-base", JSON.stringify(base));
      node.dataset.esBase = base;
    }

    if (sub) {
      node.style.setProperty("--es-sub", JSON.stringify(sub));
      node.style.setProperty("--es-sub-ox", `${emojiMeta[sub]?.ox || 0}em`);
      node.style.setProperty("--es-sub-oy", `${emojiMeta[sub]?.oy || 0}em`);
      node.dataset.esSub = sub;
    } else {
      node.style.removeProperty("--es-sub");
      node.style.removeProperty("--es-sub-ox");
      node.style.removeProperty("--es-sub-oy");
      delete node.dataset.esSub;
    }

    clearAutoPrefab(node);

    if (!hasPositionToken(tokens) && !hasPrefabToken(tokens) && pairKey && prefabByPair.has(pairKey)) {
      applyAutoPrefab(node, prefabByPair.get(pairKey));
      return;
    }

    if (!hasPositionToken(tokens) && !hasPrefabToken(tokens) && sub && applySubDefault(node, sub)) {
      return;
    }

    if (!hasPositionToken(tokens) && !hasPrefabToken(tokens) && base) {
      applyBaseDefault(node, base);
    }
  }

  function queryTargets(root) {
    if (!root) {
      return [];
    }

    if (root.nodeType === 1 && root.matches(".es")) {
      return [root].concat(Array.from(root.querySelectorAll(".es")));
    }

    if (typeof root.querySelectorAll === "function") {
      return Array.from(root.querySelectorAll(".es"));
    }

    return [];
  }

  function init(root) {
    const scope = root || document;
    queryTargets(scope).forEach(apply);
    return api;
  }

  function refresh(root) {
    return init(root);
  }

  const api = global.EmojiStack || {};
  api.apply = apply;
  api.init = init;
  api.refresh = refresh;
  api.resolveToken = resolveToken;
  api.resolvePairToken = resolvePairToken;
  api.baseDefaults = baseDefaults;
  api.subDefaults = subDefaults;
  api.setBaseDefaults = function setBaseDefaults(nextDefaults) {
    Object.keys(baseDefaults).forEach((key) => delete baseDefaults[key]);
    Object.assign(baseDefaults, nextDefaults || {});
    return api;
  };
  api.setSubDefaults = function setSubDefaults(nextDefaults) {
    Object.keys(subDefaults).forEach((key) => delete subDefaults[key]);
    Object.assign(subDefaults, nextDefaults || {});
    return api;
  };
  api.data = data;
  api.emojis = data.emojis || [];
  api.prefabs = prefabs;
  global.EmojiStack = api;

  function boot() {
    init(document);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }
})(window);
