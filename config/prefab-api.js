(function (global) {
  global.EmojiStackPrefabConfig = Object.assign(
    {
      endpoint:
        "https://script.google.com/macros/s/AKfycby4-s-MgiYH_81BP6BxUCWnvnYSHVtR0XaCpMcY9JzQPdwouzwz_ACkJsTTTbiEot700A/exec",
      useRemoteOnly: true,
      cacheTtlMs: 1000 * 60 * 60 * 12,
      saveRetryDelayMs: 900,
      saveRetryCount: 3,
      requestTimeoutMs: 10000
    },
    global.EmojiStackPrefabConfig || {}
  );
})(window);
