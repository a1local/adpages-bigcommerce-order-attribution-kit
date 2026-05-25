# AdPages BigCommerce Order Attribution Kit

Dependency-free BigCommerce resource kit for merchants and agencies that need a practical way to carry UTM and click-id context into checkout/order review workflows.

This is a publishable resource/tutorial scaffold, not a BigCommerce App Marketplace submission. It does not install as an app, request API scopes, create checkout fields, write orders, or claim App Marketplace readiness.

## Included

- Script Manager UTM/click-id capture snippet for storefront pages.
- Offline runtime helpers for campaign context extraction, field mapping, and order review summaries.
- Field mapping guide for checkout custom fields, order comments, and staff review workflows.
- Sample config and expected output used by local smoke tests.
- Local check and smoke scripts with no npm dependencies.

## Not Included

- No network calls.
- No BigCommerce API calls, app OAuth flow, or credentials.
- No analytics, pixels, beacons, enrichment, scraping, or background collection.
- No automatic order mutation or checkout-field creation.
- No App Marketplace listing assets or review claim.

## Files

- `src/runtime.mjs` contains dependency-free helpers for mapping campaign context.
- `snippets/script-manager-utm-capture.js` is a merchant-editable Script Manager snippet.
- `docs/field-mapping.md` documents recommended field names and operational workflow.
- `examples/sample-config.json` is the sample merchant setup.
- `examples/sample-output.json` is the expected runtime output for smoke tests.
- `scripts/check.mjs` validates required files, package metadata, syntax, and safety constraints.
- `scripts/smoke.mjs` verifies runtime behavior against the sample output.

## Usage

Run checks from this kit directory:

```bash
npm run check
npm run smoke
```

Use `examples/sample-config.json` to plan the merchant field names, selectors, and order review labels. Then adapt `snippets/script-manager-utm-capture.js` inside BigCommerce Script Manager. The snippet stores first-touch and last-touch campaign context in browser storage and can populate merchant-created fields when matching selectors exist.

## Implementation Notes

Treat this as a low-risk operational bridge, not a source of truth by itself. A production app would need BigCommerce authentication, storefront script registration, declared scopes if API access is required, support assets, privacy/legal review, and marketplace approval before it can be described as a BigCommerce app.

## Publisher

Built by [AdPages from A1 Local](https://a1local.com.au/extensions/) as a free, dependency-light resource for local-service marketers, web designers, and small business site owners.
