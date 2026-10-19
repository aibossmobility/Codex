import assert from "node:assert/strict";
import { buildPapaAiReply } from "./papa-ai-engine";

const original = {
  enabled: process.env.PAPA_LIFE_PAID_CHAT_ENABLED,
  key: process.env.OPENAI_API_KEY,
  preferred: process.env.DEFAULT_AI_PROVIDER,
};
try {
  delete process.env.PAPA_LIFE_PAID_CHAT_ENABLED;
  process.env.OPENAI_API_KEY = "intentionally-not-a-real-credential";
  process.env.DEFAULT_AI_PROVIDER = "openai";
  const reply = await buildPapaAiReply({ message: "How do I listen to my adult daughter?" });
  assert.equal(reply.provider, "local", "Must not call paid API just because a key is present");
  assert.ok(reply.reply.trim());
  console.log("Public Papa Life AI defaults to no-paid-model local replies, even when an API key is configured");
} finally {
  if (original.enabled === undefined) delete process.env.PAPA_LIFE_PAID_CHAT_ENABLED;
  else process.env.PAPA_LIFE_PAID_CHAT_ENABLED = original.enabled;
  if (original.key === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = original.key;
  if (original.preferred === undefined) delete process.env.DEFAULT_AI_PROVIDER;
  else process.env.DEFAULT_AI_PROVIDER = original.preferred;
}
