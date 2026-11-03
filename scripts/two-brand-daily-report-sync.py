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

def append_executive_rollups(token, entries, dry):
    """One summary row per historical Mac proof date, without declaring external wins."""
    from datetime import datetime
    existing = sheet(token, "'Executive Dashboard'!A1:H" + str(ROW_LIMIT)).get("values", [])
    have = {str(r[6]) for r in existing[1:] if len(r) > 6}
    dates = sorted({row[0] for rows in entries.values() for row in rows})
    new = []
    for day in dates:
        key = "Mac proof rollup " + day
        if key in have:
            continue
        by_brand = {}
        total = 0
        waiting = 0
        failures = 0
        for brand in TABS:
            rows = [row for row in entries[brand] if row[0] == day]
            qa_pass = sum("QA passed" in row[3] for row in rows)
            qa_pending = sum("QA pending" in row[3] for row in rows)
            failed = sum("Failed" in row[3] for row in rows)
            by_brand[brand] = f"{len(rows)} local proof records; {qa_pass} QA passed; {qa_pending} pending; {failed} failed" if rows else "No Mac proof records"
            total += len(rows);waiting += qa_pending;failures += failed
        new.append([
            day,
            by_brand["Papa Life"],
            by_brand["AI Boss Mobility"],
            f"{total} local worker-evidence records; no external completion verified",
            f"{waiting} QA pending; {failures} failed (both brands)",
            "Review QA and customer-facing results before claiming completion",
            key,
            datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z"),
        ])
    if new and not dry:
        sheet(token, "'Executive Dashboard'!A:H", {"values": new}, append=True)
        check = sheet(token, "'Executive Dashboard'!A1:H" + str(ROW_LIMIT)).get("values", [])
        present = {str(r[6]) for r in check[1:] if len(r) > 6}
        missing = [row[6] for row in new if row[6] not in present]
        if missing: raise RuntimeError("Executive dashboard readback mismatch")
    return {"eligible_dates": len(dates), "new": len(new), "verified": not dry}

def append_executive_rollups(token, entries, dry=False):
    """Backfill per-date executive history with source-labelled Mac proof evidence."""
    source = "Mac worker-proof daily rollup"
    by_date = defaultdict(lambda: defaultdict(list))
    for brand, records in entries.items():
        for row in records:
            by_date[row[0]][brand].append(row)
    existing = sheet(token, "'Executive Dashboard'!A1:H5000").get("values", [])
    seen = {(str(row[0]), str(row[6])) for row in existing[1:] if len(row) > 6}
    new = []
    for day in sorted(by_date):
        if (day, source) in seen:
            continue
        groups = by_date[day]
        papa = groups["Papa Life"]
        ai = groups["AI Boss Mobility"]
        def status(rows):
            passed = sum("QA passed" in r[3] for r in rows)
            pending = sum("pending" in r[3].lower() for r in rows)
            failed = sum("Failed" in r[3] for r in rows)
            return f"{len(rows)} Mac proof records; {passed} local QA passed, {pending} pending, {failed} failed"
        # These are Mac-local evidence only, never customer-facing completion.
        new.append([day, status(papa), status(ai),
                    f"{len(papa) + len(ai)} historical local proof records, not independently verified external results",
                    "External outcomes not checked; some local QA records may be pending or failed",
                    "Review evidence and verify customer-facing outcomes before marking complete",
                    source, "Historical Mac worker evidence"])
    if new and not dry:
        sheet(token, "'Executive Dashboard'!A:H", {"values": new}, append=True)
        check = sheet(token, "'Executive Dashboard'!A1:H5000").get("values", [])
        after = {(str(r[0]), str(r[6])) for r in check[1:] if len(r) > 6}
        if any((row[0], source) not in after for row in new):
            raise RuntimeError("Executive rollup readback failed")
    return len(new)

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
    rollups = append_executive_rollups(token, entries, dry)
    rollups = append_executive_rollups(token, entries, dry=dry)
    print(json.dumps({"status": "dry-run" if dry else "verified",
        "source": "accepted Mac worker proof outbox",
        "counts": counts, "executive_rollups": rollups, "separate_business_tabs": True, "readback": not dry,
        "outside_results_unverified": True}))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"status": "failed", "error_type": type(exc).__name__,
            "http_code": getattr(exc, "code", None)}), file=sys.stderr)
        sys.exit(1)
