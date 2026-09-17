import { networkInterfaces } from "node:os";

// Hostnames of this machine's LAN interfaces, so `next dev` can be opened from
// http://192.168.x.x:3000 (the "Network" URL) as well as localhost.
export function lanHostnames() {
  return Object.values(networkInterfaces()).flat()
    .filter(info => info && info.family === "IPv4" && !info.internal)
    .map(info => info!.address);
}

/** Origins allowed to call auth and API endpoints. */
export function trustedOrigins() {
  const base = new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000");
  const origins = new Set([base.origin]);
  for (const extra of (process.env.EXTRA_TRUSTED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)) origins.add(new URL(extra).origin);
  if (process.env.NODE_ENV !== "production") {
    const port = base.port ? `:${base.port}` : "";
    for (const host of ["localhost", "127.0.0.1", ...lanHostnames()]) origins.add(`${base.protocol}//${host}${port}`);
  }
  return [...origins];
}
