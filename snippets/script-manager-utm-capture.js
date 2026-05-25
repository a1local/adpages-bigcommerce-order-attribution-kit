/*
 * AdPages BigCommerce Script Manager UTM capture snippet.
 *
 * Edit CONFIG before pasting into BigCommerce Script Manager. This snippet keeps
 * campaign context in browser storage and only fills merchant-created fields
 * whose selectors match CONFIG.fieldSelectors.
 */
(function () {
  "use strict";

  var CONFIG = {
    storageKey: "adpages_order_attribution",
    retentionDays: 30,
    allowedParameters: [
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
    ],
    fieldSelectors: {
      utm_source: "[data-adpages-attribution-field=\"utm_source\"]",
      utm_medium: "[data-adpages-attribution-field=\"utm_medium\"]",
      utm_campaign: "[data-adpages-attribution-field=\"utm_campaign\"]",
      utm_term: "[data-adpages-attribution-field=\"utm_term\"]",
      utm_content: "[data-adpages-attribution-field=\"utm_content\"]",
      gclid: "[data-adpages-attribution-field=\"gclid\"]",
      gbraid: "[data-adpages-attribution-field=\"gbraid\"]",
      wbraid: "[data-adpages-attribution-field=\"wbraid\"]",
      fbclid: "[data-adpages-attribution-field=\"fbclid\"]",
      msclkid: "[data-adpages-attribution-field=\"msclkid\"]",
      ttclid: "[data-adpages-attribution-field=\"ttclid\"]",
      landing_page: "[data-adpages-attribution-field=\"landing_page\"]",
      referrer: "[data-adpages-attribution-field=\"referrer\"]",
      captured_at: "[data-adpages-attribution-field=\"captured_at\"]"
    }
  };

  var CLICK_ID_PARAMETERS = {
    gclid: true,
    gbraid: true,
    wbraid: true,
    fbclid: true,
    msclkid: true,
    ttclid: true
  };

  function clean(value) {
    return String(value || "").trim();
  }

  function readPayload() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKey) || "null");
    } catch (error) {
      return null;
    }
  }

  function writePayload(payload) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
  }

  function contextFromLocation() {
    var search = new URLSearchParams(window.location.search);
    var campaign = {};
    var clickIds = {};

    CONFIG.allowedParameters.forEach(function (parameter) {
      var value = clean(search.get(parameter));
      if (!value) {
        return;
      }
      if (parameter.indexOf("utm_") === 0) {
        campaign[parameter] = value;
      }
      if (CLICK_ID_PARAMETERS[parameter]) {
        clickIds[parameter] = value;
      }
    });

    return {
      landing_page: window.location.origin + window.location.pathname,
      referrer: document.referrer || "",
      captured_at: new Date().toISOString(),
      campaign: campaign,
      clickIds: clickIds
    };
  }

  function hasCampaignContext(context) {
    return Object.keys(context.campaign).length > 0 || Object.keys(context.clickIds).length > 0;
  }

  function flattenContext(context) {
    return Object.assign({}, context.campaign, context.clickIds, {
      landing_page: context.landing_page,
      referrer: context.referrer,
      captured_at: context.captured_at
    });
  }

  function capture() {
    var context = contextFromLocation();
    var existing = readPayload() || {};

    if (!hasCampaignContext(context)) {
      return existing;
    }

    var payload = {
      firstTouch: existing.firstTouch || context,
      lastTouch: context,
      expiresAt: Date.now() + CONFIG.retentionDays * 86400000
    };

    writePayload(payload);
    return payload;
  }

  function populateFields(payload) {
    if (!payload || !payload.lastTouch) {
      return;
    }

    var values = flattenContext(payload.lastTouch);
    Object.keys(CONFIG.fieldSelectors).forEach(function (parameter) {
      var selector = CONFIG.fieldSelectors[parameter];
      var value = values[parameter];
      if (!selector || !value) {
        return;
      }

      document.querySelectorAll(selector).forEach(function (field) {
        field.value = value;
        field.setAttribute("data-adpages-filled", "true");
      });
    });
  }

  window.AdPagesOrderAttribution = {
    read: readPayload,
    clear: function () {
      localStorage.removeItem(CONFIG.storageKey);
    },
    populate: function () {
      populateFields(readPayload());
    }
  };

  var payload = capture();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      populateFields(payload);
    });
  } else {
    populateFields(payload);
  }
}());
