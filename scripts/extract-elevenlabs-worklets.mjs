import { mkdir, readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../client/public/vendor/elevenlabs-convai-widget.js", import.meta.url);
const outputDirectory = new URL("../client/public/vendor/elevenlabs-worklets/", import.meta.url);
const bundle = await readFile(bundlePath, "utf8");

const worklets = [
  { name: "rawAudioProcessor", endMarker: "`),Am=" },
  { name: "audioConcatProcessor", endMarker: "`),xm=" },
];

await mkdir(outputDirectory, { recursive: true });

for (const worklet of worklets) {
  const startMarker = `=ym(\`${worklet.name}\`,\``;
  const start = bundle.indexOf(startMarker);
  if (start < 0) throw new Error(`Could not find ${worklet.name} in the ElevenLabs bundle.`);
  const sourceStart = start + startMarker.length;
  const end = bundle.indexOf(worklet.endMarker, sourceStart);
  if (end < 0) throw new Error(`Could not find the end of ${worklet.name}.`);
  await writeFile(new URL(`${worklet.name}.js`, outputDirectory), bundle.slice(sourceStart, end));
}
