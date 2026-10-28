const HEADERS = [
  "request_id", "created_at", "name", "phone", "email", "cake_type",
  "weight_kg", "event_date", "filling", "tiers", "decoration", "inscription",
  "comment", "utm_source", "utm_medium", "utm_campaign", "utm_content",
  "utm_term", "page_url", "total_price", "status"
];
const STATUSES = ["new", "confirmed", "prepaid", "done", "cancelled"];
const CAKE_TYPES = ["CUSTOM"].concat(Array.from({length: 20}, (_, i) => "C-" + String(i + 1).padStart(2, "0")));
const MAX_TEXT_LENGTH = 200;
const FILLINGS = ["vanilla_berry", "chocolate", "honey_cake", "carrot", "pistachio_raspberry", "mango_passionfruit"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const error = validatePayload(body);
    if (error) return output({ok: false, error: error});

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) return output({ok: false, error: "missing_spreadsheet_id"});

    lock.waitLock(10000);
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = getOrCreateSheet(spreadsheet);
      const requestId = String(body.request_id).trim();
      if (sheet.getLastRow() > 1) {
        const knownIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
        if (knownIds.includes(requestId)) return output({ok: true, duplicate: true, request_id: requestId});
      }

      const utm = body.utm || {};
      const row = [
        requestId,
        new Date(),
        clean(body.name),
        clean(body.phone),
        clean(body.email),
        clean(body.cake_type),
        Number(body.weight_kg),
        clean(body.event_date),
        clean(body.filling),
        Number(body.tiers || 1),
        clean(body.decoration),
        clean(body.inscription),
        clean(body.comment),
        clean(body.utm_source || utm.utm_source || "direct"),
        clean(body.utm_medium || utm.utm_medium || "none"),
        clean(body.utm_campaign || utm.utm_campaign || "not_set"),
        clean(body.utm_content || utm.utm_content || "not_set"),
        clean(body.utm_term || utm.utm_term || "not_set"),
        clean(body.page_url),
        Number(body.total_price || 0),
        "new"
      ];
      sheet.appendRow(row);
      return output({ok: true, request_id: requestId});
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return output({ok: false, error: "server_error", message: String(err).slice(0, 160)});
  }
}

function validatePayload(body) {
  const required = ["request_id", "name", "phone", "cake_type", "weight_kg", "event_date"];
  const missing = required.filter(function (key) {
    return body[key] === undefined || body[key] === null || String(body[key]).trim() === "";
  });
  if (missing.length) return "missing_fields:" + missing.join(",");

  const textFields = ["request_id", "name", "phone", "email", "cake_type", "event_date", "filling", "decoration", "inscription", "comment", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "page_url"];
  for (let i = 0; i < textFields.length; i++) {
    const key = textFields[i];
    if (body[key] !== undefined && String(body[key]).length > MAX_TEXT_LENGTH) return "field_too_long:" + key;
  }

  const requestId = String(body.request_id).trim();
  if (requestId.length < 8) return "invalid_request_id";
  const digits = String(body.phone).replace(/\D/g, "");
  if (digits.length !== 11 || digits.charAt(0) !== "7") return "invalid_phone";
  const email = String(body.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid_email";
  if (CAKE_TYPES.indexOf(String(body.cake_type)) === -1) return "invalid_cake_type";
  if (body.filling && FILLINGS.indexOf(String(body.filling)) === -1) return "invalid_filling";
  if (String(body.inscription || "").length > 30) return "inscription_too_long";

  const weight = Number(body.weight_kg);
  if (!isFinite(weight) || weight < 1.5 || weight > 10 || Math.round(weight * 2) !== weight * 2) return "invalid_weight";
  const tiers = Number(body.tiers || 1);
  if (tiers !== 1 && tiers !== 2) return "invalid_tiers";
  if (tiers === 2 && weight < 3) return "two_tiers_require_3kg";

  const date = parseDate(body.event_date);
  if (!date) return "invalid_event_date";
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + 3);
  if (date < minDate) return "event_date_too_soon";
  if (body.consent !== "yes") return "consent_required";
  return "";
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getOrCreateSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("leads");
  if (!sheet) sheet = spreadsheet.insertSheet("leads");
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  const dataRows = Math.max(sheet.getMaxRows() - 1, 1);
  const statusColumn = HEADERS.indexOf("status") + 1;
  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sheet.getRange(2, statusColumn, dataRows, 1).setDataValidation(statusRule);
  const dataRange = sheet.getRange(2, 1, dataRows, HEADERS.length);
  const missingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=OR($A2="",$C2="",$D2="",$F2="",$G2="",$H2="")')
    .setBackground("#FCE8E6")
    .setRanges([dataRange])
    .build();
  const duplicateRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A2<>"",COUNTIF($A:$A,$A2)>1)')
    .setBackground("#F4CCCC")
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([missingRule, duplicateRule]);
  sheet.autoResizeColumns(1, HEADERS.length);
  return sheet;
}

function setupSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("Set Script Property SPREADSHEET_ID first.");
  getOrCreateSheet(SpreadsheetApp.openById(spreadsheetId));
}

function doGet() { return output({ok: true, service: "saharny-leads"}); }
function clean(value) { return String(value === undefined || value === null ? "" : value).trim().slice(0, MAX_TEXT_LENGTH); }
function output(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
