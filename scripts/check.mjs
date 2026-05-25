import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const requiredFiles = [
  "README.md",
  "PRIVACY.md",
  "PUBLISH_BLOCKERS.md",
  "package.json",
  "scripts/check.mjs",
  "scripts/smoke.mjs",
  "src/runtime.mjs",
  "snippets/script-manager-utm-capture.js",
  "docs/field-mapping.md",
  "examples/sample-config.json",
  "examples/sample-output.json"
];

const networkPattern = new RegExp([
  "f" + "etch\\s*\\(",
  "XML" + "HttpRequest",
  "send" + "Beacon",
  "Web" + "Socket",
  "Event" + "Source",
  "node:" + "https",
  "node:" + "http"
].join("|"), "i");
const analyticsPattern = /\b(gtag|fbq|hj|clarity)\s*\(|dataLayer\.push|analytics\.track/i;
const credentialPattern = new RegExp([
  "api[_-]?" + "key\\s*[=:]",
  "secret\\s*[=:]",
  "token\\s*[=:]",
  "private" + "_key",
  "client" + "_secret"
].join("|"), "i");

const files = await listFiles(root);
const fileSet = new Set(files.map((file) => relative(root, file)));
const contents = new Map();

for (const file of requiredFiles) {
  const fullPath = join(root, file);
  const fileStat = await stat(fullPath);
  assert(fileStat.isFile(), `${file} is required`);
  const text = await readFile(fullPath, "utf8");
  assert(text.trim().length > 0, `${file} must not be empty`);
  assert(fileSet.has(file), `${file} must be inside the kit`);
  contents.set(file, text);
}

const packageJson = JSON.parse(contents.get("package.json"));
assert(packageJson.private === true, "package must remain private");
assert(packageJson.type === "module", "package must use ESM");
assert(packageJson.scripts?.check === "node scripts/check.mjs", "check script is required");
assert(packageJson.scripts?.smoke === "node scripts/smoke.mjs", "smoke script is required");
assert(Object.keys(packageJson.dependencies ?? {}).length === 0, "dependencies must stay empty");
assert(Object.keys(packageJson.devDependencies ?? {}).length === 0, "devDependencies must stay empty");

JSON.parse(contents.get("examples/sample-config.json"));
const expectedOutput = JSON.parse(contents.get("examples/sample-output.json"));
assert(expectedOutput.capturePlan?.platform === "BigCommerce", "sample output must target BigCommerce");
assert(expectedOutput.attributionContext?.hasCampaignContext === true, "sample output must include campaign context");

const readme = contents.get("README.md");
assert(readme.includes("not a BigCommerce App Marketplace submission"), "README must avoid marketplace readiness claims");
assert(readme.includes("No network calls"), "README must disclose offline behavior");
assert(readme.includes("No analytics"), "README must disclose no analytics behavior");

const blockers = contents.get("PUBLISH_BLOCKERS.md");
assert(blockers.includes("BigCommerce App Marketplace"), "publish blockers must discuss BigCommerce App Marketplace");
assert(blockers.includes("OAuth"), "publish blockers must mention OAuth/install work");
assert(blockers.includes("review and approval"), "publish blockers must mention review and approval");

const privacy = contents.get("PRIVACY.md");
assert(privacy.includes("does not make network calls"), "privacy must disclose no network behavior");
assert(privacy.includes("does not include hidden tracking"), "privacy must disclose no hidden tracking");

for (const file of files.filter((path) => /\.(mjs|js)$/.test(path))) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    process.stderr.write(check.stderr || check.stdout);
    process.exit(check.status || 1);
  }

  const text = await readFile(file, "utf8");
  assert(!networkPattern.test(text), `${relative(root, file)} must not include network primitives`);
  assert(!analyticsPattern.test(text), `${relative(root, file)} must not include analytics primitives`);
  assert(!credentialPattern.test(text), `${relative(root, file)} must not include credential patterns`);
}

console.log(`bigcommerce order attribution check ok (${requiredFiles.length} required files, ${files.length} total files)`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listFiles(path));
    } else {
      results.push(path);
    }
  }

  return results;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
