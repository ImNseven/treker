// Load .env.development.local into process.env, then run any command.
// Used to bridge Prisma CLI (which only reads .env by default) with our
// local SQLite settings stored in .env.development.local.
import { readFileSync } from "fs";
import { spawn } from "child_process";

try {
  const text = readFileSync(".env.development.local", "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
} catch (e) {
  console.error("Could not read .env.development.local:", e.message);
  process.exit(1);
}

const [, , cmd, ...rest] = process.argv;
if (!cmd) {
  console.error("Usage: node scripts/with-dev-env.mjs <command> [args...]");
  process.exit(1);
}

const child = spawn(cmd, rest, { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 1));
