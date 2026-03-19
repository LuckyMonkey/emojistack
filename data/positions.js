const macroRows = { t: -0.4, m: 0, b: 0.4 };
const macroCols = { l: -0.4, c: 0, r: 0.4 };
const rowLabels = { t: "Top", m: "Middle", b: "Bottom" };
const colLabels = { l: "Left", c: "Center", r: "Right" };
const microRows = { n: [-0.6, -0.4, -0.2], s: [0.2, 0.4, 0.6] };
const microCols = { w: [-0.6, -0.4, -0.2], e: [0.2, 0.4, 0.6] };
const quadrantLabels = {
  nw: "NW",
  ne: "NE",
  sw: "SW",
  se: "SE"
};

const positions = [
  { id: "s-center", label: "Direct Center", x: 0, y: 0, unit: "%", kind: "direct" }
];

Object.entries(macroRows).forEach(([rowKey, y]) => {
  Object.entries(macroCols).forEach(([colKey, x]) => {
    positions.push({
      id: `s-${rowKey}${colKey}`,
      label: `${rowLabels[rowKey]} ${colLabels[colKey]}`,
      x,
      y,
      unit: "%",
      kind: "macro"
    });
  });
});

Object.entries(macroRows).forEach(([rowKey]) => {
  Object.entries(macroCols).forEach(([colKey]) => {
    Object.entries(quadrantLabels).forEach(([quad, quadLabel]) => {
      const verticalBand = quad.startsWith("n") ? "n" : "s";
      const horizontalBand = quad.endsWith("w") ? "w" : "e";
      const rowOffset = rowKey === "t" ? 0 : rowKey === "m" ? 1 : 2;
      const colOffset = colKey === "l" ? 0 : colKey === "c" ? 1 : 2;

      positions.push({
        id: `s-${rowKey}${colKey}-${quad}`,
        label: `${rowLabels[rowKey]} ${colLabels[colKey]} ${quadLabel}`,
        x: microCols[horizontalBand][colOffset],
        y: microRows[verticalBand][rowOffset],
        unit: "%",
        kind: "micro"
      });
    });
  });
});

module.exports = positions;
