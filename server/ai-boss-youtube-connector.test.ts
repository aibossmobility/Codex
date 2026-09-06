import assert from "node:assert/strict";
import { buildYouTubeAuthorizationUrl } from "./ai-boss-youtube-connector";

process.env.AI_BOSS_YOUTUBE_CLIENT_ID = "client-id.apps.googleusercontent.com";
process.env.AI_BOSS_YOUTUBE_REDIRECT_URI = "https://papalifecoach.com/ai-boss/youtube/callback";

const url = new URL(buildYouTubeAuthorizationUrl("phone-approval"));
assert.equal(url.hostname, "accounts.google.com");
assert.equal(url.searchParams.get("response_type"), "code");
assert.equal(url.searchParams.get("access_type"), "offline");
assert.equal(url.searchParams.get("state"), "phone-approval");
const scope = url.searchParams.get("scope") || "";
assert.match(scope, /youtube\.readonly/);
assert.match(scope, /yt-analytics\.readonly/);
console.log("✓ YouTube connector builds read-only phone authorization with analytics scope");
