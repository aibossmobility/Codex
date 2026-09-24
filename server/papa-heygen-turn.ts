import crypto from "node:crypto";
import type { Express, Request } from "express";
import { buildPapaAiReply } from "./papa-ai-engine";

const DEFAULT_BRIAN_AVATAR_ID = "58763d9858c94dacb0d0bee6c258c316";
const REQUIRED_BRIAN_VOICE_ID = "Eo4ci7V2rQPrk0GndhOG";
const AUDIO_TTL_MS = 10 * 60 * 1000;
const RENDER_COOLDOWN_MS = 20 * 1000;

type AudioEntry = {
  audio: Buffer;
  contentType: string;
  expiresAt: number;
};

const audioCache = new Map<string, AudioEntry>();
const lastRenderByIp = new Map<string, number>();

function env(name: string) {
  return String(process.env[name] || "").trim();
}

function enabled() {
  return env("PAPA_HEYGEN_RENDER_ENABLED") === "1";
}

function testMode() {
  return env("PAPA_HEYGEN_RENDER_TEST") !== "0";
}

function heygenKey() {
  const key = env("HEYGEN_API_KEY");
  if (!key) throw new Error("HEYGEN_API_KEY is not configured.");
  return key;
}

function avatarId() {
  return env("PAPA_HEYGEN_AVATAR_ID") || DEFAULT_BRIAN_AVATAR_ID;
}

function renderBase(req: Request) {
  const configured = env("PAPA_RENDER_PUBLIC_BASE_URL");
  if (configured) return configured.replace(/\/$/, "");
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  return proto + "://" + req.get("host");
}

function cleanText(value: unknown, max = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}


async function synthesizeBrianVoice(text: string) {
  if (env("PAPA_ALLOW_ELEVENLABS_CREDITS") !== "1") {
    throw new Error("ElevenLabs credit use is disabled.");
  }
  const apiKey = env("ELEVENLABS_API_KEY");
  const voiceId = env("ELEVENLABS_VOICE_ID") || REQUIRED_BRIAN_VOICE_ID;
  if (!apiKey) throw new Error("ElevenLabs is not configured.");
  if (voiceId !== REQUIRED_BRIAN_VOICE_ID) {
    throw new Error("Refusing to render with a voice other than Brian Keith Hill.");
  }

  const response = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId),
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: env("ELEVENLABS_TTS_MODEL") || "eleven_v3",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true,
          speed: 0.9,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("ElevenLabs synthesis failed (" + response.status + "): " + detail.slice(0, 240));
  }
  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/mpeg",
  };
}

function purgeExpiredAudio() {
  const now = Date.now();
  for (const [token, entry] of audioCache.entries()) {
    if (entry.expiresAt <= now) audioCache.delete(token);
  }
}

async function createHeyGenVideo(audioUrl: string) {
  const response = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "x-api-key": heygenKey(),
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatarId(),
            avatar_style: "normal",
          },
          voice: {
            type: "audio",
            audio_url: audioUrl,
          },
        },
      ],
      dimension: { width: 1280, height: 720 },
      test: testMode(),
      caption: false,
      title: "Papa Life Digital Twin response",
    }),
  });

  const json = await response.json().catch(() => ({})) as any;
  const videoId = json?.data?.video_id || json?.video_id;
  if (!response.ok || !videoId) {
    const message = json?.error?.message || json?.message || "HeyGen render request failed (" + response.status + ").";
    throw new Error(message);
  }
  return String(videoId);
}

async function getHeyGenVideo(videoId: string) {
  const response = await fetch(
    "https://api.heygen.com/v1/video_status.get?video_id=" + encodeURIComponent(videoId),
    {
      headers: {
        "x-api-key": heygenKey(),
        accept: "application/json",
      },
    },
  );
  const json = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    throw new Error(json?.error?.message || "HeyGen status failed (" + response.status + ").");
  }
  const data = json?.data || json;
  return {
    status: String(data?.status || "unknown"),
    video_url: data?.video_url ? String(data.video_url) : null,
    thumbnail_url: data?.thumbnail_url ? String(data.thumbnail_url) : null,
    error: data?.error || null,
  };
}

export function registerPapaHeyGenTurnRoutes(app: Express) {
  app.get("/api/papa-twin/render-status", (_req, res) => {
    res.json({
      ok: true,
      enabled: enabled(),
      test_mode: testMode(),
      avatar_id_configured: Boolean(avatarId()),
      heygen_configured: Boolean(env("HEYGEN_API_KEY")),
      voice_provider: env("PAPA_VOICE_PROVIDER") || "off",
      mode: "rendered_turns",
    });
  });

  app.get("/api/papa-twin/audio/:token", (req, res) => {
    purgeExpiredAudio();
    const entry = audioCache.get(String(req.params.token || ""));
    if (!entry || entry.expiresAt <= Date.now()) {
      return res.status(404).end();
    }
    res.setHeader("Content-Type", entry.contentType || "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=0, no-store");
    res.setHeader("Content-Length", String(entry.audio.length));
    return res.send(entry.audio);
  });

  app.post("/api/papa-twin/render", async (req, res) => {
    if (!enabled()) {
      return res.status(503).json({ ok: false, error: "Brian video responses are not enabled yet." });
    }

    const message = cleanText(req.body?.message);
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
    if (!message) {
      return res.status(400).json({ ok: false, error: "Message is required." });
    }

    const ip = String(req.ip || req.socket.remoteAddress || "public");
    const now = Date.now();
    const last = lastRenderByIp.get(ip) || 0;
    if (now - last < RENDER_COOLDOWN_MS) {
      return res.status(429).json({
        ok: false,
        error: "Please wait a few seconds before asking Brian for another video response.",
      });
    }
    lastRenderByIp.set(ip, now);

    try {
      const reply = await buildPapaAiReply({ message, mode: "coach", history });
      const voice = await synthesizeBrianVoice(reply.reply);
      purgeExpiredAudio();

      const token = crypto.randomBytes(24).toString("hex");
      audioCache.set(token, {
        audio: voice.audio,
        contentType: voice.contentType,
        expiresAt: Date.now() + AUDIO_TTL_MS,
      });

      const audioUrl = renderBase(req) + "/api/papa-twin/audio/" + token;
      const videoId = await createHeyGenVideo(audioUrl);

      return res.json({
        ok: true,
        reply: reply.reply,
        provider: reply.provider,
        video_id: videoId,
        render_status: "submitted",
        test_mode: testMode(),
      });
    } catch (error) {
      console.error("[papa-twin] rendered response failed", error);
      return res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : "Brian video response could not be created.",
      });
    }
  });

  app.get("/api/papa-twin/render/:videoId", async (req, res) => {
    if (!enabled()) {
      return res.status(503).json({ ok: false, error: "Brian video responses are not enabled yet." });
    }
    try {
      const result = await getHeyGenVideo(String(req.params.videoId || ""));
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : "Brian video response status is unavailable.",
      });
    }
  });
}
