#!/usr/bin/env python3
"""Idempotent Mac worker evidence -> owner's separate Google Sheets daily tabs.

Local-first, no fee, no public customer data, no ElevenLabs. Reads existing
internal proof outbox (read-only), writes only to Brian's restricted report Sheet.
"""
import datetime
import json
import os
import pathlib
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

ROOT = pathlib.Path.home() / ".ai-boss-os"
DB = ROOT / "research/worker-proof-sync/worker-proof-outbox.db"
AUTH = ROOT / "secrets/google-sheets-report-oauth.json"
SPREADSHEET_ID = os.environ.get("PAPA_REPORT_SHEETS_SPREADSHEET_ID", "").strip()
TABS = {"Papa Life": "Papa Life Daily", "AI Boss Mobility": "AI Boss Mobility Daily"}
API = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/"
KEY_PREFIX = "Mac worker proof #"
ROW_LIMIT = 5000

def credential():
    a = json.loads(AUTH.read_text())
    if "https://www.googleapis.com/auth/spreadsheets" not in a.get("scope", "").split():
        raise RuntimeError("Dedicated Sheets authorization is missing")
    form = {k: a[k] for k in ("client_id", "client_secret", "refresh_token")}
    form["grant_type"] = "refresh_token"
    request = urllib.request.Request("https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode(form).encode(), method="POST")
    with urllib.request.urlopen(request, timeout=20) as r:
        return json.load(r)["access_token"]

def sheet(token, a1, data=None, append=False):
    # Encode sheet names and spaces; preserve :append suffix.
    uri = API + urllib.parse.quote(a1, safe="")
    if append:
        uri += ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS"
    headers = {"Authorization": "Bearer " + token}
    payload = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(data).encode()
    req = urllib.request.Request(uri, headers=headers, data=payload,
        method="POST" if append else "GET")
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

def protect_cell(value, max_len=250):
    # Defensive: never permit spreadsheet formula execution.
    v = str(value or "").strip().replace("\r", " ").replace("\n", " ")[:max_len]
    return "'" + v if v.startswith(("=", "+", "-", "@")) else v

def read_evidence():
    conn = sqlite3.connect("file:" + str(DB) + "?mode=ro", uri=True)
    try:
        records = conn.execute("SELECT action_id, payload, state FROM outbox ORDER BY action_id").fetchall()
    finally:
        conn.close()
    out = defaultdict(list)
    for id_, raw, relay_state in records:
        try:
            item = json.loads(raw)
        except (ValueError, TypeError):
            continue
        brand = str(item.get("business", ""))
        if brand not in TABS or item.get("visibility") != "Internal evidence":
            continue
        if item.get("cost_usd") != 0 or relay_state != "accepted":
            continue
        day = str(item.get("completed_date", ""))[:10]
        if len(day) != 10:
            continue
        try:
            datetime.date.fromisoformat(day)
        except ValueError:
            continue
        qa = str(item.get("qa", "")).strip().lower()
        status = str(item.get("status", "")).strip().lower()
        if status == "failed":
            state = "Failed (local worker)"
        elif status == "completed locally" and qa == "passed":
            state = "Locally completed; QA passed (external outcome unverified)"
        elif status == "completed locally":
            state = "Local work; QA pending"
        else:
            state = "Unverified local work"
        # All text below originates from the pre-sanitized worker proof export.
        activity = protect_cell(item.get("title") or "Mac worker task", 180)
        worker = protect_cell(item.get("worker") or "Mac local worker", 90)
        evidence = KEY_PREFIX + str(id_)
        next_step = "Review external results" if qa == "passed" else "Investigate / verify QA"
        out[brand].append([day, "Mac worker evidence", activity, state, evidence,
                           worker, next_step, day + " (Mac proof)"])
    return out

def existing_keys(token, brand):
    tab = TABS[brand]
    data = sheet(token, f"'{tab}'!A1:H{ROW_LIMIT}")
    return {str(row[4]) for row in data.get("values", [])[1:] if len(row) > 4}

def main():
    dry = "--dry-run" in sys.argv
    if not SPREADSHEET_ID:
        raise RuntimeError("PAPA_REPORT_SHEETS_SPREADSHEET_ID must be configured locally")
    if not AUTH.is_file() or not DB.is_file():
        raise RuntimeError("Missing Mac source database or Google Sheets authorization")
    token = credential()
    entries = read_evidence()
    counts = {}
    for brand, tab in TABS.items():
        have = existing_keys(token, brand)
        new_rows = [row for row in entries[brand] if row[4] not in have]
        counts[brand] = {"eligible": len(entries[brand]), "existing": len(entries[brand]) - len(new_rows),
                         "new": len(new_rows)}
        if not dry and new_rows:
            for offset in range(0, len(new_rows), 50):
                batch = new_rows[offset:offset+50]
                sheet(token, f"'{tab}'!A:H", {"values": batch}, append=True)
            confirmed = existing_keys(token, brand)
            missing = [r[4] for r in new_rows if r[4] not in confirmed]
            if missing:
                raise RuntimeError(f"Google Sheets readback did not verify {len(missing)} rows for {brand}")
    print(json.dumps({"status": "dry-run" if dry else "verified",
        "source": "accepted Mac worker proof outbox",
        "counts": counts, "separate_business_tabs": True, "readback": not dry,
        "outside_results_unverified": True}))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"status": "failed", "error_type": type(exc).__name__,
            "http_code": getattr(exc, "code", None)}), file=sys.stderr)
        sys.exit(1)
