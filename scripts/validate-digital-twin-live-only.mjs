import fs from "node:fs";
import path from "node:path";

const files = [
  path.resolve("client/src/components/BrianLiveAvatar.tsx"),
  path.resolve("client/src/pages/DigitalTwinDemo.tsx"),
];

const forbidden = [
  ["papa-life-gold-master", "prerecorded green-sweater fallback"],
  ["GREEN_SWEATER_PREVIEW", "prerecorded preview constant"],
  ["digital-twin-mouth", "fake mouth-frame overlay"],
];


const brianPoster = path.resolve("client/src/components/BrianLiveAvatar.tsx");
const brianPosterSource = fs.readFileSync(brianPoster, "utf8");
if (brianPosterSource.includes("brian-digital-twin-real") && !brianPosterSource.includes('data-nonlive-poster="brian-green-sweater"')) {
  throw new Error("[digital-twin-live-only] Brian still image may only appear as an explicitly non-live identity poster.");
}
if (brianPosterSource.includes('src="/images/brian-digital-twin-real.png"') && brianPosterSource.includes("<video") && !brianPosterSource.includes("!isLive")) {
  throw new Error("[digital-twin-live-only] Brian poster must never replace or masquerade as the live video stream.");
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const [needle, label] of forbidden) {
    if (source.includes(needle)) {
      throw new Error(`[digital-twin-live-only] Forbidden ${label} found in ${path.relative(process.cwd(), file)}`);
    }
  }
}

console.log("[digital-twin-live-only] Live stream protected; explicit non-live Brian poster allowed.");
