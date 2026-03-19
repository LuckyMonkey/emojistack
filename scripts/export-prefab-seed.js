const fs = require("fs");
const path = require("path");
const prefabs = require("../data/prefabs");
const positions = require("../data/positions");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "google-apps-script");
const positionById = Object.fromEntries(positions.map((entry) => [entry.id, entry]));

function inferSizeMode(subSize) {
  if (Number(subSize) >= 0.72) {
    return "large";
  }
  if (Number(subSize) <= 0.4) {
    return "small";
  }
  return "medium";
}

function normalizeRow(prefab) {
  const position = positionById[prefab.position] || positionById["s-44"];
  return {
    name: prefab.name,
    label: prefab.label,
    base: prefab.base,
    overlay: prefab.overlay,
    position: position.id,
    sizeMode: prefab.sizeMode || inferSizeMode(prefab.subSize),
    x: typeof prefab.x === "number" ? prefab.x : position.x,
    y: typeof prefab.y === "number" ? prefab.y : position.y,
    unit: prefab.unit || prefab.xUnit || position.unit || "%",
    subSize: typeof prefab.subSize === "number" ? prefab.subSize : 0.58,
    rotate: prefab.rotate || "0deg",
    opacity: typeof prefab.opacity === "number" ? prefab.opacity : 1
  };
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function exportSeed() {
  const rows = prefabs.map(normalizeRow);
  const headers = ["name", "label", "base", "overlay", "position", "sizeMode", "x", "y", "unit", "subSize", "rotate", "opacity"];
  const csv = [headers.join(",")]
    .concat(rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")))
    .join("\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "prefabs-seed.csv"), `${csv}\n`, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "prefabs-seed.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

if (require.main === module) {
  exportSeed();
}

module.exports = exportSeed;
