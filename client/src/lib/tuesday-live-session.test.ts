import assert from "node:assert/strict";
import { TUESDAY_LIVE_SESSION, TUESDAY_LIVE_SLIDES } from "./tuesday-live-session";

assert.equal(TUESDAY_LIVE_SESSION.topic, "When Silence Feels Personal");
assert.equal(TUESDAY_LIVE_SLIDES[0].heading, TUESDAY_LIVE_SESSION.topic);
assert.match(TUESDAY_LIVE_SLIDES[1].body, /adult child is quiet/i);
assert.match(TUESDAY_LIVE_SESSION.cue.join(" "), /silence can feel personal/i);
console.log("✓ Tuesday Live card, narration, and cue share the locked session source");
