import fs from "node:fs";
import path from "node:path";

const files = [
  path.resolve("client/src/components/BrianLiveAvatar.tsx"),
  path.resolve("client/src/pages/DigitalTwinDemo.tsx"),
];

const forbidden = [
  ["papa-life-gold-master", "prerecorded green-sweater fallback"],
  ["GREEN_SWEATER_PREVIEW", "prerecorded preview constant"],
  ["brian-digital-twin-real", "still-image Brian fallback"],
  ["digital-twin-mouth", "fake mouth-frame overlay"],
];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const [needle, label] of forbidden) {
    if (source.includes(needle)) {
      throw new Error(`[digital-twin-live-only] Forbidden ${label} found in ${path.relative(process.cwd(), file)}`);
    }
  }
}

console.log("[digital-twin-live-only] Live-stream-only visual path verified.");
