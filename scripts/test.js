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
  assert(/\[class~="🍼🍓"\]\s*\{/.test(prefabCss), "Missing pair shorthand selector");
}

function findPrefab(name) {
  const prefab = prefabs.find((entry) => entry.name === name);
  assert(prefab, `Missing prefab "${name}"`);
  return prefab;
}

function testPrefabPlacementIntent() {
  const strawberryMilk = findPrefab("strawberry-milk");
  assert(strawberryMilk.x < 0, "Strawberry milk should lean left");
  assert(strawberryMilk.y > 0, "Strawberry milk should sit on the bottle body");
  assert(strawberryMilk.subSize < 0.4, "Strawberry milk should be slightly smaller");

  const poisonBottle = findPrefab("poison-bottle");
  assert(poisonBottle.x < 0, "Poison bottle should lean left");
  assert(poisonBottle.y > 0, "Poison bottle should sit on the bottle body");

  const skullCoffee = findPrefab("skull-coffee");
  assert(skullCoffee.x > 0, "Skull coffee should float a little right");
  assert(skullCoffee.y < 0, "Skull coffee should float above center");

  const fireLaptop = findPrefab("fire-laptop");
  assert(fireLaptop.x > 0, "Fire laptop should sit on the upper right");
  assert(fireLaptop.y < 0, "Fire laptop should sit on the upper right");
  assert(fireLaptop.subSize < 0.4, "Fire laptop should be smaller than before");

  const warningBox = findPrefab("warning-box");
  assert(warningBox.x > 0.2, "Box badges should sit on the side");
  assert(warningBox.y > 0, "Box badges should sit lower on the side");

  const sparkleFolder = findPrefab("sparkle-folder");
  assert(sparkleFolder.x < 0, "Sparkles should stay on the top left");
  assert(sparkleFolder.y < 0, "Sparkles should stay on the top left");

  const catAngel = findPrefab("cat-angel");
  assert(catAngel.base === "angel", "Cat angel should use angel as the base");
  assert(catAngel.overlay === "cat", "Cat angel should layer the cat over the angel");
  assert(catAngel.subSize > 0.85, "Cat angel should keep most of the cat face visible");

  const archiveDisk = findPrefab("archive-disk");
  assert(archiveDisk.y > 0.05, "Archive disk should sit lower on the floppy");

  const ghostTv = findPrefab("ghost-tv");
  assert(ghostTv.subSize < 0.5, "Ghost TV should use a smaller ghost");

  const buckets = {
    upperLeft: 0,
    upperRight: 0,
    lowerRight: 0,
    centerish: 0
  };

  prefabs.forEach((prefab) => {
    const x = typeof prefab.x === "number" ? prefab.x : 0;
    const y = typeof prefab.y === "number" ? prefab.y : 0;

    if (x < -0.12 && y < -0.12) {
      buckets.upperLeft += 1;
    } else if (x > 0.12 && y < -0.08) {
      buckets.upperRight += 1;
    } else if (x > 0.18 && y > 0.02) {
      buckets.lowerRight += 1;
    } else {
      buckets.centerish += 1;
    }
  });

  assert(buckets.upperLeft >= 4, "Expected several upper-left prefabs");
  assert(buckets.upperRight >= 6, "Expected several upper-right prefabs");
  assert(buckets.lowerRight >= 6, "Expected several lower-right prefabs");
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

  const paired = makeStubNode("es 🍼🍓");
  context.window.EmojiStack.apply(paired);
  assert(paired._styleMap.get("--es-base") === '"🍼"', "Paired base token failed");
  assert(paired._styleMap.get("--es-sub") === '"🍓"', "Paired overlay token failed");
  assert(paired._styleMap.get("--es-x") === "-0.03em", "Paired prefab x tuning failed");
  assert(paired._styleMap.get("--es-y") === "0.11em", "Paired prefab y tuning failed");

  const prefabOnly = makeStubNode("es p-strawberry-milk");
  context.window.EmojiStack.apply(prefabOnly);
  assert(!prefabOnly._styleMap.has("--es-base"), "Prefab-only element should not be runtime-mutated");
}

function main() {
  testCounts();
  testGeneratedFiles();
  testPrefabPlacementIntent();
  testRuntime();
  console.log("EmojiStack tests passed.");
}

main();
