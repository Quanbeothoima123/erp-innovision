/**
 * Codemod: add cursor-pointer to JSX elements that have onClick but are NOT
 * native interactive elements (button, a, select, input, label, textarea).
 * Those are already handled by the global CSS rule in theme.css.
 *
 * Strategy:
 *  1. Use a character-level state machine to extract every JSX opening-tag span
 *     <Tagname … > or <Tagname … />
 *  2. For each opening tag:
 *     - skip if tagname is button | a | select | input | label | textarea
 *     - skip if no onClick prop
 *     - skip if className already contains cursor-pointer
 *     - otherwise:
 *       a) if className="…" or className={`…`} (simple string / template) – append cursor-pointer
 *       b) if no className at all – add className="cursor-pointer"
 *       c) complex className expressions – wrap as className={`${expr} cursor-pointer`}
 */

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "frontend", "src");
const exts = new Set([".tsx", ".jsx", ".ts", ".js"]);

// Native interactive tags handled globally by CSS — skip them in the codemod
const NATIVE_INTERACTIVE = new Set([
  "button",
  "a",
  "select",
  "input",
  "label",
  "textarea",
]);

// ─── helpers ──────────────────────────────────────────────────────────────────

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (stat.isFile() && exts.has(path.extname(p))) out.push(p);
  }
  return out;
}

/**
 * Given `src` and a start index that points to `<`, extract the full JSX
 * opening-tag span up to (and including) its closing `>` or `/>`.
 * Returns { end } (the index of the closing `>`) or null if parse failed.
 *
 * Handles:
 *  • nested JSX inside attributes:  icon={<Icon />}
 *  • string literals ' " and template literals `
 *  • nested { } depth
 */
function extractOpeningTag(src, start) {
  // start points to '<'
  let i = start + 1; // skip <

  // read tag name
  if (i >= src.length || !/[a-zA-Z$_]/.test(src[i])) return null;
  while (i < src.length && /[a-zA-Z0-9$_.:-]/.test(src[i])) i++;

  // Now parse attributes until we hit the matching '>' or '/>' at depth 0
  let depth = 0; // {} nesting
  let inStr = false;
  let strChar = "";
  let inTemplate = false;
  let templateDepth = 0; // ${ nesting inside template literals
  let jsxDepth = 0; // nested JSX inside {}

  while (i < src.length) {
    const ch = src[i];

    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === strChar) inStr = false;
      i++;
      continue;
    }

    if (inTemplate) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "`") {
        inTemplate = false;
        i++;
        continue;
      }
      if (ch === "$" && src[i + 1] === "{") {
        templateDepth++;
        depth++;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Normal parsing
    if (ch === '"' || ch === "'") {
      inStr = true;
      strChar = ch;
      i++;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      i++;
      continue;
    }

    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      depth--;
      if (depth < 0) return null; // malformed
      i++;
      continue;
    }

    if (depth === 0) {
      // Check for closing '>' or '/>'
      if (ch === "/" && src[i + 1] === ">") return { end: i + 1 };
      if (ch === ">") return { end: i };
      // A '<' at depth 0 in attribute position (rare but possible in TS generics
      // or arrow functions) – bail out to avoid misparse
      if (ch === "<") return null;
    }

    i++;
  }

  return null; // ran off end
}

/**
 * Add `cursor-pointer` to the className inside a JSX opening tag string.
 * Handles:
 *   className="a b c"            → className="a b c cursor-pointer"
 *   className={`a b c`}          → className={`a b c cursor-pointer`}
 *   className={expr}             → className={`${expr} cursor-pointer`}
 *   (no className)               → add className="cursor-pointer" before the trailing > or />
 */
