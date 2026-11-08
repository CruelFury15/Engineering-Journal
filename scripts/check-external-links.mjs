
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const TIMEOUT_MS = 10000;
const CONCURRENCY = 5;

const externalUrls = new Set();
console.log("Extracted external URLs:");
const results = [];

if (!fs.existsSync(DIST)) {
  console.error("ERROR: dist directory not found. Run npm run build first.");
  process.exit(1);
}

function walk(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Extract external URLs from generated HTML.
for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, "utf8");

  const matches = html.matchAll(
    /\b(?:href|src)=["'](https?:\/\/[^"']+)["']/gi
  );

  for (const match of matches) {
    try {
      const url = new URL(match[1]);
const internalHosts = [
  "engineering-journal.apexfury.workers.dev",
];

if (
  !internalHosts.includes(url.hostname) &&
  !["localhost", "127.0.0.1"].includes(url.hostname)
) {
  externalUrls.add(url.href);
}
    } catch {
      console.warn(`Invalid URL ignored: ${match[1]}`);
    }
  }
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "EngineeringJournal-LinkChecker/1.0",
      },
    });

    // Some servers reject HEAD requests. Retry with GET.
    if ([403, 405, 501].includes(response.status)) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "EngineeringJournal-LinkChecker/1.0",
        },
      });
    }

    return {
      url,
      status: response.status,
      finalUrl: response.url,
      redirected: response.redirected,
      ok: response.ok,
    };
  } catch (error) {
    return {
      url,
      error: error.name === "AbortError" ? "Timeout" : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
console.log([...externalUrls].join("\n"));
const urls = [...externalUrls];
let index = 0;

async function worker() {
  while (index < urls.length) {
    const currentIndex = index++;
    const result = await checkUrl(urls[currentIndex]);
    results.push(result);
  }
}

await Promise.all(
  Array.from(
    { length: Math.min(CONCURRENCY, urls.length) },
    () => worker()
  )
);
console.log("\nINDIVIDUAL URL RESULTS:");

for (const result of results) {
  console.log({
    url: result.url,
    status: result.status ?? "N/A",
    working: result.ok ?? false,
    redirected: result.redirected ?? false,
    error: result.error ?? null,
    finalUrl: result.finalUrl ?? null,
  });
}
const working = results.filter(result => result.ok);

const restricted = results.filter(
  result => [403, 999].includes(result.status)
);

const broken = results.filter(
  result =>
    result.status >= 400 &&
    result.status < 600 &&
    ![403, 999].includes(result.status)
);

const redirected = results.filter(result => result.redirected);
const failed = results.filter(result => result.error);

console.log("\nENGINEERING JOURNAL — EXTERNAL LINK AUDIT\n");
console.log(`External URLs found: ${urls.length}`);
console.log(`Working links:       ${working.length}`);
console.log(`Broken links:        ${broken.length}`);
console.log(`Redirected links:    ${redirected.length}`);
console.log(`Network errors:      ${failed.length}`);
console.log(`Restricted links:   ${restricted.length}`);
if (restricted.length) {
  console.log("\nRESTRICTED LINKS:");

  for (const result of restricted) {
    console.log(`${result.status} ${result.url}`);
  }
}
if (broken.length) {
  console.log("\nHTTP ERRORS:");

  for (const result of broken) {
    console.log(`${result.status} ${result.url}`);
  }
}

if (redirected.length) {
  console.log("\nREDIRECTED LINKS:");

  for (const result of redirected) {
    console.log(`${result.url} -> ${result.finalUrl}`);
  }
}

if (failed.length) {
  console.log("\nNETWORK ERRORS:");

  for (const result of failed) {
    console.log(`${result.error}: ${result.url}`);
  }
}

console.log("\nExternal link audit completed.");
