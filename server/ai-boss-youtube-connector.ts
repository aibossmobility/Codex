import http from "node:http";

const DEFAULT_PORT = 8789;
const MAX_REQUEST_BYTES = 128_000;
const YOUTUBE_READ_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

type FetchLike = typeof fetch;

type YouTubeAction =
  | { operation: "channel" }
  | { operation: "videos"; max_results?: number }
  | { operation: "analytics"; start_date: string; end_date: string; video_ids?: string[] };

function requiredEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function buildYouTubeAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_ID"),
    redirect_uri: requiredEnv("AI_BOSS_YOUTUBE_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: YOUTUBE_READ_SCOPES.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYouTubeAuthorizationCode(code: string, fetchImpl: FetchLike = fetch) {
  const body = new URLSearchParams({
    code,
    client_id: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_ID"),
    client_secret: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_SECRET"),
    redirect_uri: requiredEnv("AI_BOSS_YOUTUBE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json() as { refresh_token?: string; access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || `Google token exchange failed (${response.status}).`);
  return data;
}

async function getAccessToken(fetchImpl: FetchLike) {
  const body = new URLSearchParams({
    client_id: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_ID"),
    client_secret: requiredEnv("AI_BOSS_YOUTUBE_CLIENT_SECRET"),
    refresh_token: requiredEnv("AI_BOSS_YOUTUBE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || `Google token refresh failed (${response.status}).`);
  return data.access_token;
}

async function googleJson(fetchImpl: FetchLike, url: string, accessToken: string) {
  const response = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`YouTube API ${response.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}

export async function executeYouTubeConnectorAction(action: YouTubeAction, fetchImpl: FetchLike = fetch) {
  const accessToken = await getAccessToken(fetchImpl);
  if (action.operation === "channel") {
    return googleJson(fetchImpl, "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true", accessToken);
  }
  if (action.operation === "videos") {
    const channel = await googleJson(fetchImpl, "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", accessToken);
    const uploads = channel?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error("No uploads playlist found for the authorized YouTube channel.");
    const maxResults = Math.max(1, Math.min(Number(action.max_results || 50), 50));
    const playlist = await googleJson(fetchImpl, `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploads)}&maxResults=${maxResults}`, accessToken);
    const ids = (playlist?.items || []).map((item: any) => item?.contentDetails?.videoId).filter(Boolean);
    if (!ids.length) return { items: [] };
    return googleJson(fetchImpl, `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(ids.join(","))}`, accessToken);
  }
  const ids = (action.video_ids || []).filter(Boolean);
  const filters = ids.length ? `&filters=${encodeURIComponent(`video==${ids.join(",")}`)}` : "";
  const metrics = ["views","estimatedMinutesWatched","averageViewDuration","subscribersGained","videoThumbnailImpressions","videoThumbnailImpressionsClickRate"].join(",");
  const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${encodeURIComponent(action.start_date)}&endDate=${encodeURIComponent(action.end_date)}&metrics=${encodeURIComponent(metrics)}&dimensions=video${filters}`;
  return googleJson(fetchImpl, url, accessToken);
}

function connectorToken() {
  return requiredEnv("AI_BOSS_YOUTUBE_CONNECTOR_TOKEN");
}

export function createYouTubeConnectorServer() {
  return http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/youtube") {
      res.writeHead(404).end("Not found");
      return;
    }
    let expectedToken = "";
    try { expectedToken = connectorToken(); } catch {
      res.writeHead(503).end("Connector not configured");
      return;
    }
    if (req.headers.authorization !== `Bearer ${expectedToken}`) {
      res.writeHead(401).end("Unauthorized");
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) req.destroy(new Error("Request too large"));
      else chunks.push(chunk);
    });
    req.on("end", async () => {
      try {
        const action = JSON.parse(Buffer.concat(chunks).toString("utf8")) as YouTubeAction;
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
