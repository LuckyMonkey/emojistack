const macro = {
  tl: [-0.34, -0.34, "Top Left"],
  tc: [0, -0.34, "Top Center"],
  tr: [0.34, -0.34, "Top Right"],
  ml: [-0.34, 0, "Middle Left"],
  mc: [0, 0, "Middle Center"],
  mr: [0.34, 0, "Middle Right"],
  bl: [-0.34, 0.34, "Bottom Left"],
  bc: [0, 0.34, "Bottom Center"],
  br: [0.34, 0.34, "Bottom Right"]
};

const quadrants = {
  nw: [-0.11, -0.11, "NW"],
  ne: [0.11, -0.11, "NE"],
  sw: [-0.11, 0.11, "SW"],
  se: [0.11, 0.11, "SE"]
};

const positions = [
  { id: "s-center", label: "Direct Center", x: 0, y: 0, kind: "direct" }
];

for (const [cell, [x, y, label]] of Object.entries(macro)) {
  positions.push({ id: `s-${cell}`, label, x, y, kind: "macro" });
}

for (const [cell, [baseX, baseY, label]] of Object.entries(macro)) {
  for (const [quad, [dx, dy, quadLabel]] of Object.entries(quadrants)) {
    positions.push({
      id: `s-${cell}-${quad}`,
      label: `${label} ${quadLabel}`,
      x: Number((baseX + dx).toFixed(2)),
      y: Number((baseY + dy).toFixed(2)),
      kind: "micro"
    });
  }
}

module.exports = positions;
