/**
 * Paywall placeholders — future Stripe integration.
 * Zero-paid constraint: no payment processed; guards show UI stubs only.
 */

export type SubscriptionTier = "free" | "premium";

export function isPremiumUser(user: { subscriptionTier?: string; isPremium?: boolean } | null): boolean {
  if (!user) return false;
  return user.isPremium === true || user.subscriptionTier === "premium";
}

export function canAccessPremium(user: { subscriptionTier?: string; isPremium?: boolean } | null, itemIsPremium: boolean): boolean {
  if (!itemIsPremium) return true;
  return isPremiumUser(user);
}

export function paywallMessage(itemTitle: string): string {
  return `${itemTitle} is a premium perk — upgrade to unlock (Stripe coming soon).`;
}
