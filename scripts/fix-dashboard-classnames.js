// Fix: Remove className="cursor-pointer" that was incorrectly added
// to custom React components (uppercase tagname) that already handle
// cursor styling internally (e.g. StatCard).
// Pattern: onClick={...} className="cursor-pointer" on the same line.

"use strict";

const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "frontend",
  "src",
  "app",
  "pages",
  "DashboardPage.tsx",
);
let src = fs.readFileSync(file, "utf8");
const before = src;

// Remove trailing ` className="cursor-pointer"` that was appended right after
// an onClick attribute value on the same line inside a component JSX tag.
// onClick={...} className="cursor-pointer"  →  onClick={...}
src = src.replace(/(onClick=\{[^}\n]*\})\s+className="cursor-pointer"/g, "$1");

if (src !== before) {
  fs.writeFileSync(file, src, "utf8");
  const n = (
    before.match(/(onClick=\{[^}\n]*\})\s+className="cursor-pointer"/g) || []
  ).length;
  console.log("Fixed DashboardPage.tsx —", n, "unwanted className removals");
} else {
  console.log("No changes needed");
}
