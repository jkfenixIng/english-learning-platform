// Feature-flagged email via Resend (free 3k/mo) or Supabase fallback; disabled by default
const ENABLED = process.env.ENABLE_EMAIL === "true";

export interface EmailPayload { to: string; subject: string; html: string; }

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; reason?: string | undefined }> {
  if (!ENABLED) return { sent: false, reason: "email feature disabled (ENABLE_EMAIL!=true)" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "RESEND_API_KEY missing" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "noreply@elp.local", to: payload.to, subject: payload.subject, html: payload.html }),
    });
    return { sent: res.ok, reason: res.ok ? undefined : await res.text() };
  } catch (e) { return { sent: false, reason: String(e) }; }
}

export async function notifySrsDue(userId: string, email: string, dueCount: number) {
  if (dueCount === 0) return { sent: false, reason: "no due cards" };
  return sendEmail({ to: email, subject: `You have ${dueCount} reviews due`, html: `<p>You have <strong>${dueCount}</strong> SRS cards due today. <a href="/reviews">Review now</a></p>` });
}

export async function notifyChallengeCompleted(userId: string, email: string, challengeTitle: string, rewardXp: number) {
  return sendEmail({ to: email, subject: `Challenge completed: ${challengeTitle}`, html: `<p>Congrats! You completed "${challengeTitle}" and earned ${rewardXp} XP.</p>` });
}
