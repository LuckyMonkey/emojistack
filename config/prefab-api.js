(function (global) {
  global.EmojiStackPrefabConfig = Object.assign(
    {
      endpoint:
        "https://script.google.com/macros/s/AKfycbyZT5iLlvcM0p_t5_e7hUpsXPh3hjZzllEJ10azSF6h7735Ku2LWuDx3nJBXM6iWy4fBQ/exec",
      useRemoteOnly: true,
      cacheTtlMs: 1000 * 60 * 60 * 12,
      saveRetryDelayMs: 900,
      saveRetryCount: 3,
      requestTimeoutMs: 10000
    },
    global.EmojiStackPrefabConfig || {}
  );
})(window);
