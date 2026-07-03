#!/usr/bin/env node
import dotenv from "dotenv";

dotenv.config();

const expected = {
  provider: "elevenlabs",
  agentId: process.env.ELEVENLABS_AGENT_ID || "agent_7601kt209ptbe0qrd9b3e4gezyv6",
  agentName: process.env.ELEVENLABS_AGENT_NAME || "Brian Keith Hill",
  voiceId: process.env.ELEVENLABS_VOICE_ID || "Eo4ci7V2rQPrk0GndhOG",
  voiceName: process.env.ELEVENLABS_VOICE_NAME || "Brian Keith Hill",
};

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is missing.");
  process.exit(1);
}

async function elevenLabsJson(pathname) {
  const response = await fetch(`https://api.elevenlabs.io${pathname}`, {
    headers: {
      "xi-api-key": apiKey,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.detail?.message || data?.detail || response.statusText;
    throw new Error(`ElevenLabs ${response.status}: ${message}`);
  }
  return data;
}

const agent = await elevenLabsJson(`/v1/convai/agents/${encodeURIComponent(expected.agentId)}`);
const voice = await elevenLabsJson(`/v1/voices/${encodeURIComponent(expected.voiceId)}`);

const actual = {
  provider: expected.provider,
  agentId: expected.agentId,
  agentName: agent?.name || "",
  ttsModelId: agent?.conversation_config?.tts?.model_id || "",
  voiceId: agent?.conversation_config?.tts?.voice_id || "",
  voiceName: voice?.name || "",
  voiceOverrideAllowed: Boolean(agent?.platform_settings?.overrides?.conversation_config_override?.tts?.voice_id),
};

const errors = [];
if (actual.agentName !== expected.agentName) {
  errors.push(`agent name expected "${expected.agentName}", got "${actual.agentName}"`);
}
if (actual.voiceId !== expected.voiceId) {
  errors.push(`voice ID expected ${expected.voiceId}, got ${actual.voiceId || "none"}`);
}
if (actual.voiceName !== expected.voiceName) {
  errors.push(`voice name expected "${expected.voiceName}", got "${actual.voiceName}"`);
}
if (actual.voiceOverrideAllowed) {
  errors.push("client voice override is enabled");
}

console.log(JSON.stringify(actual, null, 2));

if (errors.length) {
  console.error(`Brian Keith Hill voice validation failed: ${errors.join("; ")}`);
  process.exit(1);
}

console.log("Brian Keith Hill voice validation passed.");
