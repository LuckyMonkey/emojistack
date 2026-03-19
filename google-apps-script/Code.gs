const SHEET_NAME = "Prefabs";
const DAILY_SUBMISSION_LIMIT = 60;
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
  const payload = JSON.parse(event.postData.contents || "{}");
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
  const prefab = {};
  HEADERS.forEach((header) => {
    prefab[header] = input[header] ?? "";
  });

  prefab.name = String(prefab.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  prefab.label = String(prefab.label || prefab.name)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  prefab.base = String(prefab.base || "");
  prefab.overlay = String(prefab.overlay || "");
  prefab.position = String(prefab.position || "s-44");
  prefab.sizeMode = ["small", "medium", "large"].includes(prefab.sizeMode) ? prefab.sizeMode : "medium";
  prefab.x = Number(prefab.x || 0);
  prefab.y = Number(prefab.y || 0);
  prefab.unit = String(prefab.unit || "%");
  prefab.subSize = Number(prefab.subSize || 0.58);
  prefab.rotate = String(prefab.rotate || "0deg");
  prefab.opacity = Number(prefab.opacity || 1);
  prefab.updatedAt = new Date().toISOString();

  if (!prefab.name || !prefab.base || !prefab.overlay) {
    throw new Error("Missing required prefab fields.");
  }

  return prefab;
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
