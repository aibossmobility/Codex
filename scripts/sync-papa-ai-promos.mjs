#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const publicBase = path.join(repoRoot, "client", "public", "images", "papa-ai-promos");
const manifestPath = path.join(publicBase, "manifest.json");
const currentDir = path.join(publicBase, "current");
const archiveDir = path.join(publicBase, "archive");
const defaultDriveLibraryPath = path.resolve(repoRoot, "..", "Papa Life AI Launch Graphics – June 30, 2026");
const launchIsoWeek = "2026-W27";
const launchStartsOn = "2026-06-30";

const sourceFolder = {
  id: "17aGEWs_6CMoHrQ5i6gOhw6dwzGg70wgK",
  name: "Papa Life AI Launch Graphics – June 30, 2026",
  url: "https://drive.google.com/drive/folders/17aGEWs_6CMoHrQ5i6gOhw6dwzGg70wgK",
};

const sourceSubfolders = {
  week1Launch: {
    id: "18zKJNFpndZcN8CBsAp2_H5JlX57uo4PD",
    url: "https://drive.google.com/drive/folders/18zKJNFpndZcN8CBsAp2_H5JlX57uo4PD",
  },
  templates: {
    id: "1PSsv6nbn0dknyz_p-EIgPVgJHjOKg_Iz",
    url: "https://drive.google.com/drive/folders/1PSsv6nbn0dknyz_p-EIgPVgJHjOKg_Iz",
  },
  logos: {
    id: "1xbyf40BorIBFmGv74SwkpdFl2MWUtgi-",
    url: "https://drive.google.com/drive/folders/1xbyf40BorIBFmGv74SwkpdFl2MWUtgi-",
  },
  weeklyPromoRotation: {
    id: "1YzjOxH8H-x8YRtfvOuSBgDTPWRcBpEVt",
    url: "https://drive.google.com/drive/folders/1YzjOxH8H-x8YRtfvOuSBgDTPWRcBpEVt",
    subfolders: {
      purpose: {
        id: "1ktxu3CF0g1VLfBcwQXkWdQ_ePOUYZXAW",
        url: "https://drive.google.com/drive/folders/1ktxu3CF0g1VLfBcwQXkWdQ_ePOUYZXAW",
      },
      authority: {
        id: "1iQKTp5wvQsokjm9aspuv9wtpsdF3lGjw",
        url: "https://drive.google.com/drive/folders/1iQKTp5wvQsokjm9aspuv9wtpsdF3lGjw",
      },
      presence: {
        id: "1_PBgckXf6ZLSvZbvSJ5CCNNXBbYycEq1",
        url: "https://drive.google.com/drive/folders/1_PBgckXf6ZLSvZbvSJ5CCNNXBbYycEq1",
      },
      alignment: {
        id: "1Y2PoKhXeXTqIM-R8gFksraae08UgnFdz",
        url: "https://drive.google.com/drive/folders/1Y2PoKhXeXTqIM-R8gFksraae08UgnFdz",
      },
    },
  },
};

const allowedPlatforms = new Map([
  ["website-hero", "1600x900"],
  ["website-promo", "1254x1254"],
  ["website-feature", "1024x1536"],
  ["website-inline", "1200x628"],
  ["instagram-square", "1080x1080"],
  ["instagram-story", "1080x1920"],
  ["facebook-linkedin", "1200x628"],
  ["x-post", "1600x900"],
  ["youtube-community", "1280x720"],
]);

const websitePlatforms = new Set(["website-hero", "website-promo", "website-feature", "website-inline"]);
const websitePlatformPriority = ["website-hero", "website-feature", "website-promo", "website-inline"];
const papaRotation = ["purpose", "authority", "presence", "alignment"];
const themeLines = {
  purpose: "Know why you are showing up before you decide what to say.",
  authority: "Lead with calm responsibility, not control.",
  presence: "Be there. Stay there. Rebuild trust through consistent connection.",
  alignment: "Bring your words, choices, and faith into the same direction.",
};

const filenamePattern =
  /^(?<isoWeek>\d{4}-W\d{2})_(?<pillar>purpose|authority|presence|alignment)_(?<topic>[a-z0-9]+(?:-[a-z0-9]+)*)_(?<platform>website-hero|website-promo|website-feature|website-inline|instagram-square|instagram-story|facebook-linkedin|x-post|youtube-community)_(?<size>\d{3,4}x\d{3,4})\.(?<ext>png|jpg|jpeg|webp)$/i;

