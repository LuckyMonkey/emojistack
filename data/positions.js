const lanes = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];

function laneLabel(index) {
  return index === 4 ? "Center" : `Row ${index} Col ${index}`;
}

const positions = [];

for (let row = 0; row < lanes.length; row += 1) {
  for (let col = 0; col < lanes.length; col += 1) {
    const rowIndex = row + 1;
    const colIndex = col + 1;
    const id = `s-${rowIndex}${colIndex}`;
    const center = rowIndex === 4 && colIndex === 4;

    positions.push({
      id,
      label: center ? "Center" : `Row ${rowIndex} Col ${colIndex}`,
      x: lanes[col],
      y: lanes[row],
      unit: "%",
      kind: "grid"
    });
  }
}

module.exports = positions;
