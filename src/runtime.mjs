const DEFAULT_ALLOWED_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid"
];

const GENERATED_REVIEW_FIELDS = [
  "landing_page",
  "referrer",
  "captured_at"
];

const CLICK_ID_PARAMETERS = new Set([
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid"
]);

export function runAll(config = {}) {
  return {
    capturePlan: buildCapturePlan(config),
    attributionContext: extractAttributionContext(config.sampleRequest, config.capture),
    orderReviewRows: buildOrderReviewRows(config),
    merchantChecklist: buildMerchantChecklist(config)
  };
}

export function buildCapturePlan(config = {}) {
  const capture = config.capture || {};
  const fieldMapping = buildFieldMapping(config);

  return {
    platform: "BigCommerce",
    kit: "adpages-order-attribution-kit",
    placement: "Storefront > Script Manager",
    storeName: cleanText(config.store?.name) || "Unnamed store",
    storageKey: cleanText(capture.storageKey) || "adpages_order_attribution",
    retentionDays: toPositiveInteger(capture.retentionDays, 30),
    allowedParameters: normalizeAllowedParameters(capture.allowedParameters),
    fieldCount: fieldMapping.length,
    notes: [
      "Captures browser-side campaign context only.",
      "Does not call BigCommerce APIs or external endpoints.",
      "Order review values require merchant-created checkout fields or a manual staff workflow."
    ]
  };
}

export function extractAttributionContext(input = {}, capture = {}) {
  const currentUrl = requireAbsoluteUrl(input.currentUrl || input.url, "sampleRequest.currentUrl");
  const allowedParameters = normalizeAllowedParameters(capture.allowedParameters);
  const campaign = {};
  const clickIds = {};

  for (const parameter of allowedParameters) {
    const value = cleanText(currentUrl.searchParams.get(parameter));
    if (!value) {
      continue;
    }

    if (parameter.startsWith("utm_")) {
      campaign[parameter] = value;
    } else if (CLICK_ID_PARAMETERS.has(parameter)) {
      clickIds[parameter] = value;
    }
  }

  return {
    landingPage: `${currentUrl.origin}${currentUrl.pathname}`,
    referrer: cleanText(input.referrer),
    capturedAt: cleanText(input.capturedAt) || null,
    campaign,
    clickIds,
    hasCampaignContext: Object.keys(campaign).length > 0 || Object.keys(clickIds).length > 0
  };
}

export function buildFieldMapping(config = {}) {
  const capture = config.capture || {};
  const overrides = config.fieldMappings || {};
  const fields = [
    ...normalizeAllowedParameters(capture.allowedParameters),
    ...GENERATED_REVIEW_FIELDS
  ];

  return fields.map((parameter) => {
    const override = overrides[parameter] || {};
    return {
      parameter,
      checkoutSelector: cleanText(override.selector) || `[data-adpages-attribution-field="${parameter}"]`,
      bigCommerceTarget: cleanText(override.bigCommerceField) || defaultBigCommerceTarget(parameter),
      orderReviewLabel: cleanText(override.reviewLabel) || toTitleLabel(parameter)
    };
  });
}

export function buildOrderReviewRows(config = {}) {
  const context = extractAttributionContext(config.sampleRequest, config.capture);
  const values = buildAttributionValueMap(context);

  return buildFieldMapping(config)
    .map((mapping) => ({
      ...mapping,
      sampleValue: values[mapping.parameter] || ""
    }))
    .filter((row) => row.sampleValue);
}

export function buildMerchantChecklist(config = {}) {
  const fieldCount = buildFieldMapping(config).length;
  const url = cleanText(config.sampleRequest?.currentUrl) || "a known campaign URL";

  return [
    "Install the Script Manager snippet on storefront pages where campaigns land.",
    `Create or confirm ${fieldCount} checkout/order review fields before relying on staff reporting.`,
    `Place test traffic on ${url} and compare captured values against the order review workflow.`,
    "Document how staff handle missing campaign values before launch.",
    "Complete BigCommerce App Marketplace requirements before describing this as an app."
  ];
}

