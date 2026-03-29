// ProofAI — Pay-per-Proof billing model
// 1 proof = 1 complete pipeline run (compress → execute → sign → anchor → verify)

export type PlanId = "free" | "payg" | "indie" | "startup" | "scale" | "enterprise";

export interface PlanConfig {
  name: string;
  pricePerMonth: number;
  proofsIncluded: number;
  pricePerProof: number;
  overageRate: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    name: "Free",
    pricePerMonth: 0,
    proofsIncluded: 100,
    pricePerProof: 0,
    overageRate: 0,
  },
  payg: {
    name: "Pay-as-you-go",
    pricePerMonth: 0,
    proofsIncluded: 0,
    pricePerProof: 0.05,
    overageRate: 0.05,
  },
  indie: {
    name: "Indie",
    pricePerMonth: 9,
    proofsIncluded: 500,
    pricePerProof: 0.018,
    overageRate: 0.04,
  },
  startup: {
    name: "Startup",
    pricePerMonth: 29,
    proofsIncluded: 2000,
    pricePerProof: 0.0145,
    overageRate: 0.03,
  },
  scale: {
    name: "Scale",
    pricePerMonth: 99,
    proofsIncluded: 10000,
    pricePerProof: 0.0099,
    overageRate: 0.02,
  },
  enterprise: {
    name: "Enterprise",
    pricePerMonth: 499,
    proofsIncluded: -1,
    pricePerProof: 0,
    overageRate: 0,
  },
};

export function checkProofAllowance(
  plan: PlanId,
  proofsUsed: number,
  proofsLimit: number | null,
): { allowed: true; remaining: number | null } | { allowed: false; reason: string; suggestedPlan: PlanId } {
  if (plan === "enterprise" || PLANS[plan].proofsIncluded === -1) {
    return { allowed: true, remaining: null };
  }
  if (plan === "payg") {
    return { allowed: true, remaining: null };
  }
  const limit = proofsLimit ?? PLANS[plan].proofsIncluded;
  if (proofsUsed >= limit) {
    return {
      allowed: false,
      reason: `Proof limit reached (${proofsUsed}/${limit}). Upgrade to continue.`,
      suggestedPlan: plan === "free" ? "payg" : "startup",
    };
  }
  return { allowed: true, remaining: limit - proofsUsed };
}

export function getProofCost(plan: PlanId, proofsUsedThisPeriod: number): number {
  const config = PLANS[plan];
  if (plan === "free" || plan === "enterprise") return 0;
  if (plan === "payg") return config.pricePerProof;
  if (proofsUsedThisPeriod < config.proofsIncluded) return 0;
  return config.overageRate;
}
