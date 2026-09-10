import { describe, expect, it } from "vitest";
import { executeWorkspaceAction } from "./ai-boss-google-workspace-connector";

function configuredEnv() {
  process.env.AI_BOSS_GOOGLE_CLIENT_ID = "client";
  process.env.AI_BOSS_GOOGLE_CLIENT_SECRET = "secret";
  process.env.AI_BOSS_GOOGLE_REFRESH_TOKEN = "refresh";
}

function fakeFetch(urls: string[]) {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "access" }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
}

describe("Google Workspace connector", () => {
  it("searches upcoming primary calendar events", async () => {
    configuredEnv();
    const urls: string[] = [];
    await executeWorkspaceAction(
      { system: "calendar", operation: "search", target_ref: "query:Papa Life" },
      fakeFetch(urls),
    );
    expect(urls[1]).toContain("calendar/v3/calendars/primary/events");
    expect(urls[1]).toContain("Papa+Life");
    expect(urls[1]).toContain("singleEvents=true");
  });

  it("searches Drive without returning trashed files", async () => {
    configuredEnv();
    const urls: string[] = [];
    await executeWorkspaceAction(
      { system: "drive", operation: "search", target_ref: "query:Tuesday Live" },
      fakeFetch(urls),
    );
    expect(urls[1]).toContain("drive/v3/files");
    expect(urls[1]).toContain("Tuesday");
    expect(urls[1]).toContain("trashed");
  });

  it("rejects mutation operations", async () => {
    configuredEnv();
    await expect(executeWorkspaceAction(
      { system: "calendar", operation: "write" } as never,
      fakeFetch([]),
    )).rejects.toThrow("read-only");
  });
});
