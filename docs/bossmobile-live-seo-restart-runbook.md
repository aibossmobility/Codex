# BossMobileLifeCoach Live SEO Restart Runbook

Use this when SEO/server-rendering/404 fixes have been uploaded to the live server and need to be activated.

## Live app

- Domain: `https://bossmobilelifecoach.com`
- App folder: `/var/www/html/bossmobilelifecoach.com`
- Main website PM2 app: `papalife`
- Helper/MCP PM2 app: `papalife-mcp-http`
- PM2 path: `/usr/local/bin/pm2`

## Correct restart command

Run over SSH as `brian`:

```bash
cd /var/www/html/bossmobilelifecoach.com
bash scripts/restart.sh
```

The script builds the Vite app, regenerates static SEO HTML pages, bundles the server, and restarts only the Papa Life website.

The server's passwordless sudo allowance matches this command exactly:

```bash
sudo /usr/local/bin/pm2 restart papalife
```

Do not add flags such as `--update-env`. An altered command falls outside the exact sudo rule and prompts for an unavailable administrator password.

## Manual restart fallback

If only a website restart is needed after a completed build, run:

```bash
cd /var/www/html/bossmobilelifecoach.com
sudo /usr/local/bin/pm2 restart papalife
```

Do not restart `papalife-mcp-http` during a website release. If a separately approved MCP change ever requires an MCP restart, verify `papalife` is healthy first and perform that work as a distinct operation. Never restart both processes together.

## Post-restart checks

```bash
curl -I https://bossmobilelifecoach.com/this-page-should-not-exist-404-check
curl -I https://bossmobilelifecoach.com/sitemap.xml
curl -sL https://bossmobilelifecoach.com/papa-framework | head -80
```

Expected:

- Invalid URLs return `404`.
- `sitemap.xml` returns `200` and `application/xml`.
- Public SEO pages include visible HTML inside `<div id="root">`.

## Public search requirements

- Public pages must include meaningful page content in the raw HTML sent to the browser. Do not depend on client-side JavaScript alone for indexable page text.
- Add new public pages to `client/public/sitemap.xml` and `scripts/generate-static-seo-pages.mjs`.
- Keep `robots.txt` pointing to `https://bossmobilelifecoach.com/sitemap.xml`.
- Unknown public routes must return a real `404`, not a successful app shell.
- Paid/member-only content should stay behind login; public SEO pages can describe the offer but should not expose private lessons or protected downloads.

## Paid member access requirement

Active members with `payment_status = paid` must receive access to the full course library, even if old per-course access rows exist. Trial or inactive members should not receive full paid access unless intentionally upgraded.

After access-related changes, verify:

- All paid active members can access all courses.
- Every lesson has a `content_url`.
- Resource library rows with empty `file_url` are flagged before promising downloadable PDFs or workbooks.

## Lesson 55 video fix

The live database row was updated:

- Course ID: `7`
- Lesson ID: `55`
- Lesson: `Step 3: Run Your First Tool`
- Video URL: `/walkthrough/videos/P2P_Dojo_04_AI_Tools.mp4`
