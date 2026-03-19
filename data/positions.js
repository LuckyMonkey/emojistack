const macro = {
  tl: [-0.333333, -0.333333, "Top Left"],
  tc: [0, -0.333333, "Top Center"],
  tr: [0.333333, -0.333333, "Top Right"],
  ml: [-0.333333, 0, "Middle Left"],
  mc: [0, 0, "Middle Center"],
  mr: [0.333333, 0, "Middle Right"],
  bl: [-0.333333, 0.333333, "Bottom Left"],
  bc: [0, 0.333333, "Bottom Center"],
  br: [0.333333, 0.333333, "Bottom Right"]
};

const quadrants = {
  nw: [-0.083333, -0.083333, "NW"],
  ne: [0.083333, -0.083333, "NE"],
  sw: [-0.083333, 0.083333, "SW"],
  se: [0.083333, 0.083333, "SE"]
};

const positions = [
  { id: "s-center", label: "Direct Center", x: 0, y: 0, unit: "%", kind: "direct" }
];

for (const [cell, [x, y, label]] of Object.entries(macro)) {
  positions.push({ id: `s-${cell}`, label, x, y, unit: "%", kind: "macro" });
}

for (const [cell, [baseX, baseY, label]] of Object.entries(macro)) {
  for (const [quad, [dx, dy, quadLabel]] of Object.entries(quadrants)) {
    positions.push({
      id: `s-${cell}-${quad}`,
      label: `${label} ${quadLabel}`,
      x: Number((baseX + dx).toFixed(2)),
      y: Number((baseY + dy).toFixed(2)),
      unit: "%",
      kind: "micro"
    });
  }
}

module.exports = positions;
