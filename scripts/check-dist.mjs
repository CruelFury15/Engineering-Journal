
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const errors = [];
const checked = new Set();

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
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function validateReference(reference, sourceFile) {
  if (
    !reference ||
    reference.startsWith("#") ||
    /^(https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(reference)
  ) {
    return;
  }

  let cleanReference;

  try {
    cleanReference = decodeURIComponent(reference.split(/[?#]/)[0]);
  } catch {
    errors.push(`Invalid URL encoding: ${reference}`);
    return;
  }

  if (!cleanReference) return;

  const target = cleanReference.startsWith("/")
    ? path.resolve(DIST, `.${cleanReference}`)
    : path.resolve(path.dirname(sourceFile), cleanReference);

  const relativeTarget = path.relative(DIST, target);

  if (
    relativeTarget.startsWith("..") ||
    path.isAbsolute(relativeTarget)
  ) {
    errors.push(`Outside dist: ${reference}`);
    return;
  }

  if (checked.has(target)) return;
  checked.add(target);

  const candidates = [
    target,
    path.join(target, "index.html"),
    `${target}.html`,
  ];

  if (!candidates.some(candidate => fs.existsSync(candidate))) {
    errors.push(
      `Missing: ${reference} in ${path.relative(DIST, sourceFile)}`
    );
  }
}

const files = walk(DIST);
const htmlFiles = files.filter(file => file.endsWith(".html"));
const cssFiles = files.filter(file => file.endsWith(".css"));

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, "utf8");

  // Standard HTML references
  const references = [
    ...html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi),
  ];

  for (const match of references) {
    validateReference(match[1], htmlFile);
  }

  // Responsive image references
  const srcsets = [
    ...html.matchAll(/\bsrcset=["']([^"']+)["']/gi),
  ];

  for (const match of srcsets) {
    for (const candidate of match[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      validateReference(url, htmlFile);
    }
  }
}

// CSS url(...) references
for (const cssFile of cssFiles) {
  const css = fs.readFileSync(cssFile, "utf8");

  const cssReferences = [
    ...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi),
  ];

  for (const match of cssReferences) {
    validateReference(match[1].trim(), cssFile);
  }
}

console.log("\nENGINEERING JOURNAL — DIST VALIDATION\n");
console.log(`HTML pages checked: ${htmlFiles.length}`);
console.log(`CSS files checked: ${cssFiles.length}`);
console.log(`Unique references checked: ${checked.size}`);
console.log(`Errors found: ${errors.length}`);

if (errors.length > 0) {
  console.error("\nFAIL — Missing or invalid references:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log("\nPASS — No missing local references detected.");
