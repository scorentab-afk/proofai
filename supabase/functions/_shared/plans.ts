// ProofAI — Plan & Feature Gating
// This module defines the freemium tiers and enforces usage limits.

export type PlanId = "free" | "indie" | "startup" | "scale" | "enterprise";

export interface PlanLimits {
  compressPerDay: number;
  executePerDay: number;
  multiProvider: boolean;
  cognitiveAnalysis: boolean;
  signing: boolean;
  evidenceBundle: boolean;
  blockchainAnchor: boolean;
  pdfCertificate: boolean;
  verify: boolean;
}

export const PLANS: Record<PlanId, { name: string; price: number; limits: PlanLimits }> = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      compressPerDay: 10,
      executePerDay: 5,
      multiProvider: false,
      cognitiveAnalysis: false,
      signing: false,
      evidenceBundle: false,
      blockchainAnchor: false,
      pdfCertificate: false,
      verify: true,
    },
  },
  indie: {
    name: "Indie",
    price: 9,
    limits: {
      compressPerDay: 100,
      executePerDay: 50,
      multiProvider: false,
      cognitiveAnalysis: true,
      signing: false,
      evidenceBundle: false,
      blockchainAnchor: false,
      pdfCertificate: false,
      verify: true,
    },
  },
  startup: {
    name: "Startup",
    price: 29,
    limits: {
      compressPerDay: -1, // unlimited
      executePerDay: -1,
      multiProvider: true,
      cognitiveAnalysis: true,
      signing: true,
      evidenceBundle: true,
      blockchainAnchor: false,
      pdfCertificate: false,
      verify: true,
    },
  },
  scale: {
    name: "Scale",
    price: 99,
    limits: {
      compressPerDay: -1,
      executePerDay: -1,
      multiProvider: true,
      cognitiveAnalysis: true,
      signing: true,
      evidenceBundle: true,
      blockchainAnchor: true,
      pdfCertificate: true,
      verify: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: 499,
    limits: {
      compressPerDay: -1,
      executePerDay: -1,
      multiProvider: true,
      cognitiveAnalysis: true,
      signing: true,
      evidenceBundle: true,
      blockchainAnchor: true,
      pdfCertificate: true,
      verify: true,
    },
  },
};

/**
 * Check if a feature is allowed for the given plan.
 * Returns { allowed: true } or { allowed: false, reason: string, requiredPlan: PlanId }.
 */
export function checkFeature(
  plan: PlanId,
  feature: keyof PlanLimits
): { allowed: true } | { allowed: false; reason: string; requiredPlan: PlanId } {
  const limits = PLANS[plan].limits;
  const value = limits[feature];

  if (typeof value === "boolean" && !value) {
    // Find the cheapest plan that has this feature
    const requiredPlan = (Object.keys(PLANS) as PlanId[]).find(
      (p) => PLANS[p].limits[feature] === true
    ) || "enterprise";
    return {
      allowed: false,
      reason: `${String(feature)} requires ${PLANS[requiredPlan].name} plan (€${PLANS[requiredPlan].price}/mo)`,
      requiredPlan,
    };
  }

  return { allowed: true };
}

/**
 * Check daily rate limit. Returns remaining count or error.
 * Pass currentCount = number of requests made today.
 */
export function checkRateLimit(
  plan: PlanId,
  feature: "compressPerDay" | "executePerDay",
  currentCount: number
): { allowed: true; remaining: number } | { allowed: false; reason: string; requiredPlan: PlanId } {
  const limit = PLANS[plan].limits[feature];

  if (limit === -1) {
    return { allowed: true, remaining: Infinity };
  }

  if (currentCount >= limit) {
    const nextPlan = (Object.keys(PLANS) as PlanId[]).find(
      (p) => PLANS[p].limits[feature] === -1 || (PLANS[p].limits[feature] as number) > limit
    ) || "indie";
    return {
      allowed: false,
      reason: `Daily limit reached (${limit}/${feature}). Upgrade to ${PLANS[nextPlan].name} for more.`,
      requiredPlan: nextPlan,
    };
  }

  return { allowed: true, remaining: limit - currentCount };
}
