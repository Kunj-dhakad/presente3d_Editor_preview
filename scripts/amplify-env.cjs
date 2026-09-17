/**
 * Amplify build step: writes the app's settings into .env.production so the
 * Next.js server can read them at runtime (Amplify does not pass console values
 * to the SSR runtime on its own).
 *
 *   Environment variables (Amplify console > Environment variables) -> SETTINGS
 *   Secrets (Amplify console > Secrets, stored in SSM)              -> SECRETS
 *
 * Amplify hands secrets to the build as one JSON string in $secrets. Only the
 * names listed here are written, so nothing else from the build machine leaks
 * into the bundle. Values are never printed.
 */
const fs = require("node:fs");

const SETTINGS = [
  "MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_DATABASE",
  "KD_AWS_REGION", "KD_AWS_S3_BUCKET_NAME",
  "BETTER_AUTH_URL", "EXTRA_TRUSTED_ORIGINS", "ADMIN_EMAILS", "REQUIRE_EMAIL_VERIFICATION",
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "MAIL_FROM",
  "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_ART", "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_COMPANY_NAME", "NEXT_PUBLIC_LEGAL_JURISDICTION",
];
const SECRETS = [
  "MYSQL_PASSWORD", "KD_AWS_ACCESS_KEY_ID", "KD_AWS_SECRET_ACCESS_KEY", "BETTER_AUTH_SECRET",
  "OPENAI_API_KEY", "PEXELS_API_KEY", "SPEECHIFY_API_KEY", "MODELSLAB_API_KEY", "SMTP_PASSWORD",
];
const REQUIRED = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "KD_AWS_S3_BUCKET_NAME",
  "KD_AWS_ACCESS_KEY_ID", "KD_AWS_SECRET_ACCESS_KEY", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "OPENAI_API_KEY"];

let secrets = {};
try { secrets = JSON.parse(process.env.secrets || "{}"); }
catch { console.warn("amplify-env: $secrets is not valid JSON; secrets were skipped."); }

const values = {};
for (const name of SETTINGS) if (process.env[name]) values[name] = process.env[name];
// A secret wins over an environment variable of the same name.
for (const name of SECRETS) {
  const value = secrets[name] ?? process.env[name];
  if (value) values[name] = String(value);
}

/**
 * Quotes a value the way Next's env loader reads it back unchanged: single
 * quotes keep spaces, "=", "#" and double quotes; "$" is escaped so it is not
 * taken for a variable. Values with a single quote or a newline use double
 * quotes, where "\n" becomes a newline.
 */
function quote(name, value) {
  const dollars = value.replace(/\$/g, "\\$");
  if (!value.includes("'") && !value.includes("\n")) return `'${dollars}'`;
  if (!value.includes("\"")) return `"${dollars.replace(/\r?\n/g, "\\n")}"`;
  console.error(`amplify-env: ${name} mixes ' and " quotes, which .env files cannot hold. Change that value.`);
  process.exit(1);
}

const lines = Object.entries(values).map(([name, value]) => `${name}=${quote(name, value)}`);
fs.appendFileSync(".env.production", lines.join("\n") + "\n");

console.log(`amplify-env: wrote ${lines.length} settings to .env.production`);
const missing = REQUIRED.filter(name => !values[name]);
if (missing.length) {
  console.error(`amplify-env: missing ${missing.join(", ")}. Add them in the Amplify console (see the list in this file).`);
  process.exit(1);
}
