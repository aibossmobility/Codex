#!/usr/bin/env node
/**
 * Papa Life Mac-first voice outreach relay.
 *
 * Installed on Brian's Mac mini, not on Railway, and deliberately NOT started
 * until Desktop Commander can verify the correct Mac, token, transcript source,
 * privacy settings and explicit --activate.
 *
 * The existing Mac voice interface should write one already-transcribed,
 * owner-authorized recap JSON file to:
 * ~/.ai-boss-os/voice-outreach/pending/<stable-uuid>.json
 *
 * Example file:
 * {"source_ref":"macvoice:8d79801f-e148-4d86-9927-740f0e5a2694",
 *  "source":"mac_desktop_commander","authorized_to_store":true,
 *  "note":"Spoke with an interested father. Next step: follow up Thursday."}
 *
 * This does NOT record audio, start the microphone, clone a voice, contact
 * anyone, or start an ElevenLabs conversation.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const endpoint = "https://papalifecoach.com/api/papa-life/mac-voice/outreach";
const tokenFile = path.join(os.homedir(), ".config", "papa-life-os", "papa-report-mac-relay.token");
const pending = path.join(os.homedir(), ".ai-boss-os", "voice-outreach", "pending");
const delivered = path.join(os.homedir(), ".ai-boss-os", "voice-outreach", "delivered");

async function readToken() {
  const st = await fs.lstat(tokenFile);
  if (!st.isFile() || st.isSymbolicLink() || (st.mode & 0o077) !== 0 ||
      (typeof process.getuid === "function" && st.uid !== process.getuid())) {
    throw new Error("The Mac relay token must be a regular owner-only file (0600).");
  }
  const value = (await fs.readFile(tokenFile, "utf8")).trim();
  if (value.length < 32 || value.length > 256 || /\s/.test(value)) {
    throw new Error("The Mac relay token is invalid.");
  }
  return value;
}

async function run() {
  if (process.argv.length !== 3 || process.argv[2] !== "--activate") {
    throw new Error("Disabled. This script requires explicit --activate on Brian's Mac mini.");
  }
  if (os.platform() !== "darwin") {
    throw new Error("This private relay must run on the Mac mini, not cloud or Android.");
  }
  const token = await readToken();
  await fs.mkdir(pending, { recursive: true, mode: 0o700 });
  await fs.mkdir(delivered, { recursive: true, mode: 0o700 });
  const entries = (await fs.readdir(pending)).filter(name => /^[0-9a-zA-Z_.-]+\.json$/.test(name)).slice(0, 100);
  let sent = 0, blocked = 0;
  for (const entry of entries) {
    const file = path.join(pending, entry);
    try {
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16000) throw new Error("Invalid transcript file");
      const payload = JSON.parse(await fs.readFile(file, "utf8"));
      if (payload?.source !== "mac_desktop_commander" || payload?.authorized_to_store !== true ||
          typeof payload.note !== "string" || payload.note.trim().length < 2 ||
          typeof payload.source_ref !== "string") {
        throw new Error("Transcript was not authorized for storage");
      }
      const reply = await fetch(endpoint, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(payload),
      });
      const answer = await reply.json();
      if (!reply.ok || !answer.ok) throw new Error("Private Mac relay endpoint rejected the recap (HTTP " + reply.status + ")");
      await fs.rename(file, path.join(delivered, entry));
      sent++;
    } catch (e) {
      blocked++;
      // Never print transcripts, private contact details or authentication tokens.
      console.error("Not delivered:", entry, "-", e instanceof Error ? e.message : "unknown error");
    }
  }
  console.log(JSON.stringify({ pending: entries.length, delivered: sent, needs_review: blocked }));
  if (blocked) process.exitCode = 1;
}

run().catch(e => { console.error(e instanceof Error ? e.message : "Mac relay unavailable"); process.exitCode = 1; });
