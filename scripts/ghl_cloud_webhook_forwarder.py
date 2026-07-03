#!/usr/bin/env python3
"""
Forward unread ghl_contact_alerts to Brian's cloud (Make.com custom webhook).

Reads bossmobilelifecoach.com/.env for:
  AUTOMATION_CLOUD_WEBHOOK_URL (or MAKE_SCENARIO2_WEBHOOK_URL)
  GHL_WEBHOOK_SECRET (sent as Bearer on outbound POST)

Run once:
  python3 scripts/ghl_cloud_webhook_forwarder.py

Loop (cron every minute):
  python3 scripts/ghl_cloud_webhook_forwarder.py --watch 60

Or call the site API instead:
  POST /api/automation/forward-alert/:id
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "leads.db"
ENV_PATH = ROOT / ".env"
SITE_BASE = os.environ.get("PUBLIC_SITE_URL", "https://bossmobilelifecoach.com")


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def post_json(url: str, payload: dict, bearer: str | None) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")[:4000]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")[:4000]


def build_payload(row: sqlite3.Row) -> dict:
    tags = json.loads(row["tags_json"]) if row["tags_json"] else []
    name = " ".join(x for x in (row["first_name"], row["last_name"]) if x) or "New contact"
    contact_lines = ", ".join(
        x
        for x in [
            name,
            f"email {row['email']}" if row["email"] else None,
            f"phone {row['phone']}" if row["phone"] else None,
            f"source {row['source']}" if row["source"] else None,
            f"tags {', '.join(tags)}" if tags else None,
        ]
        if x
    )
    prompt = (
        f"New Papa Life / Boss Mobile lead: {contact_lines}. "
        "Use Brian's Papa Life voice. Suggest the best next outreach step. "
        f"Outreach note: {row['outreach_note'] or ''}. "
        f"Voice brief: {row['voice_prompt']}. "
        f'Reply via POST {SITE_BASE}/api/automation/claude-prompt with {{"prompt":"..."}}.'
    )
    return {
        "event": "ghl_new_contact",
        "prompt": prompt,
        "contact": {
            "ghl_contact_id": row["ghl_contact_id"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "email": row["email"],
            "phone": row["phone"],
            "source": row["source"],
            "tags": tags,
        },
        "outreach_note": row["outreach_note"],
        "voice_prompt": row["voice_prompt"],
        "alert_id": row["id"],
        "lead_id": row["lead_id"],
        "site_origin": SITE_BASE,
        "inbound": {
            "claude_prompt_url": f"{SITE_BASE}/api/automation/claude-prompt",
            "claude_prompt_body": {"prompt": "Your question about this lead"},
            "claude_prompt_response": {
                "ok": True,
                "response": "(Claude Papa Life text)",
                "voice": "papa_life",
            },
        },
    }


def forward_pending(env: dict[str, str], limit: int = 50) -> int:
    url = (
        env.get("AUTOMATION_CLOUD_WEBHOOK_URL")
        or env.get("MAKE_SCENARIO2_WEBHOOK_URL")
        or env.get("MAKE_CLOUD_WEBHOOK_URL")
    )
    if not url:
        print("Set AUTOMATION_CLOUD_WEBHOOK_URL in .env", file=sys.stderr)
        return 1

    bearer = env.get("GHL_WEBHOOK_SECRET") or env.get("MAKE_WEBHOOK_SECRET") or ""
    if not DB_PATH.is_file():
        print(f"Database not found: {DB_PATH}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT id, ghl_contact_id, first_name, last_name, email, phone, source, tags_json,
               outreach_note, voice_prompt, lead_id
        FROM ghl_contact_alerts
        WHERE cloud_forwarded_at IS NULL
        ORDER BY id ASC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    sent = 0
    for row in rows:
        payload = build_payload(row)
        status, body = post_json(url, payload, bearer or None)
        ok = 200 <= status < 300
        conn.execute(
            """
            UPDATE ghl_contact_alerts
            SET cloud_forwarded_at = datetime('now'), cloud_forward_status = ?
            WHERE id = ?
            """,
            ("ok" if ok else f"http_{status}", row["id"]),
        )
        conn.execute(
            """
            INSERT INTO automation_webhook_log (direction, target_url, payload_json, response_status, response_body, alert_id)
            VALUES ('outbound', ?, ?, ?, ?, ?)
            """,
            (url, json.dumps(payload), status, body, row["id"]),
        )
        conn.commit()
        print(f"alert {row['id']}: HTTP {status}" + ("" if ok else f" — {body[:200]}"))
        if ok:
            sent += 1

    conn.close()
    print(f"Forwarded {sent}/{len(rows)} alert(s)")
    return 0 if sent == len(rows) or not rows else 2


def main() -> int:
    parser = argparse.ArgumentParser(description="Forward GHL alerts to cloud webhook")
    parser.add_argument("--watch", type=int, default=0, help="Poll every N seconds (0 = run once)")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    env = {**load_env(ENV_PATH), **os.environ}

    if args.watch > 0:
        while True:
            forward_pending(env, args.limit)
            time.sleep(args.watch)
    return forward_pending(env, args.limit)


if __name__ == "__main__":
    raise SystemExit(main())