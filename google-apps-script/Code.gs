const SHEET_NAME = "Prefabs";
const DAILY_SUBMISSION_LIMIT = 60;
const NAME_PATTERN = /^[a-z0-9-]{1,64}$/;
const ALIAS_PATTERN = /^[a-z0-9-]{1,64}$/;
const POSITION_PATTERN = /^s-[1-7][1-7]$/;
const SIZE_MODE_SET = { small: true, medium: true, large: true };
const UNIT_SET = { "%": true, em: true };
const ROTATE_PATTERN = /^-?\d{1,3}(?:\.\d+)?deg$/;
const HEADERS = [
  "name",
  "label",
  "base",
  "overlay",
  "position",
  "sizeMode",
  "x",
  "y",
  "unit",
  "subSize",
  "rotate",
  "opacity",
  "updatedAt"
];

function doGet() {
  const rows = readPrefabs_();
  return json_({
    ok: true,
    prefabs: rows,
    count: rows.length
  });
}

function doPost(event) {
  const payload = parsePayload_(event);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    enforceDailyLimit_();
    const prefab = normalizePrefab_(payload);
    upsertPrefab_(prefab);
    incrementDailyCount_();

    return json_({
      ok: true,
      prefab,
      remaining: Math.max(0, DAILY_SUBMISSION_LIMIT - getDailyCount_())
    });
  } finally {
    lock.releaseLock();
  }
}

function readPrefabs_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0])
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
}

function upsertPrefab_(prefab) {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    sheet.appendRow(HEADERS);
  }

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const nameIndex = headers.indexOf("name");
  const existingRow = rows.findIndex((row, index) => index > 0 && row[nameIndex] === prefab.name);
  const output = headers.map((header) => prefab[header] ?? "");

  if (existingRow > 0) {
    sheet.getRange(existingRow + 1, 1, 1, headers.length).setValues([output]);
  } else {
    sheet.appendRow(output);
  }
}

function normalizePrefab_(input) {
  const base = sanitizeAlias_(input.base);
  const overlay = sanitizeAlias_(input.overlay);
  const name = sanitizeName_(input.name || `${base}-${overlay}`);
  const prefab = {
    name,
    label: titleize_(name),
    base,
    overlay,
    position: sanitizePosition_(input.position),
    sizeMode: SIZE_MODE_SET[input.sizeMode] ? input.sizeMode : "medium",
    x: clampNumber_(input.x, -1, 1, 0),
    y: clampNumber_(input.y, -1, 1, 0),
    unit: sanitizeUnit_(input.unit),
    subSize: clampNumber_(input.subSize, 0.2, 1.05, 0.58),
    rotate: sanitizeRotate_(input.rotate),
    opacity: clampNumber_(input.opacity, 0, 1, 1),
    updatedAt: new Date().toISOString()
  };

  if (!prefab.name || !prefab.base || !prefab.overlay) {
    throw new Error("Missing required prefab fields.");
  }

  if (!NAME_PATTERN.test(prefab.name)) {
    throw new Error("Prefab name is invalid.");
  }

  if (!POSITION_PATTERN.test(prefab.position)) {
    throw new Error("Prefab position is invalid.");
  }

  return prefab;
}

function parsePayload_(event) {
  const raw = event && event.postData && event.postData.contents;
  if (!raw) {
    throw new Error("Missing request body.");
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error("Request body must be valid JSON.");
  }

  if (!payload || Object.prototype.toString.call(payload) !== "[object Object]") {
    throw new Error("Request body must be a JSON object.");
  }

  return payload;
}

function sanitizeName_(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeAlias_(value) {
  const alias = sanitizeName_(value);
  if (!ALIAS_PATTERN.test(alias)) {
    throw new Error("Emoji alias is invalid.");
  }
  return alias;
}

function sanitizePosition_(value) {
  const position = String(value || "s-44");
  if (!POSITION_PATTERN.test(position)) {
    throw new Error("Position must match the 7x7 grid.");
  }
  return position;
}

function sanitizeUnit_(value) {
  const unit = String(value || "%");
  if (!UNIT_SET[unit]) {
    throw new Error("Unit is invalid.");
  }
  return unit;
}

function sanitizeRotate_(value) {
  const rotate = String(value || "0deg");
  if (!ROTATE_PATTERN.test(rotate)) {
    throw new Error("Rotate must be a degree value.");
  }
  return rotate;
}

function clampNumber_(value, min, max, fallback) {
  const number = Number(value);
  if (!isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function titleize_(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function quotaKey_() {
  return `prefab-submissions:${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")}`;
}

function getDailyCount_() {
  const props = PropertiesService.getScriptProperties();
  return Number(props.getProperty(quotaKey_()) || 0);
}

function incrementDailyCount_() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(quotaKey_(), String(getDailyCount_() + 1));
}

function enforceDailyLimit_() {
  if (getDailyCount_() >= DAILY_SUBMISSION_LIMIT) {
    throw new Error(`Daily submission limit reached (${DAILY_SUBMISSION_LIMIT}).`);
  }
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
