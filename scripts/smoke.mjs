import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractAttributionContext,
  renderScriptManagerSnippet,
  runAll
} from "../src/runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sampleConfig = JSON.parse(await readFile(join(root, "examples/sample-config.json"), "utf8"));
const expectedOutput = JSON.parse(await readFile(join(root, "examples/sample-output.json"), "utf8"));
const actualOutput = runAll(sampleConfig);

if (JSON.stringify(actualOutput, null, 2) !== JSON.stringify(expectedOutput, null, 2)) {
  console.error("Actual output did not match examples/sample-output.json");
  console.error(JSON.stringify(actualOutput, null, 2));
  process.exit(1);
}

const snippet = renderScriptManagerSnippet(sampleConfig);
const forbiddenTerms = [
  "f" + "etch(",
  "XML" + "HttpRequest",
  "send" + "Beacon",
  "Web" + "Socket",
  "Event" + "Source",
  "g" + "tag(",
  "f" + "bq(",
  "data" + "Layer.push"
];
for (const forbidden of forbiddenTerms) {
  if (snippet.includes(forbidden)) {
    throw new Error(`Snippet contains forbidden primitive: ${forbidden}`);
  }
}
if (!snippet.includes("localStorage") || !snippet.includes("adpages_order_attribution")) {
  throw new Error("Snippet must include browser storage and configured storage key");
}

const directVisit = extractAttributionContext({
  currentUrl: "https://store.example.com/helmets",
  capturedAt: "2026-05-24T10:35:00.000Z"
}, sampleConfig.capture);
if (directVisit.hasCampaignContext) {
  throw new Error("Direct visit without allowed parameters should not have campaign context");
}

try {
  extractAttributionContext({ currentUrl: "/relative-url" }, sampleConfig.capture);
  throw new Error("Expected relative URL validation to fail");
} catch (error) {
  if (!String(error.message).includes("absolute HTTP or HTTPS URL")) {
    throw error;
  }
}

console.log("bigcommerce order attribution smoke ok");
