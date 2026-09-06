// server/ai-boss-youtube-connector.ts
import http from "node:http";
var DEFAULT_PORT = 8789;
var MAX_REQUEST_BYTES = 128e3;
var YOUTUBE_READ_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly"
];
function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
function buildYouTubeAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_ID"),
    redirect_uri: requiredEnv("AI_BOSS_YOUTUBE_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: YOUTUBE_READ_SCOPES.join(" "),
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
async function exchangeYouTubeAuthorizationCode(code, fetchImpl = fetch) {
  const body = new URLSearchParams({
    code,
    client_id: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_ID"),
    client_secret: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_SECRET"),
    redirect_uri: requiredEnv("AI_BOSS_YOUTUBE_REDIRECT_URI"),
    grant_type: "authorization_code"
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || `Google token exchange failed (${response.status}).`);
  return data;
}
async function getAccessToken(fetchImpl, refreshToken) {
  const body = new URLSearchParams({
    client_id: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_ID"),
    client_secret: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_SECRET"),
    refresh_token: refreshToken || requiredEnv("AI_BOSS_YOUTUBE_REFRESH_TOKEN"),
    grant_type: "refresh_token"
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || `Google token refresh failed (${response.status}).`);
  return data.access_token;
}
async function googleJson(fetchImpl, url, accessToken) {
  const response = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`YouTube API ${response.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}
async function executeYouTubeConnectorAction(action, fetchImpl = fetch, refreshToken) {
  const accessToken = await getAccessToken(fetchImpl, refreshToken);
  if (action.operation === "channel") {
    return googleJson(fetchImpl, "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true", accessToken);
  }
  if (action.operation === "videos") {
    const channel = await googleJson(fetchImpl, "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", accessToken);
    const uploads = channel?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error("No uploads playlist found for the authorized YouTube channel.");
    const maxResults = Math.max(1, Math.min(Number(action.max_results || 50), 50));
    const playlist = await googleJson(fetchImpl, `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploads)}&maxResults=${maxResults}`, accessToken);
    const ids2 = (playlist?.items || []).map((item) => item?.contentDetails?.videoId).filter(Boolean);
    if (!ids2.length) return { items: [] };
    return googleJson(fetchImpl, `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(ids2.join(","))}`, accessToken);
  }
  const ids = (action.video_ids || []).filter(Boolean);
  const filters = ids.length ? `&filters=${encodeURIComponent(`video==${ids.join(",")}`)}` : "";
  const metrics = ["views", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage", "subscribersGained", "videoThumbnailImpressions", "videoThumbnailImpressionsClickRate"].join(",");
  const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${encodeURIComponent(action.start_date)}&endDate=${encodeURIComponent(action.end_date)}&metrics=${encodeURIComponent(metrics)}&dimensions=video${filters}`;
  return googleJson(fetchImpl, url, accessToken);
}
function connectorToken() {
  return requiredEnv("AI_BOSS_YOUTUBE_CONNECTOR_TOKEN");
}
function createYouTubeConnectorServer() {
  return http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/youtube") {
      res.writeHead(404).end("Not found");
      return;
    }
    let expectedToken = "";
    try {
      expectedToken = connectorToken();
    } catch {
      res.writeHead(503).end("Connector not configured");
      return;
    }
    if (req.headers.authorization !== `Bearer ${expectedToken}`) {
      res.writeHead(401).end("Unauthorized");
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) req.destroy(new Error("Request too large"));
      else chunks.push(chunk);
    });
    req.on("end", async () => {
      try {
        const action = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const result = await executeYouTubeConnectorAction(action);
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: message }));
      }
    });
  });
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.AI_BOSS_YOUTUBE_CONNECTOR_PORT || DEFAULT_PORT);
  createYouTubeConnectorServer().listen(port, "127.0.0.1", () => {
    console.log(`AI Boss YouTube connector listening on http://127.0.0.1:${port}/youtube`);
  });
}
export {
  buildYouTubeAuthorizationUrl,
  createYouTubeConnectorServer,
  exchangeYouTubeAuthorizationCode,
  executeYouTubeConnectorAction
};
