// Plan catalogue for NotiProof. Used by Billing UI and checkout edge function.
// Stripe price IDs are read from edge function secrets — keep the price secret
// names here in sync with the secrets configured for the project.

export type PlanKey = "free" | "starter" | "growth" | "scale";
export type BillingInterval = "monthly" | "yearly";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  /** Effective monthly price when billed yearly (already discounted). */
  yearlyMonthlyPriceUsd: number;
  /** Total annual charge when billed yearly. */
  yearlyPriceUsd: number;
  proofLimit: number;
  eventLimit: number;
  highlight?: boolean;
  features: string[];
  /** Stripe price secret names per interval — undefined for free plan. */
  stripePriceSecrets?: Record<BillingInterval, string>;
}

export const PLANS: PlanDefinition[] = [
  {
    key: "free",
    name: "Free",
    tagline: "For testing and small projects",
    monthlyPriceUsd: 0,
    yearlyMonthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    proofLimit: 100,
    eventLimit: 10_000,
    features: [
      "1 widget",
      "100 proof items / month",
      "10,000 widget events / month",
      '"Powered by NotiProof" badge',
    ],
  },
  {
    key: "starter",
    name: "Starter",
    tagline: "For growing storefronts",
    monthlyPriceUsd: 29,
    yearlyMonthlyPriceUsd: 24,
    yearlyPriceUsd: 288,
    proofLimit: 1_000,
    eventLimit: 100_000,
    stripePriceSecrets: {
      monthly: "STRIPE_PRICE_STARTER_MONTHLY",
      yearly: "STRIPE_PRICE_STARTER_YEARLY",
    },
    features: [
      "Unlimited widgets",
      "1,000 proof items / month",
      "100,000 widget events / month",
      "Remove badge",
      "Email support",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    tagline: "For established brands",
    monthlyPriceUsd: 79,
    yearlyMonthlyPriceUsd: 66,
    yearlyPriceUsd: 792,
    proofLimit: 10_000,
    eventLimit: 1_000_000,
    highlight: true,
    stripePriceSecrets: {
      monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
      yearly: "STRIPE_PRICE_GROWTH_YEARLY",
    },
    features: [
      "Everything in Starter",
      "10,000 proof items / month",
      "1M widget events / month",
      "A/B testing",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    key: "scale",
    name: "Scale",
    tagline: "For high-volume teams",
    monthlyPriceUsd: 199,
    yearlyMonthlyPriceUsd: 166,
    yearlyPriceUsd: 1_992,
    proofLimit: 100_000,
    eventLimit: 10_000_000,
    stripePriceSecrets: {
      monthly: "STRIPE_PRICE_SCALE_MONTHLY",
      yearly: "STRIPE_PRICE_SCALE_YEARLY",
    },
    features: [
      "Everything in Growth",
      "100,000 proof items / month",
      "10M widget events / month",
      "Dedicated success manager",
      "Custom contract & SSO on request",
    ],
  },
];

export function planByKey(key: string | null | undefined): PlanDefinition {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export function priceForInterval(plan: PlanDefinition, interval: BillingInterval): number {
  return interval === "yearly" ? plan.yearlyMonthlyPriceUsd : plan.monthlyPriceUsd;
}

/** Yearly savings as a percentage versus monthly billing. */
export function yearlySavingsPercent(plan: PlanDefinition): number {
  if (!plan.monthlyPriceUsd) return 0;
  const annualIfMonthly = plan.monthlyPriceUsd * 12;
  if (!annualIfMonthly) return 0;
  return Math.round((1 - plan.yearlyPriceUsd / annualIfMonthly) * 100);
}
