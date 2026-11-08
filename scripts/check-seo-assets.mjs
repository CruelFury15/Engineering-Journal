
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const DOMAIN = "https://engineering-journal.apexfury.workers.dev";

const errors = [];

function fail(message) {
  errors.push(message);
}

function decodeXml(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function parseXml(file) {
  const content = fs.readFileSync(file, "utf8");

  if (!content.startsWith("<?xml")) {
    fail(`${path.basename(file)}: Missing XML declaration`);
  }

  if (!/<\/?[a-zA-Z][^>]*>/.test(content)) {
    fail(`${path.basename(file)}: Invalid XML structure`);
  }

  const tags = content.match(/<\/?([a-zA-Z][\w:.-]*)\b[^>]*>/g) || [];
  const stack = [];

  for (const tag of tags) {
    if (tag.startsWith("<?") || tag.startsWith("<!")) continue;

    const name = tag.match(/^<\/?([a-zA-Z][\w:.-]*)/)[1];

    if (tag.startsWith("</")) {
      if (stack.pop() !== name) {
        fail(`${path.basename(file)}: Mismatched XML tag ${name}`);
        return content;
      }
    } else if (!tag.endsWith("/>")) {
      stack.push(name);
    }
  }

  if (stack.length) {
    fail(`${path.basename(file)}: Unclosed XML tags`);
  }

  return content;
}

function validateProductionUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.origin !== DOMAIN ||
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      fail(`Unexpected production URL: ${url}`);
      return null;
    }

    return parsedUrl;
  } catch {
    fail(`Invalid sitemap URL: ${url}`);
    return null;
  }
}

function routeExists(url) {
  const parsedUrl = validateProductionUrl(url);

  if (!parsedUrl) return false;

  let relative;

  try {
    relative = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, "");
  } catch {
    fail(`Invalid URL path encoding: ${url}`);
    return false;
  }

  const candidates = [
    path.join(DIST, relative, "index.html"),
    path.join(DIST, relative + ".html"),
    path.join(DIST, relative || "index.html"),
  ];

  return candidates.some(file => {
    const resolved = path.resolve(file);

    return (
      resolved.startsWith(DIST + path.sep) ||
      resolved === path.join(DIST, "index.html")
    ) && fs.existsSync(resolved);
  });
}

console.log("\nENGINEERING JOURNAL — SEO ASSET AUDIT\n");

const rssPath = path.join(DIST, "rss.xml");
const sitemapIndexPath = path.join(DIST, "sitemap-index.xml");
const sitemapPath = path.join(DIST, "sitemap-0.xml");
const robotsPath = path.join(DIST, "robots.txt");

for (const file of [
  rssPath,
  sitemapIndexPath,
  sitemapPath,
  robotsPath,
]) {
  if (!fs.existsSync(file)) {
    fail(`Missing file: ${path.basename(file)}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const rss = parseXml(rssPath);
const sitemapIndex = parseXml(sitemapIndexPath);
const sitemap = parseXml(sitemapPath);

const robots = fs.readFileSync(robotsPath, "utf8");

const articleCount = (rss.match(/<item>/g) || []).length;

const sitemapUrls = [
  ...sitemap.matchAll(/<loc>(.*?)<\/loc>/g),
].map(match => decodeXml(match[1]));

const indexUrls = [
  ...sitemapIndex.matchAll(/<loc>(.*?)<\/loc>/g),
].map(match => decodeXml(match[1]));

console.log(`RSS articles: ${articleCount}`);
console.log(`Sitemap URLs: ${sitemapUrls.length}`);
console.log(`Sitemap index entries: ${indexUrls.length}`);

if (!rss.includes("<rss") || !rss.includes("</rss>")) {
  fail("RSS root element is invalid");
}

// Validate sitemap index references and their generated files.
for (const url of indexUrls) {
  if (!routeExists(url)) {
    fail(`Sitemap index references missing file: ${url}`);
  }
}

// Validate sitemap routes against generated HTML files.
for (const url of sitemapUrls) {
  if (!routeExists(url)) {
    fail(`Sitemap route missing from dist: ${url}`);
  }
}

if (!robots.includes(`Sitemap: ${DOMAIN}/sitemap-index.xml`)) {
  fail("robots.txt does not reference the production sitemap index");
}

if (errors.length) {
  console.error("\nFAIL — SEO asset validation errors:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log("\nPASS — SEO asset checks completed.");
