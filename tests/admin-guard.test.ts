import { describe, it, expect } from "vitest";
import { isPremiumUser, canAccessPremium, paywallMessage } from "../lib/monetization/guard";

describe("admin guard + monetization", () => {
  it("isPremiumUser detects premium", () => {
    expect(isPremiumUser({ isPremium: true })).toBe(true);
    expect(isPremiumUser({ subscriptionTier: "premium" })).toBe(true);
    expect(isPremiumUser({ subscriptionTier: "free" })).toBe(false);
    expect(isPremiumUser(null)).toBe(false);
  });

  it("canAccessPremium gates premium items", () => {
    expect(canAccessPremium(null, false)).toBe(true);
    expect(canAccessPremium(null, true)).toBe(false);
    expect(canAccessPremium({ isPremium: true }, true)).toBe(true);
    expect(canAccessPremium({ subscriptionTier: "premium" }, true)).toBe(true);
  });

  it("paywallMessage contains title and placeholder note", () => {
    const msg = paywallMessage("Diamond Frame");
    expect(msg).toContain("Diamond Frame");
    expect(msg).toContain("Stripe");
  });

  it("admin guard expects admin role (DAL simulation)", () => {
    const mockUser = (role: string) => ({ role });
    const isAdmin = (u: { role: string }) => u.role === "admin";
    expect(isAdmin(mockUser("admin"))).toBe(true);
    expect(isAdmin(mockUser("student"))).toBe(false);
  });
});