function usage() {
  console.log("Papa Life AI promo sync");
  console.log("");
  console.log("Usage:");
  console.log("  pnpm sync:papa-ai-promos");
  console.log("  pnpm sync:papa-ai-promos /path/to/exported/folder");
  console.log("  pnpm sync:papa-ai-promos --check");
  console.log("");
  console.log("Filename pattern:");
  console.log("  YYYY-W##_pillar_topic-slug_platform_WIDTHxHEIGHT.ext");
  console.log("");
  console.log("Example:");
  console.log("  2026-W27_purpose_ai-launch_website-hero_1600x900.png");
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return [fullPath];
  });
}

function parsePromoFile(filePath) {
  const fileName = path.basename(filePath);
  const match = fileName.match(filenamePattern);
  if (!match?.groups) return null;

  const platform = match.groups.platform.toLowerCase();
  const size = match.groups.size.toLowerCase();
  const expectedSize = allowedPlatforms.get(platform);
  if (expectedSize !== size) {
    throw new Error(`${fileName} uses ${size}; expected ${expectedSize} for ${platform}.`);
  }

  return {
    fileName,
    isoWeek: match.groups.isoWeek.toUpperCase(),
    pillar: match.groups.pillar.toLowerCase(),
    topic: match.groups.topic.toLowerCase(),
    platform,
    size,
    ext: match.groups.ext.toLowerCase(),
  };
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) return {};
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifest) {
  fs.mkdirSync(publicBase, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function publicPathFor(asset, bucket = "archive") {
  const folder = bucket === "current" ? "current" : `archive/${asset.isoWeek}`;
  return `/images/papa-ai-promos/${folder}/${asset.fileName}`;
}

function copyAsset(sourcePath, asset) {
  const weekDir = path.join(archiveDir, asset.isoWeek);
  fs.mkdirSync(weekDir, { recursive: true });
  const archiveTarget = path.join(weekDir, asset.fileName);
  fs.copyFileSync(sourcePath, archiveTarget);

  let currentPath = null;
  if (websitePlatforms.has(asset.platform)) {
    fs.mkdirSync(currentDir, { recursive: true });
    const currentTarget = path.join(currentDir, asset.fileName);
    fs.copyFileSync(sourcePath, currentTarget);
    currentPath = publicPathFor(asset, "current");
  }

  return {
    ...asset,
    sourceFolderId: sourceFolder.id,
    path: publicPathFor(asset),
    currentPath,
  };
}

function isoWeekStartDate(isoWeek) {
  const match = isoWeek.match(/^(?<year>\d{4})-W(?<week>\d{2})$/);
  if (!match?.groups) return null;

  const year = Number(match.groups.year);
  const week = Number(match.groups.week);
  const janFourth = new Date(Date.UTC(year, 0, 4));
  const janFourthDay = janFourth.getUTCDay() || 7;
  const weekOneMonday = new Date(janFourth);
  weekOneMonday.setUTCDate(janFourth.getUTCDate() - janFourthDay + 1);
  const targetMonday = new Date(weekOneMonday);
  targetMonday.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7);
  return targetMonday;
}

function campaignWeekNumber(isoWeek) {
  const launchMonday = isoWeekStartDate(launchIsoWeek);
  const assetMonday = isoWeekStartDate(isoWeek);
  if (!launchMonday || !assetMonday) return 1;

  const weekOffset = Math.round((assetMonday.getTime() - launchMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, weekOffset + 1);
}

function campaignStartsOn(weekNumber) {
  const start = new Date(`${launchStartsOn}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7);
  return start.toISOString().slice(0, 10);
}

function titleCaseTopic(topic) {
  return topic
    .split("-")
    .map((part) => (part === "ai" ? "AI" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function expectedPillarForIsoWeek(isoWeek) {
  const weekNumber = campaignWeekNumber(isoWeek);
  return papaRotation[(weekNumber - 1) % papaRotation.length];
}

function selectCurrentWebsiteAsset(assets) {
  const websiteAssets = assets.filter((asset) => websitePlatforms.has(asset.platform));
  if (websiteAssets.length === 0) return null;

  const latestIsoWeek = websiteAssets
    .map((asset) => asset.isoWeek)
    .sort()
    .at(-1);
  const latestAssets = websiteAssets.filter((asset) => asset.isoWeek === latestIsoWeek);
  const expectedPillar = expectedPillarForIsoWeek(latestIsoWeek);
  const matchingRotation = latestAssets.filter((asset) => asset.pillar === expectedPillar);
  const candidates = matchingRotation.length > 0 ? matchingRotation : latestAssets;

  return candidates.sort((a, b) => {
    const platformScore = websitePlatformPriority.indexOf(a.platform) - websitePlatformPriority.indexOf(b.platform);
    if (platformScore !== 0) return platformScore;
    return a.fileName.localeCompare(b.fileName);
  })[0];
}

function buildManifest(existing, assets) {
  const merged = [...(Array.isArray(existing.assets) ? existing.assets : [])];
  for (const asset of assets) {
    const index = merged.findIndex((item) => item.fileName === asset.fileName);
    if (index >= 0) merged[index] = asset;
    else merged.push(asset);
  }

  const currentWebsiteAsset = selectCurrentWebsiteAsset(merged);
  const weekNumber = currentWebsiteAsset ? campaignWeekNumber(currentWebsiteAsset.isoWeek) : 1;
  const pillar = currentWebsiteAsset?.pillar || expectedPillarForIsoWeek(launchIsoWeek);
  const imagePath = currentWebsiteAsset?.currentPath || currentWebsiteAsset?.path;

  return {
    libraryName: "Papa Life AI Coach Graphics Library",
    updatedOn: new Date().toISOString().slice(0, 10),
    sourceFolder,
    sourceSubfolders,
    brandStyle: {
      background: "black",
      colors: ["red", "yellow", "green"],
      typography: "bold masculine",
      message: "faith-based fatherhood",
      logoPlacement: "bottom",
    },
    rotation: ["Purpose", "Authority", "Presence", "Alignment"],
    rotationStartsOn: launchStartsOn,
    filenamePattern: "YYYY-W##_pillar_topic-slug_platform_WIDTHxHEIGHT.ext",
    exampleFilename: "2026-W27_purpose_ai-launch_website-hero_1600x900.png",
    currentWeek: currentWebsiteAsset
      ? {
          weekNumber,
          isoWeek: currentWebsiteAsset.isoWeek,
          startsOn: campaignStartsOn(weekNumber),
          pillar: pillar.charAt(0).toUpperCase() + pillar.slice(1),
          topic: titleCaseTopic(currentWebsiteAsset.topic),
          themeLine: themeLines[pillar],
          websiteImage: imagePath,
          websiteHero: imagePath,
          platform: currentWebsiteAsset.platform,
        }
      : existing.currentWeek,
    assets: merged.sort((a, b) => `${a.isoWeek}_${a.platform}`.localeCompare(`${b.isoWeek}_${b.platform}`)),
  };
}

function checkWorkflow() {
  const manifest = readManifest();
  console.log(`Source folder: ${sourceFolder.name}`);
  console.log(sourceFolder.url);
  console.log(`Drive-synced path: ${defaultDriveLibraryPath}`);
  console.log(`Drive-synced path exists: ${fs.existsSync(defaultDriveLibraryPath) ? "yes" : "no"}`);
  console.log(`Manifest: ${path.relative(repoRoot, manifestPath)}`);
  console.log(`Assets tracked: ${Array.isArray(manifest.assets) ? manifest.assets.length : 0}`);
  if (manifest.currentWeek) {
    console.log("Current website promo:");
    console.log(`${manifest.currentWeek.isoWeek} ${manifest.currentWeek.pillar} - ${manifest.currentWeek.websiteImage || manifest.currentWeek.websiteHero}`);
  }
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (args.includes("--check")) {
  checkWorkflow();
  process.exit(0);
}

const sourceDir = args[0] || process.env.PAPA_AI_GRAPHICS_LIBRARY_PATH || defaultDriveLibraryPath;

if (!sourceDir) {
  usage();
  process.exit(1);
}

const resolvedSourceDir = path.resolve(sourceDir);
if (!fs.existsSync(resolvedSourceDir) || !fs.statSync(resolvedSourceDir).isDirectory()) {
  console.error(`Could not find exported graphics folder: ${resolvedSourceDir}`);
  process.exit(1);
}

const imageFiles = walkFiles(resolvedSourceDir).filter((filePath) => /\.(png|jpe?g|webp)$/i.test(filePath));
const parsedAssets = [];
const skipped = [];

for (const filePath of imageFiles) {
  const parsed = parsePromoFile(filePath);
  if (!parsed) {
    skipped.push(path.basename(filePath));
    continue;
  }
  parsedAssets.push({ sourcePath: filePath, asset: parsed });
}

if (parsedAssets.length === 0) {
  console.error("No valid promo image filenames were found.");
  if (skipped.length > 0) {
    console.error("Skipped files:");
    skipped.forEach((fileName) => console.error(`  ${fileName}`));
  }
  process.exit(1);
}

const copiedAssets = parsedAssets.map(({ sourcePath, asset }) => copyAsset(sourcePath, asset));
const nextManifest = buildManifest(readManifest(), copiedAssets);
writeManifest(nextManifest);

console.log(`Synced ${copiedAssets.length} Papa Life AI promo image(s).`);
console.log(`Updated ${path.relative(repoRoot, manifestPath)}.`);
if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length} file(s) with names outside the Papa Life pattern.`);
}
