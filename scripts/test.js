const fs = require("fs");
const path = require("path");
const vm = require("vm");
const positions = require("../data/positions");
const emojis = require("../data/emojis");
const prefabs = require("../data/prefabs");

const ROOT = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function testCounts() {
  assert(positions.length === 46, `Expected 46 positions, found ${positions.length}`);
  assert(emojis.length >= 80, `Expected at least 80 emojis, found ${emojis.length}`);
  assert(prefabs.length >= 40, `Expected at least 40 prefabs, found ${prefabs.length}`);
}

function testGeneratedFiles() {
  const literalCss = read("src/emojis.generated.css");
  const aliasCss = read("src/aliases.generated.css");
  const positionsCss = read("src/positions.css");
  const prefabCss = read("src/prefabs.css");

  assert(literalCss.includes('.🍓 { --es-token: "🍓"; }'), "Missing literal emoji selector");
  assert(aliasCss.includes('.e-strawberry { --es-token: "🍓"; }'), "Missing alias selector");
  assert((positionsCss.match(/\.s-/g) || []).length === 46, "Expected 46 position CSS rules");
  assert((prefabCss.match(/\.p-/g) || []).length >= 40, "Expected prefab CSS rules");
}

function makeStubDocument() {
  return {
    readyState: "complete",
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };
}

function makeStubNode(className) {
  const styleMap = new Map();
  const classSet = new Set(className.split(/\s+/).filter(Boolean));
  return {
    _className: className,
    getAttribute(name) {
      return name === "class" ? Array.from(classSet).join(" ") : "";
    },
    classList: {
      contains(token) {
        return classSet.has(token);
      },
      add(token) {
        classSet.add(token);
      }
    },
    dataset: {},
    style: {
      setProperty(key, value) {
        styleMap.set(key, value);
      },
      removeProperty(key) {
        styleMap.delete(key);
      }
    },
    _styleMap: styleMap
  };
}

function testRuntime() {
  const bundle = read("dist/emojistack.js");
  const document = makeStubDocument();
  const context = { window: {}, document, console };
  context.window.window = context.window;
  context.window.document = document;
  vm.createContext(context);
  vm.runInContext(bundle, context);

  const cursed = makeStubNode("es 🍼 🍓 s-center");
  context.window.EmojiStack.apply(cursed);
  assert(cursed._styleMap.get("--es-base") === '"🍼"', "Cursed base token failed");
  assert(cursed._styleMap.get("--es-sub") === '"🍓"', "Cursed overlay token failed");

  const alias = makeStubNode("es e-bottle e-strawberry s-center");
  context.window.EmojiStack.apply(alias);
  assert(alias._styleMap.get("--es-base") === '"🍼"', "Alias base token failed");
  assert(alias._styleMap.get("--es-sub") === '"🍓"', "Alias overlay token failed");

  const mixed = makeStubNode("es 🍼 e-strawberry s-center");
  context.window.EmojiStack.apply(mixed);
  assert(mixed._styleMap.get("--es-base") === '"🍼"', "Mixed base token failed");
  assert(mixed._styleMap.get("--es-sub") === '"🍓"', "Mixed overlay token failed");

  const paired = makeStubNode("🍼🍓");
  context.window.EmojiStack.apply(paired);
  assert(paired.classList.contains("es"), "Paired token should auto-add .es");
  assert(paired._styleMap.get("--es-base") === '"🍼"', "Paired base token failed");
  assert(paired._styleMap.get("--es-sub") === '"🍓"', "Paired overlay token failed");
  assert(paired._styleMap.get("--es-x") === "0em", "Paired prefab x tuning failed");
  assert(paired._styleMap.get("--es-y") === "0.12em", "Paired prefab y tuning failed");

  const prefabOnly = makeStubNode("es p-strawberry-milk");
  context.window.EmojiStack.apply(prefabOnly);
  assert(!prefabOnly._styleMap.has("--es-base"), "Prefab-only element should not be runtime-mutated");
}

function main() {
  testCounts();
  testGeneratedFiles();
  testRuntime();
  console.log("EmojiStack tests passed.");
}

main();
