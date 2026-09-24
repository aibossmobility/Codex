import type { Express } from "express";

const LIVEAVATAR_BASE_URL = "https://api.liveavatar.com";
const DEFAULT_PAPA_AVATAR_ID = "86644f89aefc498b87f413307497f3e0";
const SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";
const DEFAULT_PAPA_AGENT_ID = "agent_7601kt209ptbe0qrd9b3e4gezyv6";
const DEFAULT_SECRET_NAME = "Papa Life ElevenLabs Agent Key";

function env(name: string, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function isSandbox() {
  return env("LIVEAVATAR_SANDBOX", "0") !== "0";
}

function liveAvatarApiKey() {
  return env("LIVEAVATAR_API_KEY");
}

function avatarId() {
  return env("LIVEAVATAR_AVATAR_ID", DEFAULT_PAPA_AVATAR_ID);
}

function papaAgentId() {
  return env("LIVEAVATAR_AGENT_ID", DEFAULT_PAPA_AGENT_ID);
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

let avatarAvailability: { id: string; expires: number; ready: boolean } | null = null;

async function hasCustomAvatar() {
  const id = avatarId();
  if (!liveAvatarApiKey() || isSandbox() || !id || id === SANDBOX_AVATAR_ID) return false;
  if (avatarAvailability?.id === id && avatarAvailability.expires > Date.now()) return avatarAvailability.ready;
  try {
    const result = await liveAvatarJson(`/v1/avatars/${encodeURIComponent(id)}`);
    const ready = Boolean(result?.data?.id === id);
    avatarAvailability = { id, ready, expires: Date.now() + 60_000 };
    return ready;
  } catch (error) {
    console.warn("[liveavatar] custom avatar unavailable:", error);
    avatarAvailability = { id, ready: false, expires: Date.now() + 60_000 };
    return false;
  }
}

export function registerPapaLiveAvatarRoutes(app: Express) {
  app.get("/api/liveavatar/status", async (_req, res) => {
    const configured = Boolean(env("ELEVENLABS_API_KEY") && papaAgentId() === DEFAULT_PAPA_AGENT_ID && await hasCustomAvatar());
    res.json({
      ok: true,
      configured,
      avatar_id: avatarId(),
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
    if (isSandbox() || avatarId() === SANDBOX_AVATAR_ID || papaAgentId() !== DEFAULT_PAPA_AGENT_ID) {
      return res.status(503).json({ ok: false, error: "Brian's custom live avatar is not configured.", code: "LIVEAVATAR_CUSTOM_AVATAR_REQUIRED" });
    }
    if (!await hasCustomAvatar()) {
      return res.status(503).json({ ok: false, error: "Brian's LiveAvatar is not available in this LiveAvatar account.", code: "LIVEAVATAR_AVATAR_NOT_FOUND" });
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
