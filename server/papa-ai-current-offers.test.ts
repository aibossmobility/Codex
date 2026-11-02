import assert from "node:assert/strict";
import { buildPapaAiLocalReply, papaAiResources } from "./papa-ai-engine";

function answer(message: string, mode: "coach" | "tuesday" | "membership" = "coach") {
  const result = buildPapaAiLocalReply({ message, mode });
  assert.equal(result.provider, "local");
  return result.reply;
}

const live = answer("Are Tuesday Live coaching sessions discontinued? Please give a direct yes or no.");
assert.match(live, /^No\./);
assert.match(live, /no longer holds recurring Tuesday Live/i);
assert.doesNotMatch(live, /bring one real example|ask the question before Tuesday/i);
assert.match(answer("Can I join the next Tuesday Live?"), /no longer holds recurring/i);
assert.match(answer("Are past Tuesday Live recordings still educational resources?"), /historical educational content/i);
assert.match(answer("I'd like to attend a session", "tuesday"), /no longer holds recurring/i);

const membership = answer("Is the $4.99 Papa Life monthly membership available for new buyers?");
assert.match(membership, /^No\./);
assert.match(membership, /not a current public offer for new buyers/i);
assert.match(answer("How do I join?", "membership"), /former \$4\.99\/month.*not a current public offer/i);
const billing = answer("Can you cancel my existing membership subscription? I'm still being charged.");
assert.match(billing, /I cannot check or cancel yours/i);
assert.match(billing, /No cancellation or refund has been performed/i);

const framework = answer("What does PAPA stand for, in order?");
assert.ok(framework.indexOf("Presence") < framework.indexOf("Authority"));
assert.ok(framework.indexOf("Authority") < framework.indexOf("Purpose"));
assert.ok(framework.indexOf("Purpose") < framework.indexOf("Alignment"));

const relationship = answer("My adult daughter won't talk to me.");
assert.match(relationship, /steadier way to show up/i);
assert.doesNotMatch(relationship, /monthly membership|Tuesday Live sessions/i);
assert.match(answer("I am in danger and thinking about self harm."), /safety comes first/i);

assert.ok(!papaAiResources.some(resource => resource.path === "/tuesday" || resource.path === "/go/join"));
assert.ok(papaAiResources.some(resource => resource.path === "/shop#audio-lessons"));
console.log("✓ Papa Life local AI current-offer facts, safety, and relationship fallback");
