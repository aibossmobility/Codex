type PapaVoiceProvider = "off" | "google_custom" | "elevenlabs" | "heygen";

const REQUIRED_VOICE_NAME = "Brian Keith Hill";
const REQUIRED_ELEVENLABS_VOICE_ID = "Eo4ci7V2rQPrk0GndhOG";

function env(name: string) {
  return String(process.env[name] || "").trim();
}

function provider(): PapaVoiceProvider {
  const raw = env("PAPA_VOICE_PROVIDER").toLowerCase();
  if (raw === "google_custom" || raw === "elevenlabs" || raw === "heygen") return raw;
  return "off";
}

function configuredVoiceName() {
  return env("PAPA_VOICE_NAME") || REQUIRED_VOICE_NAME;
}

function assertVoiceIdentity() {
  const name = configuredVoiceName();
  if (name !== REQUIRED_VOICE_NAME) {
    throw new Error(`Voice identity mismatch: expected "${REQUIRED_VOICE_NAME}", got "${name}".`);
  }
}

async function googleAccessToken() {
  const clientId = env("AI_BOSS_GOOGLE_CLIENT_ID");
  const clientSecret = env("AI_BOSS_GOOGLE_CLIENT_SECRET");
  const refreshToken = env("AI_BOSS_GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google OAuth credentials are not configured for Papa voice synthesis.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || `Google token refresh failed (${response.status}).`);
  }
  return json.access_token;
}

async function synthesizeGoogleCustomVoice(text: string) {
  const projectId = env("GOOGLE_CLOUD_PROJECT");
  const voiceCloningKey = env("PAPA_GOOGLE_VOICE_CLONING_KEY");
  if (!projectId || !voiceCloningKey) {
    throw new Error("Google custom voice is not configured yet.");
  }

  const accessToken = await googleAccessToken();
  const response = await fetch("https://texttospeech.googleapis.com/v1beta1/text:synthesize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "x-goog-user-project": projectId,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        language_code: "en-US",
        voice_clone: { voice_cloning_key: voiceCloningKey },
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    }),
  });

  const json = await response.json() as { audioContent?: string; error?: { message?: string } };
  if (!response.ok || !json.audioContent) {
    throw new Error(json.error?.message || `Google custom voice synthesis failed (${response.status}).`);
  }

  return {
    audio: Buffer.from(json.audioContent, "base64"),
    contentType: "audio/mpeg",
    provider: "google_custom" as const,
  };
}

async function synthesizeElevenLabs(text: string) {
  if (env("PAPA_ALLOW_ELEVENLABS_CREDITS") !== "1") {
    throw new Error("ElevenLabs credit use is disabled.");
  }
  const apiKey = env("ELEVENLABS_API_KEY");
  const voiceId = env("ELEVENLABS_VOICE_ID") || REQUIRED_ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("ElevenLabs is not configured.");
  if (voiceId !== REQUIRED_ELEVENLABS_VOICE_ID) {
    throw new Error("Refusing to synthesize with a voice other than Brian Keith Hill.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
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
    throw new Error(`ElevenLabs synthesis failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/mpeg",
    provider: "elevenlabs" as const,
  };
}


async function synthesizeHeyGen(text: string) {
  const apiKey = env("HEYGEN_API_KEY");
  const voiceId = env("PAPA_HEYGEN_VOICE_ID");
  if (!apiKey) throw new Error("HeyGen API key is not configured.");
  if (!voiceId) throw new Error("Papa Life HeyGen voice ID is not configured.");

  const response = await fetch("https://api.heygen.com/v3/voices/speech", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      input_type: "text",
      speed: Number(env("PAPA_HEYGEN_VOICE_SPEED") || "0.95"),
      language: "en",
    }),
  });

  const json = await response.json().catch(() => ({})) as any;
  const audioUrl =
    json?.audio_url ||
    json?.data?.audio_url ||
    json?.data?.url ||
    json?.result?.audio_url ||
    json?.result?.url ||
    json?.url;
  if (!response.ok || !audioUrl) {
    const shape = json && typeof json === "object" ? Object.keys(json).slice(0, 8).join(",") : "non-object";
    throw new Error(json?.error?.message || json?.message || `HeyGen synthesis failed (${response.status}; response keys: ${shape}).`);
  }

  const audioResponse = await fetch(String(audioUrl));
  if (!audioResponse.ok) {
    throw new Error(`HeyGen audio download failed (${audioResponse.status}).`);
  }

  return {
    audio: Buffer.from(await audioResponse.arrayBuffer()),
    contentType: audioResponse.headers.get("content-type") || "audio/wav",
    provider: "heygen" as const,
  };
}

export function getPapaVoiceBridgeStatus() {
  assertVoiceIdentity();
  const current = provider();
  const googleReady = Boolean(
    env("GOOGLE_CLOUD_PROJECT") &&
    env("PAPA_GOOGLE_VOICE_CLONING_KEY") &&
    env("AI_BOSS_GOOGLE_CLIENT_ID") &&
    env("AI_BOSS_GOOGLE_CLIENT_SECRET") &&
    env("AI_BOSS_GOOGLE_REFRESH_TOKEN"),
  );
  const elevenLabsReady = Boolean(
    env("ELEVENLABS_API_KEY") &&
    (env("ELEVENLABS_VOICE_ID") || REQUIRED_ELEVENLABS_VOICE_ID) === REQUIRED_ELEVENLABS_VOICE_ID &&
    env("PAPA_ALLOW_ELEVENLABS_CREDITS") === "1",
  );
  const heygenReady = Boolean(env("HEYGEN_API_KEY") && env("PAPA_HEYGEN_VOICE_ID"));

  return {
    ok: true,
    provider: current,
    voice_name: REQUIRED_VOICE_NAME,
    enabled:
      current === "google_custom" ? googleReady :
      current === "elevenlabs" ? elevenLabsReady :
      current === "heygen" ? heygenReady :
      false,
    google_custom_ready: googleReady,
    elevenlabs_ready: elevenLabsReady,
    heygen_ready: heygenReady,
    elevenlabs_credit_use_allowed: env("PAPA_ALLOW_ELEVENLABS_CREDITS") === "1",
    legacy_heygen_fallback_allowed: env("PAPA_ENABLE_LEGACY_HEYGEN_VOICE") === "1",
  };
}

export async function synthesizePapaVoice(text: string) {
  assertVoiceIdentity();
  const clean = String(text || "").trim();
  if (!clean) throw new Error("Text is required for voice synthesis.");
  if (clean.length > 4000) throw new Error("Voice synthesis text is too long.");

  const current = provider();
  if (current === "google_custom") return synthesizeGoogleCustomVoice(clean);
  if (current === "elevenlabs") return synthesizeElevenLabs(clean);
  if (current === "heygen") return synthesizeHeyGen(clean);
  throw new Error("Papa voice synthesis is disabled until the Brian Keith Hill voice bridge is configured.");
}
