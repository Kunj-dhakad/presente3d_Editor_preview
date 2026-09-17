/**
 * Amplify build step: writes the app's settings into .env.production so the
 * Next.js server can read them at runtime (Amplify does not pass console values
 * to the SSR runtime on its own). The build reads the same file, so
 * NEXT_PUBLIC_* values work from either place too.
 *
 * Every name below may be set as a Secret (Amplify console > Secrets, handed to
 * the build as one JSON string in $secrets) or as an Environment variable; a
 * Secret wins when both exist. Only these names are written, so nothing else
 * from the build machine leaks into the bundle. Values are never printed.
 */
const fs = require("node:fs");

const NAMES = [
  // database
  "MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE",
  // storage
  "KD_AWS_REGION", "KD_AWS_S3_BUCKET_NAME", "KD_AWS_ACCESS_KEY_ID", "KD_AWS_SECRET_ACCESS_KEY",
  // sign-in
  "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "EXTRA_TRUSTED_ORIGINS", "ADMIN_EMAILS", "REQUIRE_EMAIL_VERIFICATION",
  // AI and media services
  "OPENAI_API_KEY", "PEXELS_API_KEY", "SPEECHIFY_API_KEY", "MODELSLAB_API_KEY",
  // email
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM",
  // public site details
  "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_ART", "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_COMPANY_NAME", "NEXT_PUBLIC_LEGAL_JURISDICTION",
];
const REQUIRED = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "KD_AWS_S3_BUCKET_NAME",
  "KD_AWS_ACCESS_KEY_ID", "KD_AWS_SECRET_ACCESS_KEY", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "OPENAI_API_KEY"];

let secrets = {};
try { secrets = JSON.parse(process.env.secrets || "{}"); }
catch { console.warn("amplify-env: $secrets is not valid JSON; secrets were skipped."); }

const values = {};
for (const name of NAMES) {
  const value = secrets[name] ?? process.env[name];
  if (value !== undefined && value !== null && String(value) !== "") values[name] = String(value);
}
const fromSecrets = Object.keys(values).filter(name => secrets[name] !== undefined).length;

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

console.log(`amplify-env: wrote ${lines.length} settings to .env.production (${fromSecrets} from Secrets)`);
const missing = REQUIRED.filter(name => !values[name]);
if (missing.length) {
  console.error(`amplify-env: missing ${missing.join(", ")}. Add them in the Amplify console (see the list in this file).`);
  process.exit(1);
}
