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
  assert(positions.length === 49, `Expected 49 positions, found ${positions.length}`);
  assert(emojis.length >= 80, `Expected at least 80 emojis, found ${emojis.length}`);
  assert(prefabs.length >= 40, `Expected at least 40 prefabs, found ${prefabs.length}`);
}

function testGeneratedFiles() {
  const literalCss = read("src/emojis.generated.css");
  const aliasCss = read("src/aliases.generated.css");
  const positionsCss = read("src/positions.css");
  const prefabCss = read("src/prefabs.css");
  const sandboxHtml = read("sandbox/index.html");
  const sandboxJs = read("sandbox/sandbox.js");
  const storeJs = read("shared/prefab-store.js");

  assert(literalCss.includes('.🍓 { --es-token: "🍓"; }'), "Missing literal emoji selector");
  assert(aliasCss.includes('.e-strawberry { --es-token: "🍓"; }'), "Missing alias selector");
  positions.forEach((entry) => {
    assert(positionsCss.includes(`.${entry.id}`), `Missing position selector ${entry.id}`);
  });
  assert(positionsCss.includes(".es-s, .sm { --es-sub-size: 0.32; }"), "Missing small size class");
  assert(positionsCss.includes(".es-m, .md { --es-sub-size: 0.58; }"), "Missing medium size class");
  assert(positionsCss.includes(".es-l, .lg { --es-sub-size: 0.82; }"), "Missing large size class");
  assert(!positionsCss.includes(".s-tl"), "Old split placement selectors should be gone");
  assert((prefabCss.match(/\.p-/g) || []).length >= 40, "Expected prefab CSS rules");
  assert(/\[class~="🍼🍓"\]\s*\{/.test(prefabCss), "Missing pair shorthand selector");
  assert(sandboxHtml.includes('id="prefab-name"'), "Missing sandbox prefab name input");
  assert(sandboxHtml.includes('autocomplete="off"'), "Sandbox prefab search should not restore stale browser queries");
  assert(sandboxJs.includes("defaultPrefabName"), "Missing sandbox default prefab naming");
  assert(sandboxJs.includes('No matches for "${el.prefabSearch.value.trim()}"'), "Sandbox should distinguish empty search results from empty prefab feeds");
  assert(storeJs.includes("localStorage"), "Prefab store should cache prefabs locally");
  assert(storeJs.includes("cacheVersion"), "Prefab store cache key should be versioned");
  assert(storeJs.includes('params.set("action", "save")'), "Prefab store should support query-string saves");
  assert(storeJs.includes('document.createElement("iframe")'), "Prefab store should use iframe navigation for saves");
  assert(storeJs.includes('mode: "no-cors"'), "Prefab store should keep the POST fallback");
  assert(storeJs.includes("refreshUntilVisible"), "Prefab store should verify saves with a follow-up GET");
  assert(storeJs.includes("if (!parsed.prefabs.length)"), "Prefab store should ignore empty cached prefab lists");
}

function testPositionGeometry() {
  const xs = [...new Set(positions.map((entry) => entry.x))].sort((a, b) => a - b);
  const ys = [...new Set(positions.map((entry) => entry.y))].sort((a, b) => a - b);

  assert(xs.length === 7, `Expected 7 grid x columns, found ${xs.length}`);
  assert(ys.length === 7, `Expected 7 grid y rows, found ${ys.length}`);
  assert(xs[3] === 0, "Expected a true center column");
  assert(ys[3] === 0, "Expected a true center row");
  assert(xs[0] <= -0.6 && xs[xs.length - 1] >= 0.6, "Grid columns should reach the edges");
  assert(ys[0] <= -0.6 && ys[ys.length - 1] >= 0.6, "Grid rows should reach the edges");

  for (let row = 1; row <= 7; row += 1) {
    const rowCells = positions.filter((entry) => entry.id.startsWith(`s-${row}`));
    const firstY = rowCells[0].y;
    assert(rowCells.length === 7, `Expected 7 cells in row ${row}`);
    assert(rowCells.every((entry) => entry.y === firstY), `Grid row ${row} should share one y value`);
  }

  for (let col = 1; col <= 7; col += 1) {
    const colCells = positions.filter((entry) => entry.id.endsWith(`${col}`));
    const firstX = colCells[0].x;
    assert(colCells.length === 7, `Expected 7 cells in column ${col}`);
    assert(colCells.every((entry) => entry.x === firstX), `Grid column ${col} should share one x value`);
  }
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

  const cursed = makeStubNode("es 🍼 🍓 s-44");
  context.window.EmojiStack.apply(cursed);
  assert(cursed._styleMap.get("--es-base") === '"🍼"', "Cursed base token failed");
  assert(cursed._styleMap.get("--es-sub") === '"🍓"', "Cursed overlay token failed");
  assert(cursed._styleMap.get("--es-sub-ox") === "-0.01em", "Optical x offset failed");
  assert(cursed._styleMap.get("--es-sub-oy") === "0.01em", "Optical y offset failed");

  const alias = makeStubNode("es e-bottle e-strawberry s-44");
  context.window.EmojiStack.apply(alias);
  assert(alias._styleMap.get("--es-base") === '"🍼"', "Alias base token failed");
  assert(alias._styleMap.get("--es-sub") === '"🍓"', "Alias overlay token failed");

  const mixed = makeStubNode("es 🍼 e-strawberry s-44");
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
  assert(prefabOnly._styleMap.get("--es-base") === '"🍼"', "Prefab-only base token failed");
  assert(prefabOnly._styleMap.get("--es-sub") === '"🍓"', "Prefab-only overlay token failed");
  assert(prefabOnly._styleMap.get("--es-y") === "0.11em", "Prefab-only prefab y tuning failed");
}

function main() {
  testCounts();
  testGeneratedFiles();
  testPositionGeometry();
  testPrefabPlacementIntent();
  testRuntime();
  console.log("EmojiStack tests passed.");
}

main();
