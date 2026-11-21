#!/usr/bin/env python3
"""Mac-initiated, private website report handoff to the owner Google workbook.

Requires a separate bearer token in a local chmod-600 file and dedicated
Sheets OAuth on the Mac. No browser access to either credential.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path.home() / ".ai-boss-os"
DEFAULT_TOKEN_FILE = ROOT / "secrets/papa-daily-report-relay.token"
DEFAULT_OAUTH_FILE = ROOT / "secrets/google-sheets-report-oauth.json"
BRANDS = {"papa-life": "Papa Life Daily", "ai-boss-mobility": "AI Boss Mobility Daily"}

def settings(env=None):
    env = env or os.environ
    url = env.get("PAPA_REPORT_WEBSITE_URL", "").rstrip("/")
    sheet_id = env.get("PAPA_REPORT_SHEETS_SPREADSHEET_ID", "")
    token_path = pathlib.Path(env.get("PAPA_REPORT_MAC_TOKEN_FILE", str(DEFAULT_TOKEN_FILE)))
    oauth_path = pathlib.Path(env.get("PAPA_REPORT_SHEETS_OAUTH_FILE", str(DEFAULT_OAUTH_FILE)))
    if not (url.startswith("https://") or url.startswith("http://127.0.0.1:") or url.startswith("http://localhost:")):
        raise RuntimeError("Website must be HTTPS except for loopback testing")
    if not sheet_id or not sheet_id.replace("_", "").replace("-", "").isalnum():
        raise RuntimeError("Private reporting spreadsheet ID required")
    if not token_path.is_file() or not oauth_path.is_file():
        raise RuntimeError("Local report token and Sheets authorization are required")
    if token_path.stat().st_mode & 0o077:
        raise RuntimeError("Local website relay token must not be readable by other users")
    token = token_path.read_text().strip()
    if len(token) < 32:
        raise RuntimeError("Website report relay token is missing or too short")
    return url, sheet_id, token, oauth_path

def request_json(url, bearer, obj):
    req = urllib.request.Request(url, data=json.dumps(obj).encode(), method="POST",
        headers={"Authorization": "Bearer " + bearer, "Content-Type": "application/json", "Cache-Control": "no-store"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)

def google_token(path):
    creds = json.loads(path.read_text())
    if "https://www.googleapis.com/auth/spreadsheets" not in creds.get("scope", "").split():
        raise RuntimeError("Sheets OAuth scope missing")
    body = urllib.parse.urlencode({**{k: creds[k] for k in ("client_id", "client_secret", "refresh_token")}, "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body, method="POST"), timeout=20) as r:
        return json.load(r)["access_token"]

def google_values(token, spreadsheet_id, range_, rows=None):
    url = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheet_id + "/values/" + urllib.parse.quote(range_, safe="")
    method = "GET"
    payload = None
    headers = {"Authorization": "Bearer " + token}
    if rows is not None:
        url += ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS"
        method = "POST"
        headers["Content-Type"] = "application/json"
        payload = json.dumps({"values": rows}).encode()
    with urllib.request.urlopen(urllib.request.Request(url, data=payload, headers=headers, method=method), timeout=25) as r:
        return json.load(r)

def safe_cell(value, maximum=3800):
    value = " ".join(str(value or "").split())[:maximum]
    return "'" + value if value.startswith(("=", "+", "-", "@")) else value

def report_row(report):
    report_id = report.get("id")
    brand = report.get("brand")
    if brand not in BRANDS or type(report_id) is not int or report_id <= 0:
        raise RuntimeError("Malformed website report")
    date = str(report.get("report_date") or "")[:10]
    if len(date) != 10 or date[4] != "-" or date[7] != "-":
        raise RuntimeError("Report has invalid date")
    return [date, "Website owner submission", safe_cell(report.get("markdown")),
            "Submitted by website owner (external outcomes not verified)",
            "Website daily report #" + str(report_id), safe_cell(report.get("created_by"), 100),
            "Verify report details and any claimed outcomes", safe_cell(report.get("created_at"), 70)]

def main(env=None, fetch=request_json, sheets=google_values):
    url, sheet_id, relay_token, oauth = settings(env)
    payload = fetch(url + "/api/internal/mac-daily-reports/pull", relay_token, {})
    if payload.get("ok") is not True or not isinstance(payload.get("reports"), list):
        raise RuntimeError("Private website report handoff failed")
    reports = payload["reports"]
    if len(reports) > 100:
        raise RuntimeError("Too many reports in one poll")
    if not reports:
        result = {"status": "verified", "pulled": 0, "appended": 0, "acknowledged": 0}
        print(json.dumps(result))
        return result
    token = google_token(oauth)
    existing = {}
    appended, acknowledged = 0, 0
    for report in reports:
        brand = report.get("brand")
        row = report_row(report)
        if brand not in existing:
            tab = BRANDS[brand]
            values = sheets(token, sheet_id, "'" + tab + "'!A1:H5000").get("values", [])
            existing[brand] = {str(r[4]) for r in values[1:] if len(r) > 4}
        marker = row[4]
        if marker not in existing[brand]:
            sheets(token, sheet_id, "'" + BRANDS[brand] + "'!A:H", [row])
            appended += 1
        # Read back independently before telling website the transfer succeeded.
        values = sheets(token, sheet_id, "'" + BRANDS[brand] + "'!A1:H5000").get("values", [])
        verified = {str(r[4]) for r in values[1:] if len(r) > 4}
        if marker not in verified:
            raise RuntimeError("Google readback did not verify website report")
        existing[brand] = verified
        receipt = fetch(url + "/api/internal/mac-daily-reports/" + str(report["id"]) + "/ack",
                        relay_token, {"evidenceKey": marker})
        if receipt.get("ok") is not True or receipt.get("status") != "synced_mac":
            raise RuntimeError("Website acknowledgment failed")
        acknowledged += 1
    result = {"status": "verified", "pulled": len(reports), "appended": appended, "acknowledged": acknowledged,
              "customer_facing_outcomes_verified": False}
    print(json.dumps(result))
    return result

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"status": "failed", "error_type": type(exc).__name__, "http_code": getattr(exc, "code", None)}), file=sys.stderr)
        sys.exit(1)
