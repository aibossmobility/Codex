# Papa Life AI Coach Graphics Workflow

## Source Library

Use this Google Drive folder as the source of truth for all Papa Life AI Coach launch, weekly promo, template, and logo graphics:

https://drive.google.com/drive/folders/17aGEWs_6CMoHrQ5i6gOhw6dwzGg70wgK

Folder name: Papa Life AI Launch Graphics – June 30, 2026

Drive-synced local path:

`../Papa Life AI Launch Graphics – June 30, 2026`

Confirmed subfolders:

- Week 1 - AI Launch
- Templates
- Logos
- Weekly Promo Rotation

Weekly Promo Rotation subfolders:

- Purpose
- Authority
- Presence
- Alignment

## Weekly Rotation

Rotate the weekly graphics around the PAPA Framework:

1. Purpose
2. Authority
3. Presence
4. Alignment

Week 1 starts on 2026-06-30 with Purpose and the AI Launch topic.

The website workflow uses this rotation when choosing the current weekly image. If multiple website graphics exist for the latest week, it prefers the one matching the expected PAPA pillar for that week.

## Brand Rules

- Black background
- Papa Life red, yellow, and green accents
- Bold masculine typography
- Faith-based fatherhood messaging
- Papa Life logo at the bottom of each graphic

## Website Destination

Website-ready graphics live here after export:

`client/public/images/papa-ai-promos/`

The current website hero graphic should be copied to:

`client/public/images/papa-ai-promos/current/`

Archived weekly graphics should be copied to:

`client/public/images/papa-ai-promos/archive/YYYY-W##/`

The public manifest that website and social workflows can read is:

`client/public/images/papa-ai-promos/manifest.json`

The `/ai-coach` page reads this manifest first and falls back to the default image in `client/src/content/papa-ai-graphics.ts` if the manifest cannot load.

## File Naming

Use this pattern for every finished image:

`YYYY-W##_pillar_topic-slug_platform_WIDTHxHEIGHT.ext`

Example:

`2026-W27_purpose_ai-launch_website-hero_1600x900.png`

Weekly examples:

- `2026-W27_purpose_ai-launch_website-promo_1254x1254.png`
- `2026-W28_authority_calm-leadership_instagram-square_1080x1080.png`
- `2026-W29_presence_stay-with-them_facebook-linkedin_1200x628.png`
- `2026-W30_alignment_words-and-walk_website-hero_1600x900.png`

Allowed pillars:

- purpose
- authority
- presence
- alignment

Core platform sizes:

- website-hero: 1600x900
- website-promo: 1254x1254
- website-feature: 1024x1536
- website-inline: 1200x628
- instagram-square: 1080x1080
- instagram-story: 1080x1920
- facebook-linkedin: 1200x628
- x-post: 1600x900
- youtube-community: 1280x720

## Sync Step

After adding final images to the Drive-synced graphics folder, run:

`pnpm sync:papa-ai-promos`

You can also sync from a separate export folder:

`pnpm sync:papa-ai-promos /path/to/exported/folder`

The sync step validates filenames, copies images into the website public folder, updates the manifest, and promotes the latest website hero image into the `current` folder.

To confirm the folder connection and current promo:

`pnpm sync:papa-ai-promos --check`
