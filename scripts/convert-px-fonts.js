const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "frontend", "src");
const exts = new Set([".tsx", ".ts", ".jsx", ".js", ".html", ".css"]);

const defaults = {
  12: "text-xs",
  14: "text-sm",
  16: "text-base",
  18: "text-lg",
  20: "text-xl",
  24: "text-2xl",
  30: "text-3xl",
  36: "text-4xl",
  48: "text-5xl",
  60: "text-6xl",
};

function toRem(px) {
  const rem = px / 16;
  // trim trailing zeros
  let s = parseFloat(rem.toFixed(4)).toString();
  return s;
}

function mapPxToClass(px) {
  px = parseInt(px, 10);
  if (defaults[px]) return defaults[px];
  return `text-[${toRem(px)}rem]`;
}

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) files.push(...walk(p));
    else if (stat.isFile() && exts.has(path.extname(p))) files.push(p);
  }
  return files;
}

const files = walk(root);
let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let orig = src;

  // Replace Tailwind arbitrary pixel font-sizes: text-[NNpx]
  src = src.replace(/text-\[(\d+)px\]/g, (_, px) => {
    totalReplacements++;
    return mapPxToClass(px);
  });

  // Replace inline style fontSize: 'NNpx' or "NNpx"
  src = src.replace(/fontSize\s*:\s*(['\"])(\d+)px\1/g, (_, quote, px) => {
    totalReplacements++;
    return `fontSize: ${quote}${toRem(px)}rem${quote}`;
  });

  // Replace style={{ fontSize: 'NNpx' }} with double-brace patterns (already covered)

  if (src !== orig) {
    fs.writeFileSync(file, src, "utf8");
    totalFiles++;
    console.log("Updated", file);
  }
}

console.log(
  "Done. Files updated:",
  totalFiles,
  "Replacements:",
  totalReplacements,
);
