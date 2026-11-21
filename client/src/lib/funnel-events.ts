/** Minimal, privacy-conscious funnel event tracking. No answers or personal information. */
export type PapaFunnelEvent = "fatherhood_checkin_started" | "fatherhood_checkin_completed" | "fatherhood_followup_requested";
export function trackPapaFunnelEvent(name: PapaFunnelEvent) {
  if (typeof window === "undefined") return;
  const analyticsWindow = window as Window & { gtag?: (...args: unknown[]) => void };
  if (typeof analyticsWindow.gtag === "function") analyticsWindow.gtag("event", name, { funnel_name: "papa_fatherhood_checkin" });
}
