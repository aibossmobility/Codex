import type { Express } from "express";

const LIVEAVATAR_BASE_URL = "https://api.liveavatar.com";
const DEFAULT_SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";
const DEFAULT_PAPA_AGENT_ID = "F1Xz9oYC1pQFzumJSRHg";
const DEFAULT_BRIAN_VOICE_ID = "Eo4ci7V2rQPrk0GndhOG";
const DEFAULT_SECRET_NAME = "Papa Life ElevenLabs Agent Key";

function env(name: string, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function isSandbox() {
  return env("LIVEAVATAR_SANDBOX", "1") !== "0";
}

function liveAvatarApiKey() {
  return env("LIVEAVATAR_API_KEY");
}

function avatarId() {
  return env("LIVEAVATAR_AVATAR_ID", DEFAULT_SANDBOX_AVATAR_ID);
}

function papaAgentId() {
  return env("LIVEAVATAR_AGENT_ID", DEFAULT_PAPA_AGENT_ID);
}

function brianVoiceId() {
  return env("LIVEAVATAR_VOICE_ID", DEFAULT_BRIAN_VOICE_ID);
}

function secretName() {
  return env("LIVEAVATAR_ELEVENLABS_SECRET_NAME", DEFAULT_SECRET_NAME);
}

async function liveAvatarJson(pathname: string, init: RequestInit = {}) {
  const apiKey = liveAvatarApiKey();
  if (!apiKey) throw new Error("LIVEAVATAR_API_KEY is not configured.");

  const response = await fetch(LIVEAVATAR_BASE_URL + pathname, {
    ...init,
    headers: {
      "X-API-KEY": apiKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!response.ok) {
    const detail = payload?.message || payload?.detail?.[0]?.msg || ("HTTP " + response.status);
    throw new Error("LiveAvatar " + response.status + ": " + detail);
  }
  return payload;
}

let cachedSecretId = "";

async function ensureElevenLabsSecret() {
  const explicit = env("LIVEAVATAR_ELEVENLABS_SECRET_ID");
  if (explicit) return explicit;
  if (cachedSecretId) return cachedSecretId;

  const list = await liveAvatarJson("/v1/secrets");
  const secrets = Array.isArray(list?.data) ? list.data : [];
  const found = secrets.find(
    (item: any) =>
      String(item?.secret_name || "") === secretName() &&
      String(item?.secret_type || "") === "ELEVENLABS_API_KEY",
  );
  if (found?.id) {
    cachedSecretId = String(found.id);
    return cachedSecretId;
  }

  const elevenLabsKey = env("ELEVENLABS_API_KEY");
  if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY is not configured.");

  const created = await liveAvatarJson("/v1/secrets", {
    method: "POST",
    body: JSON.stringify({
      secret_type: "ELEVENLABS_API_KEY",
      secret_value: elevenLabsKey,
      secret_name: secretName(),
    }),
  });
  const id = String(created?.data?.id || "");
  if (!id) throw new Error("LiveAvatar did not return an ElevenLabs secret id.");
  cachedSecretId = id;
  return id;
}

async function createPapaLiveAvatarSession() {
  const secretId = await ensureElevenLabsSecret();
  const payload = {
    mode: "LITE",
    avatar_id: avatarId(),
    is_sandbox: isSandbox(),
    max_session_duration: Number(env("LIVEAVATAR_MAX_SESSION_SECONDS", "110")),
    elevenlabs_agent_config: {
      secret_id: secretId,
      agent_id: papaAgentId(),
      voice_id: brianVoiceId(),
    },
  };

  const created = await liveAvatarJson("/v1/sessions/token", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const token = String(created?.data?.session_token || "");
  if (!token) throw new Error("LiveAvatar did not return a session token.");
  return {
    session_id: String(created?.data?.session_id || ""),
    session_token: token,
  };
}

export function registerPapaLiveAvatarRoutes(app: Express) {
  app.get("/api/liveavatar/status", (_req, res) => {
    res.json({
      ok: true,
      configured: Boolean(liveAvatarApiKey() && env("ELEVENLABS_API_KEY")),
      sandbox: isSandbox(),
      avatar_mode: isSandbox() ? "sandbox" : "custom",
      agent_id: papaAgentId(),
      voice_name: "Brian Keith Hill",
    });
  });

  app.post("/api/liveavatar/session-token", async (_req, res) => {
    if (!liveAvatarApiKey()) {
      return res.status(503).json({
        ok: false,
        error: "LiveAvatar API key is not connected to the preview yet.",
        code: "LIVEAVATAR_NOT_CONFIGURED",
      });
    }
    try {
      const session = await createPapaLiveAvatarSession();
      return res.json({
        ok: true,
        ...session,
        sandbox: isSandbox(),
        voice_name: "Brian Keith Hill",
      });
    } catch (error) {
      console.error("[liveavatar] session token:", error);
      return res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : "LiveAvatar session failed.",
      });
    }
  });
}