function addCursorPointerToTag(tag) {
  // Skip if already present
  if (/\bcursor-pointer\b/.test(tag)) return tag;

  // 1. className="…"
  if (/\bclassName="[^"]*"/.test(tag)) {
    return tag.replace(/\bclassName="([^"]*)"/, (_, cls) => {
      const trimmed = cls.trim();
      return `className="${trimmed ? trimmed + " cursor-pointer" : "cursor-pointer"}"`;
    });
  }

  // 2. className={`…`}
  if (/\bclassName=\{`[^`]*`\}/.test(tag)) {
    return tag.replace(/\bclassName=\{`([^`]*)`\}/, (_, cls) => {
      const trimmed = cls.trim();
      return `className={\`${trimmed ? trimmed + " cursor-pointer" : "cursor-pointer"}\`}`;
    });
  }

  // 3. className={someExpression}  — wrap in template literal
  const classMatch = tag.match(/\bclassName=\{(.+)\}\s*(?=[a-zA-Z$_{/>])/);
  if (classMatch) {
    // Find the exact span of className={...} robustly
    const classIdx = tag.indexOf("className={");
    if (classIdx !== -1) {
      // Find the matching closing }
      let depth = 0;
      let j = classIdx + "className={".length - 1;
      let end = -1;
      let inS = false,
        sC = "";
      while (j < tag.length) {
        const c = tag[j];
        if (inS) {
          if (c === "\\") {
            j += 2;
            continue;
          }
          if (c === sC) inS = false;
        } else {
          if (c === '"' || c === "'") {
            inS = true;
            sC = c;
          } else if (c === "{") depth++;
          else if (c === "}") {
            depth--;
            if (depth === 0) {
              end = j;
              break;
            }
          }
        }
        j++;
      }
      if (end !== -1) {
        const expr = tag.slice(classIdx + "className={".length, end);
        const before = tag.slice(0, classIdx);
        const after = tag.slice(end + 1);
        return `${before}className={\`\${${expr}} cursor-pointer\`}${after}`;
      }
    }
  }

  // 4. No className at all — insert before trailing />, >, or last whitespace before >
  return tag.replace(/(\s*\/?>)$/, ' className="cursor-pointer"$1');
}

// ─── main transform ───────────────────────────────────────────────────────────

function processFile(src) {
  let result = "";
  let i = 0;
  let changed = false;

  while (i < src.length) {
    const ch = src[i];

    // Skip single-line comments
    if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      if (nl === -1) {
        result += src.slice(i);
        i = src.length;
      } else {
        result += src.slice(i, nl + 1);
        i = nl + 1;
      }
      continue;
    }

    // Skip block comments
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) {
        result += src.slice(i);
        i = src.length;
      } else {
        result += src.slice(i, end + 2);
        i = end + 2;
      }
      continue;
    }

    // Potential JSX opening tag
    if (ch === "<" && i + 1 < src.length && /[a-zA-Z$_]/.test(src[i + 1])) {
      const parsed = extractOpeningTag(src, i);
      if (parsed) {
        const { end } = parsed;
        const tagContent = src.slice(i, end + 1);
        const tagName =
          tagContent
            .match(/^<([a-zA-Z$_][a-zA-Z0-9$_.-]*)/)?.[1]
            ?.toLowerCase() ?? "";

        if (
          !NATIVE_INTERACTIVE.has(tagName) &&
          /\bonClick\b/.test(tagContent)
        ) {
          const updated = addCursorPointerToTag(tagContent);
          if (updated !== tagContent) changed = true;
          result += updated;
        } else {
          result += tagContent;
        }

        i = end + 1;
        continue;
      }
    }

    result += ch;
    i++;
  }

  return { result, changed };
}

// ─── entry ────────────────────────────────────────────────────────────────────

const files = walk(root);
let totalFiles = 0;
let totalTags = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const { result, changed } = processFile(src);
  if (changed) {
    fs.writeFileSync(file, result, "utf8");
    totalFiles++;
    // Count how many tags were changed
    let n = 0;
    let idx = 0;
    while ((idx = result.indexOf("cursor-pointer", idx)) !== -1) {
      n++;
      idx++;
    }
    console.log("Updated", path.relative(path.join(__dirname, ".."), file));
    totalTags++;
  }
}

console.log(`\nDone. Files updated: ${totalFiles}`);
