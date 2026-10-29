/**
 * Builds lambda/ppt-export/ppt-export.zip for AWS Lambda (Node.js 22, x86_64):
 * the handler and the shared export code bundled into index.js, plus sharp
 * installed for Linux (its native binary cannot be bundled).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "lambda/ppt-export");
const dist = path.join(dir, "dist");
const zip = path.join(dir, "ppt-export.zip");

fs.rmSync(dist, { recursive: true, force: true });
fs.rmSync(zip, { force: true });
fs.mkdirSync(dist, { recursive: true });

await build({
  entryPoints: [path.join(dir, "handler.ts")],
  outfile: path.join(dist, "index.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  tsconfig: path.join(root, "tsconfig.json"),
  alias: { "next/server": path.join(dir, "next-server-shim.ts") },
  external: ["sharp"],
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

const sharpVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules/sharp/package.json"), "utf8")).version;
fs.writeFileSync(path.join(dist, "package.json"), JSON.stringify({ private: true, dependencies: { sharp: sharpVersion } }, null, 2));
execSync("npm install --omit=dev --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc", { cwd: dist, stdio: "inherit" });

if (process.platform === "win32") {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dist}\\*' -DestinationPath '${zip}'"`, { stdio: "inherit" });
} else {
  execSync(`zip -qr "${zip}" .`, { cwd: dist, stdio: "inherit" });
}
console.log(`ppt-export: ${path.relative(root, zip)} (${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB)`);
