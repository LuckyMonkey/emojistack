const fs = require("fs");
const path = require("path");
const generateEmojis = require("./generate-emojis");
const generatePrefabs = require("./generate-prefabs");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8").trim();
}

function minifyCss(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function ensureDist() {
  fs.mkdirSync(DIST, { recursive: true });
}

function build() {
  generateEmojis();
  generatePrefabs();
  ensureDist();

  const coreCss = [
    read("src/base.css"),
    read("src/positions.css"),
    read("src/emojis.generated.css"),
    read("src/aliases.generated.css")
  ].join("\n\n");

  const prefabCss = read("src/prefabs.css");
  const runtimeJs = [
    read("src/registry.js"),
    read("src/prefabs.generated.js"),
    read("src/runtime.js")
  ].join("\n\n");

  fs.writeFileSync(path.join(DIST, "emojistack.css"), `${coreCss}\n`, "utf8");
  fs.writeFileSync(path.join(DIST, "emojistack-prefabs.css"), `${prefabCss}\n`, "utf8");
  fs.writeFileSync(path.join(DIST, "emojistack.min.css"), `${minifyCss(`${coreCss}\n${prefabCss}`)}\n`, "utf8");
  fs.writeFileSync(path.join(DIST, "emojistack.js"), `${runtimeJs}\n`, "utf8");
}

if (require.main === module) {
  build();
}

module.exports = build;
