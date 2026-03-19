(function (global) {
  global.EmojiStackPrefabConfig = Object.assign(
    {
      endpoint: "",
      useRemoteOnly: false,
      requestTimeoutMs: 10000
    },
    global.EmojiStackPrefabConfig || {}
  );
})(window);
