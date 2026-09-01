import assert from "node:assert/strict";
import { executeGmailConnectorAction } from "./ai-boss-gmail-connector";

process.env.AI_BOSS_GMAIL_CLIENT_ID = "client-id";
process.env.AI_BOSS_GMAIL_CLIENT_SECRET = "client-secret";
process.env.AI_BOSS_GMAIL_REFRESH_TOKEN = "refresh-token";

const calls: Array<{ url: string; body?: string }> = [];
const fakeFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
  if (url.includes("oauth2.googleapis.com/token")) {
    return new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 });
  }
  if (url.includes("messages?q=")) {
    return new Response(JSON.stringify({ messages: [{ id: "m1" }] }), { status: 200 });
  }
  if (url.includes("messages/m1?format=metadata")) {
    return new Response(JSON.stringify({
      threadId: "t1",
      payload: { headers: [
        { name: "From", value: "person@example.com" },
        { name: "Subject", value: "Hello" },
        { name: "Message-ID", value: "<original@example.com>" },
      ] },
    }), { status: 200 });
  }
  if (url.endsWith("messages/send")) {
    return new Response(JSON.stringify({ id: "sent1", threadId: "t1" }), { status: 200 });
  }
  return new Response("not found", { status: 404 });
};
const search = await executeGmailConnectorAction({
  operation: "search",
  target_ref: "query:is:unread newer_than:7d",
}, fakeFetch);
assert.equal(search.messages[0].id, "m1");

const sent = await executeGmailConnectorAction({
  operation: "send",
  action_payload: { to: "dad@example.com", subject: "Test", body: "Hello" },
}, fakeFetch);
assert.equal(sent.id, "sent1");

const replied = await executeGmailConnectorAction({
  operation: "send",
  action_payload: { message_id: "m1", body: "Thanks for the note." },
}, fakeFetch);
assert.equal(replied.threadId, "t1");

const sendBodies = calls.filter((call) => call.url.endsWith("messages/send")).map((call) => JSON.parse(call.body || "{}"));
assert.equal(sendBodies.length, 2);
assert.ok(sendBodies[0].raw, "new message should be RFC 2822 encoded");
assert.equal(sendBodies[1].threadId, "t1");
assert.ok(sendBodies[1].raw, "reply should be RFC 2822 encoded");

console.log("✓ Gmail connector supports search, new send, and threaded reply without sending real mail");
