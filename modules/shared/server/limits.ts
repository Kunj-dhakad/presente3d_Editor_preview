import { ApiError, consumeLimit } from "./api";
import { accountStatus, activeBookCount, storageUsed } from "./account";
import { formatBytes } from "@shared/plans";

const upgrade = "Upgrade your plan from Plan & billing to continue.";

export async function assertBookQuota(userId: string) {
  const { plan } = await accountStatus(userId);
  if (await activeBookCount(userId) >= plan.limits.books) throw new ApiError(402, `Your ${plan.name} plan includes ${plan.limits.books} books. Move a book to trash or ${upgrade.toLowerCase()}`);
}

export async function assertStorageQuota(userId: string, extraBytes: number) {
  const { plan } = await accountStatus(userId);
  if (await storageUsed(userId) + extraBytes > plan.limits.storageBytes) throw new ApiError(413, `Your ${formatBytes(plan.limits.storageBytes)} storage limit has been reached. ${upgrade}`);
}

/** `cost` is the number of AI actions to charge — one per generated page. */
export async function consumeAi(userId: string, cost = 1) {
  const { plan } = await accountStatus(userId);
  try { await consumeLimit(userId, "ai-daily", plan.limits.aiDaily, 86400, cost); }
  catch (e) { if (e instanceof ApiError && e.status === 429) throw new ApiError(429, `You have used today's ${plan.limits.aiDaily} AI actions. ${upgrade}`); throw e; }
}

export async function consumeVideo(userId: string) {
  const { plan } = await accountStatus(userId);
  try { await consumeLimit(userId, "video-daily", plan.limits.videoDaily, 86400); }
  catch (e) { if (e instanceof ApiError && e.status === 429) throw new ApiError(429, `You have used today's ${plan.limits.videoDaily} AI videos. ${upgrade}`); throw e; }
}
