export type FirstTouchAttribution = {
  source?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_path?: string;
  first_touch_at?: string;
};

const STORAGE_KEY = "papa_life_first_touch_attribution";
const ZIPSHARE_CAMPAIGNS = new Set(["PAPALIFECOACH", "AIBOSSZIP"]);

export function captureFirstTouchAttribution(): FirstTouchAttribution {
  if (typeof window === "undefined") return {};

  try {
    const storedRaw = window.localStorage.getItem(STORAGE_KEY);
    if (storedRaw) {
      const stored = JSON.parse(storedRaw) as FirstTouchAttribution;
      if (stored && typeof stored === "object") return stored;
    }
  } catch {
    // Attribution must never block the site.
  }
  const params = new URLSearchParams(window.location.search);
  const referralCode = (params.get("ref") || "").trim().toUpperCase();
  const explicitCampaign = (params.get("utm_campaign") || "").trim();
  const campaign = explicitCampaign || (ZIPSHARE_CAMPAIGNS.has(referralCode) ? referralCode : "");
  const source = (params.get("utm_source") || (campaign && ZIPSHARE_CAMPAIGNS.has(campaign.toUpperCase()) ? "zipshare" : "")).trim();

  const current: FirstTouchAttribution = {
    ...(source ? { source } : {}),
    ...(campaign ? { campaign } : {}),
    ...(params.get("utm_medium") ? { medium: params.get("utm_medium")!.trim() } : {}),
    ...(params.get("utm_content") ? { content: params.get("utm_content")!.trim() } : {}),
    ...(params.get("utm_term") ? { term: params.get("utm_term")!.trim() } : {}),
    ...(document.referrer ? { referrer: document.referrer } : {}),
    landing_path: `${window.location.pathname}${window.location.search}`,
    first_touch_at: new Date().toISOString(),
  };

  if (current.source || current.campaign) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Attribution must never block the site.
    }
  }

  return current;
}

export function getFirstTouchAttribution(): FirstTouchAttribution {
  return captureFirstTouchAttribution();
}
