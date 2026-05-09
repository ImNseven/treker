/**
 * Copies public/ and .next/static into .next/standalone/ so that
 * `node .next/standalone/server.js` serves static assets correctly.
 * Run automatically after `next build` via the `build` npm script.
 */
import { cpSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("No .next/standalone directory found — skipping copy.");
  process.exit(0);
}

cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
cpSync(
  join(root, ".next", "static"),
  join(standalone, ".next", "static"),
  { recursive: true }
);

console.log("✓ Copied public/ and .next/static into .next/standalone/");
