export const ANDROID_COMPANION_STORAGE_KEY = "ai-boss-android-companion-id";
export const ANDROID_HEARTBEAT_INTERVAL_MS = 45_000;

export function isAndroidUserAgent(userAgent: string) {
  return /Android/i.test(userAgent);
}

export function mobileTakeoverSessionRef(now = Date.now()) {
  return `mobile-takeover-${now}`;
}

export function phoneIsInControl(mission: { android_online: boolean; mac_online: boolean } | null) {
  return Boolean(mission?.android_online && !mission.mac_online);
}
