import assert from "node:assert/strict";
import { cloudWebhookUrl } from "./ghl-automation";

const saved = [
  process.env.AUTOMATION_CLOUD_WEBHOOK_URL,
  process.env.MAKE_SCENARIO2_WEBHOOK_URL,
  process.env.MAKE_CLOUD_WEBHOOK_URL,
];
try {
  process.env.AUTOMATION_CLOUD_WEBHOOK_URL = "https://legacy.example/secret";
  process.env.MAKE_SCENARIO2_WEBHOOK_URL = "https://legacy.example/scenario2";
  process.env.MAKE_CLOUD_WEBHOOK_URL = "https://legacy.example/cloud";
  assert.equal(cloudWebhookUrl(), null, "Legacy forwarding must remain disabled");
  console.log("Legacy cloud forwarding remains disabled even when old configuration variables are present");
} finally {
  ["AUTOMATION_CLOUD_WEBHOOK_URL", "MAKE_SCENARIO2_WEBHOOK_URL", "MAKE_CLOUD_WEBHOOK_URL"]
    .forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
}
