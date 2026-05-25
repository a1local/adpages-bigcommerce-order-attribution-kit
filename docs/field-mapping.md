# BigCommerce Field Mapping

Use this mapping when a merchant wants campaign context visible during checkout QA, staff review, or post-order reporting. The kit does not create fields or write to orders. It only provides naming conventions and a Script Manager snippet that can populate fields the merchant already created.

## Query Parameters

| Parameter | Suggested label | Suggested target | Notes |
| --- | --- | --- | --- |
| `utm_source` | Campaign source | Checkout custom field or staff review field | Example: `google`, `facebook`, `newsletter`. |
| `utm_medium` | Campaign medium | Checkout custom field or staff review field | Example: `cpc`, `paid_social`, `email`. |
| `utm_campaign` | Campaign name | Checkout custom field or staff review field | Keep names stable across ads and landing pages. |
| `utm_term` | Campaign term | Optional staff review field | Useful for search campaigns. |
| `utm_content` | Campaign content | Optional staff review field | Useful for creative or ad variation labels. |
| `gclid` | Google click ID | Optional staff review field | Store only when the merchant has a clear operational reason. |
| `gbraid` | Google app/browser click ID | Optional staff review field | Useful for iOS campaign diagnostics. |
| `wbraid` | Google web-to-app click ID | Optional staff review field | Useful for iOS campaign diagnostics. |
| `fbclid` | Meta click ID | Optional staff review field | Store only when approved by the merchant. |
| `msclkid` | Microsoft click ID | Optional staff review field | Store only when approved by the merchant. |
| `ttclid` | TikTok click ID | Optional staff review field | Store only when approved by the merchant. |

## Generated Fields

| Field | Suggested label | Notes |
| --- | --- | --- |
| `landing_page` | Landing page | Captured without the query string so staff can identify the entry page. |
| `referrer` | Referrer | Browser referrer when available. It can be blank. |
| `captured_at` | Captured at | ISO timestamp used for QA and retention checks. |

## BigCommerce Setup Notes

1. Add only the fields the merchant genuinely needs.
2. Use explicit selectors such as `[data-adpages-attribution-field="utm_campaign"]` on merchant-created inputs.
3. Add the snippet through BigCommerce Script Manager for storefront pages where campaigns land.
4. Place a test order from a URL with known UTM values.
5. Compare checkout/order review values against `examples/sample-output.json` style rows.
6. Document the staff workflow for blank, direct, or returning-visitor orders.

Avoid using campaign values as customer-facing claims. They are operational context, not proof of ad performance.
