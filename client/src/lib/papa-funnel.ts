/** Papa Life homepage funnel — mirrors server `PAPA_FUNNEL_ISSUE_*` */

export const CALENDLY_BOOK_URL = "https://calendly.com/briankeithhill";

export const HEYGEN_EMBED_URL = "https://app.heygen.com/embeds/e0919c0ef5f54baead1bfe23bdc695a0";

export const PAPA_LOGO_URL =
  "https://imagedelivery.net/o4mWYROcO-l6Q05X-a5wtg/9d6f1f6f-1a42-4731-cea6-2c9706cb5800/public";

export const FUNNEL_EMAIL_KEY = "papa_funnel_email";
export const FUNNEL_TAG_KEY = "papa_funnel_tag";

export type PapaIssueKey =
  | "communication"
  | "dismissed"
  | "disconnected"
  | "dont_know"
  | "ready_to_change";

export const PAPA_ISSUE_OPTIONS: { key: PapaIssueKey; label: string }[] = [
  { key: "communication", label: "Communication keeps breaking down" },
  { key: "dismissed", label: "I feel dismissed or shut out" },
  { key: "disconnected", label: "We feel emotionally disconnected" },
  { key: "dont_know", label: "I do not know what to say anymore" },
  { key: "ready_to_change", label: "I am ready to change this" },
];

export const TAG_TO_JOURNAL_PROMPT: Record<PapaIssueKey, string> = {
  communication: "What do I keep trying to say that never seems to land?",
  dismissed: "Where do I feel dishonored, and how has that affected the way I show up?",
  disconnected: "When did I first realize the connection had changed?",
  dont_know: "What truth have I been carrying that I have not known how to say well?",
  ready_to_change: "What am I willing to do differently starting now?",
};

export function isPapaIssueKey(s: string): s is PapaIssueKey {
  return PAPA_ISSUE_OPTIONS.some((o) => o.key === s);
}

export function persistFunnelSession(email: string, issueKey: PapaIssueKey) {
  try {
    sessionStorage.setItem(FUNNEL_EMAIL_KEY, email.trim().toLowerCase());
    sessionStorage.setItem(FUNNEL_TAG_KEY, issueKey);
  } catch {
    /* private mode */
  }
}

export function getFunnelEmail(): string {
  try {
    return sessionStorage.getItem(FUNNEL_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function getFunnelTag(): PapaIssueKey {
  try {
    const t = sessionStorage.getItem(FUNNEL_TAG_KEY);
    if (t && isPapaIssueKey(t)) return t;
  } catch {
    /* ignore */
  }
  return "ready_to_change";
}

export async function logFunnelEngagement(email: string, event_type: string, event_detail?: string | null) {
  if (!email) return;
  try {
    await fetch("/api/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, event_type, event_detail: event_detail ?? null }),
    });
  } catch {
    /* non-blocking */
  }
}