export function renderScriptManagerSnippet(config = {}) {
  const capturePlan = buildCapturePlan(config);
  const fieldSelectors = Object.fromEntries(
    buildFieldMapping(config).map((field) => [field.parameter, field.checkoutSelector])
  );
  const snippetConfig = {
    storageKey: capturePlan.storageKey,
    retentionDays: capturePlan.retentionDays,
    allowedParameters: capturePlan.allowedParameters,
    fieldSelectors
  };

  return [
    "(function () {",
    "  \"use strict\";",
    `  var config = ${JSON.stringify(snippetConfig, null, 2).replace(/\n/g, "\n  ")};`,
    "  var clickIdParameters = { gclid: true, gbraid: true, wbraid: true, fbclid: true, msclkid: true, ttclid: true };",
    "  function clean(value) { return String(value || \"\").trim(); }",
    "  function readPayload() { try { return JSON.parse(localStorage.getItem(config.storageKey) || \"null\"); } catch (error) { return null; } }",
    "  function writePayload(payload) { localStorage.setItem(config.storageKey, JSON.stringify(payload)); }",
    "  function currentLandingPage() { return window.location.origin + window.location.pathname; }",
    "  function contextFromLocation() {",
    "    var search = new URLSearchParams(window.location.search);",
    "    var campaign = {};",
    "    var clickIds = {};",
    "    config.allowedParameters.forEach(function (parameter) {",
    "      var value = clean(search.get(parameter));",
    "      if (!value) return;",
    "      if (parameter.indexOf(\"utm_\") === 0) campaign[parameter] = value;",
    "      if (clickIdParameters[parameter]) clickIds[parameter] = value;",
    "    });",
    "    return { landing_page: currentLandingPage(), referrer: document.referrer || \"\", captured_at: new Date().toISOString(), campaign: campaign, clickIds: clickIds };",
    "  }",
    "  function hasContext(context) { return Object.keys(context.campaign).length > 0 || Object.keys(context.clickIds).length > 0; }",
    "  function flatten(context) { return Object.assign({}, context.campaign, context.clickIds, { landing_page: context.landing_page, referrer: context.referrer, captured_at: context.captured_at }); }",
    "  function capture() {",
    "    var context = contextFromLocation();",
    "    var existing = readPayload() || {};",
    "    if (!hasContext(context)) return existing;",
    "    var payload = { firstTouch: existing.firstTouch || context, lastTouch: context, expiresAt: Date.now() + config.retentionDays * 86400000 };",
    "    writePayload(payload);",
    "    return payload;",
    "  }",
    "  function populate(payload) {",
    "    if (!payload || !payload.lastTouch) return;",
    "    var values = flatten(payload.lastTouch);",
    "    Object.keys(config.fieldSelectors).forEach(function (parameter) {",
    "      var selector = config.fieldSelectors[parameter];",
    "      var value = values[parameter];",
    "      if (!selector || !value) return;",
    "      document.querySelectorAll(selector).forEach(function (field) { field.value = value; field.setAttribute(\"data-adpages-filled\", \"true\"); });",
    "    });",
    "  }",
    "  window.AdPagesOrderAttribution = { read: readPayload, clear: function () { localStorage.removeItem(config.storageKey); }, populate: function () { populate(readPayload()); } };",
    "  var payload = capture();",
    "  if (document.readyState === \"loading\") document.addEventListener(\"DOMContentLoaded\", function () { populate(payload); });",
    "  else populate(payload);",
    "}());"
  ].join("\n");
}

export function buildAttributionValueMap(context = {}) {
  return {
    ...context.campaign,
    ...context.clickIds,
    landing_page: cleanText(context.landingPage),
    referrer: cleanText(context.referrer),
    captured_at: cleanText(context.capturedAt)
  };
}

function normalizeAllowedParameters(value) {
  const list = Array.isArray(value) && value.length > 0 ? value : DEFAULT_ALLOWED_PARAMETERS;
  const seen = new Set();
  const normalized = [];

  for (const item of list) {
    const parameter = cleanText(item).toLowerCase();
    if (!parameter || seen.has(parameter)) {
      continue;
    }
    seen.add(parameter);
    normalized.push(parameter);
  }

  return normalized;
}

function requireAbsoluteUrl(value, label) {
  const text = cleanText(value);
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return url;
  } catch {
    throw new TypeError(`${label} must be an absolute HTTP or HTTPS URL`);
  }
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function toPositiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function defaultBigCommerceTarget(parameter) {
  if (GENERATED_REVIEW_FIELDS.includes(parameter)) {
    return `Internal order review field: ${toTitleLabel(parameter)}`;
  }
  return `Checkout custom field: ${toTitleLabel(parameter)}`;
}

function toTitleLabel(value) {
  return cleanText(value)
    .replace(/^utm_/, "campaign_")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
