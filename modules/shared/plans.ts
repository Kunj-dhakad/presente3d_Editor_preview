// Plan catalogue shared by the server (limit enforcement) and the UI (pricing,
// usage meters). Payments are not connected yet: an admin assigns plans from
// the Administration page after a customer requests an upgrade.
export type PlanId = "free" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  blurb: string;
  limits: { books: number; aiDaily: number; videoDaily: number; storageBytes: number };
  features: string[];
  highlight?: boolean;
};

const GB = 1024 ** 3;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free", name: "Free", price: "$0", period: "forever",
    blurb: "Try the editor and publish your first book.",
    limits: { books: 3, aiDaily: 60, videoDaily: 1, storageBytes: 0.5 * GB },
    features: ["3 books", "60 AI actions per day", "500 MB media storage", "PDF, PowerPoint and image export", "Public reader links"],
  },
  pro: {
    id: "pro", name: "Pro", price: "$9", period: "per month", highlight: true,
    blurb: "For authors and creators publishing regularly.",
    limits: { books: 50, aiDaily: 600, videoDaily: 10, storageBytes: 10 * GB },
    features: ["50 books", "600 AI actions per day", "10 GB media storage", "AI images and video", "Priority email support"],
  },
  business: {
    id: "business", name: "Business", price: "$29", period: "per month",
    blurb: "For teams, schools and publishers.",
    limits: { books: 1000, aiDaily: 3000, videoDaily: 30, storageBytes: 50 * GB },
    features: ["1,000 books", "3,000 AI actions per day", "50 GB media storage", "Everything in Pro", "Onboarding help"],
  },
};

export const PLAN_LIST = [PLANS.free, PLANS.pro, PLANS.business];

export function planOf(id: unknown): Plan {
  return typeof id === "string" && id in PLANS ? PLANS[id as PlanId] : PLANS.free;
}

export function formatBytes(bytes: number) {
  if (bytes >= GB) return `${+(bytes / GB).toFixed(1)} GB`;
  return `${+(bytes / 1024 ** 2).toFixed(bytes >= 10 * 1024 ** 2 ? 0 : 1)} MB`;
}
