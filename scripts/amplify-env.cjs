/**
 * Amplify build step: writes the app's settings into .env.production so the
 * Next.js server can read them at runtime (Amplify does not pass console values
 * to the SSR runtime on its own). The build reads the same file, so
 * NEXT_PUBLIC_* values work from either place too.
 *
 * Every name below may be set as a Secret or as an Environment variable.
 * Secrets (Hosting > Secrets) live in SSM Parameter Store:
 *   "All branches"  -> /amplify/shared/<app-id>/<NAME>
 *   one branch      -> /amplify/<app-id>/<branch>/<NAME>
 * Amplify only hands the branch path to the build (as $secrets), so both paths
 * are read here with the app's service role. Priority: branch secret, shared
 * secret, environment variable. Only these names are written, so nothing else
 * from the build machine leaks into the bundle. Values are never printed.
 */
const fs = require("node:fs");

const NAMES = [
  // this app and the PHP app that embeds it
  "APP_URL", "PHP_TOKEN_KEY", "NEXT_PUBLIC_PARENT_ORIGINS", "FRAME_ANCESTORS", "EXTRA_TRUSTED_ORIGINS",
  // storage
  "KD_AWS_REGION", "KD_AWS_S3_BUCKET_NAME", "KD_AWS_ACCESS_KEY_ID", "KD_AWS_SECRET_ACCESS_KEY", "STORAGE_PREFIX",
  // AI and media services
  "OPENAI_API_KEY", "PEXELS_API_KEY", "SPEECHIFY_API_KEY", "MODELSLAB_API_KEY", "AI_DAILY_LIMIT",
  // branding
  "NEXT_PUBLIC_APP_NAME",
];
const REQUIRED = ["APP_URL", "KD_AWS_S3_BUCKET_NAME", "KD_AWS_ACCESS_KEY_ID", "KD_AWS_SECRET_ACCESS_KEY", "OPENAI_API_KEY"];

const HINTS = {
  AccessDeniedException: " (give the Amplify service role ssm:GetParametersByPath on arn:aws:ssm:*:*:parameter/amplify/*)",
  CredentialsProviderError: " (the app has no service role: App settings > IAM roles)",
};

/** Reads every parameter under a path; returns { NAME: value } and never throws. */
async function readPath(client, GetParametersByPathCommand, path) {
  const found = {};
  let NextToken;
  do {
    const page = await client.send(new GetParametersByPathCommand({ Path: path, Recursive: false, WithDecryption: true, NextToken }));
    for (const parameter of page.Parameters || []) found[parameter.Name.slice(path.length)] = parameter.Value;
    NextToken = page.NextToken;
  } while (NextToken);
  return found;
}

async function ssmSecrets() {
  const app = process.env.AWS_APP_ID;
  const branch = process.env.AWS_BRANCH;
  if (!app) return { shared: {}, branch: {}, note: " Not running on Amplify (AWS_APP_ID unset), so Secrets were not read." };
  const { SSMClient, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");
  const client = new SSMClient({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1" });
  const result = { shared: {}, branch: {}, note: "" };
  const paths = [["shared", `/amplify/shared/${app}/`], ["branch", branch ? `/amplify/${app}/${branch}/` : ""]];
  for (const [key, path] of paths) {
    if (!path) continue;
    try { result[key] = await readPath(client, GetParametersByPathCommand, path); }
    catch (error) {
      result.note += ` Could not read ${path}: ${error.name || "error"}${HINTS[error.name] ?? ""}.`;
    }
  }
  return result;
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

async function main() {
  let handed = {};
  try { handed = JSON.parse(process.env.secrets || "{}"); }
  catch { console.warn("amplify-env: $secrets is not valid JSON; it was skipped."); }
  const ssm = await ssmSecrets();
  const secrets = { ...ssm.shared, ...handed, ...ssm.branch };

  const values = {};
  const sources = { secret: 0, env: 0 };
  for (const name of NAMES) {
    const fromSecret = secrets[name];
    const value = fromSecret ?? process.env[name];
    if (value === undefined || value === null || String(value) === "") continue;
    values[name] = String(value);
    sources[fromSecret !== undefined ? "secret" : "env"] += 1;
  }

  const lines = Object.entries(values).map(([name, value]) => `${name}=${quote(name, value)}`);
  fs.appendFileSync(".env.production", lines.join("\n") + "\n");
  console.log(`amplify-env: wrote ${lines.length} settings to .env.production (${sources.secret} from Secrets: ${Object.keys(ssm.shared).length} shared, ${Object.keys(ssm.branch).length} for this branch; ${sources.env} from Environment variables).${ssm.note}`);

  const missing = REQUIRED.filter(name => !values[name]);
  if (missing.length) {
    console.error(`amplify-env: missing ${missing.join(", ")}. Add them as Secrets or Environment variables in the Amplify console.`);
    process.exit(1);
  }
}

main().catch(error => { console.error("amplify-env failed:", error.message); process.exit(1); });
