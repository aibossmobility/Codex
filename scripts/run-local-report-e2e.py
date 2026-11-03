#!/usr/bin/env python3
"""Test real Google Sheets handoff with a local mock website relay, then clean up only test records."""
import importlib.util
import json
import os
import pathlib
import re
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parent.parent
SRC=ROOT/"scripts/mac-website-daily-report-pull.py"
spec=importlib.util.spec_from_file_location("mac_site_report",SRC)
worker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)
SHEET_ID=os.environ.get("PAPA_REPORT_SHEETS_SPREADSHEET_ID", "")
MARKERS={"Papa Life Daily":"Website daily report #900000001","AI Boss Mobility Daily":"Website daily report #900000002"}

def api(token,method,url,body=None):
    payload=None if body is None else json.dumps(body).encode()
    headers={"Authorization":"Bearer "+token}
    if body is not None:headers["Content-Type"]="application/json"
    with urllib.request.urlopen(urllib.request.Request(url, data=payload, headers=headers, method=method),timeout=25) as r:
        return json.load(r)

def find_test_rows(token):
    rows={}
    for tab,marker in MARKERS.items():
        data=worker.google_values(token,SHEET_ID,"'"+tab+"'!A1:H5000").get("values",[])
        rows[tab]=[i for i,row in enumerate(data) if len(row)>4 and row[4]==marker]
    return rows

def main():
    if not SHEET_ID: raise RuntimeError("Private spreadsheet ID required in environment")
    google=worker.google_token(worker.DEFAULT_OAUTH_FILE)
    before=find_test_rows(google)
    if any(before.values()):
        raise RuntimeError("Previous controlled test rows exist; stop instead of deleting ambiguous rows")
    with tempfile.TemporaryDirectory(prefix="papa-report-e2e-") as temp:
        temp=pathlib.Path(temp)
        key=temp/"bearer"
        key.write_text(secrets.token_urlsafe(48)); key.chmod(0o600)
        env={**os.environ,"PAPA_REPORT_MAC_TOKEN_FILE":str(key),"PAPA_REPORT_SHEETS_SPREADSHEET_ID":SHEET_ID}
        cmd=["pnpm","exec","tsx","scripts/website-report-relay-fixture.ts"]
        process=subprocess.Popen(cmd,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        try:
            line=process.stdout.readline().strip()
            match=re.fullmatch(r"RELAY_TEST_PORT=(\d+)",line)
            if not match: raise RuntimeError("Private local relay fixture failed to start")
            env["PAPA_REPORT_WEBSITE_URL"]="http://127.0.0.1:"+match.group(1)
            first=subprocess.run(["/usr/bin/python3",str(SRC)],env=env,capture_output=True,text=True,timeout=70)
            if first.returncode: raise RuntimeError("Mac Sheets handoff test failed: "+first.stdout[:120])
            first_data=json.loads(first.stdout)
            if (first_data.get("appended"),first_data.get("acknowledged"))!=(2,2): raise RuntimeError("Test didn't save both reports")
            second=subprocess.run(["/usr/bin/python3",str(SRC)],env=env,capture_output=True,text=True,timeout=40)
            if second.returncode or json.loads(second.stdout).get("appended")!=0: raise RuntimeError("Idempotent rerun failed")
            after=find_test_rows(google)
            if any(len(rows)!=1 for rows in after.values()):raise RuntimeError("Google readback did not match both brands exactly")
            print(json.dumps({"result":"PASS","real_google_sheets":True,"website_relay":"local isolated fixture",
                              "brands":["Papa Life","AI Boss Mobility"],"submitted":2,
                              "acknowledged":2,"second_run_appended":0,
                              "test_records_labeled":True}))
        finally:
            process.terminate()
            try:process.communicate(timeout=5)
            except subprocess.TimeoutExpired:process.kill();process.communicate(timeout=5)
    # Only delete the two exact unique synthetic rows we inserted, never real rows.
    latest=find_test_rows(google)
    if any(len(rows)!=1 for rows in latest.values()):
        raise RuntimeError("Test record cleanup skipped due to unexpected count")
    meta=api(google,"GET","https://sheets.googleapis.com/v4/spreadsheets/"+SHEET_ID+"?fields=sheets(properties(sheetId,title))")
    ids={s["properties"]["title"]:s["properties"]["sheetId"] for s in meta["sheets"]}
    requests=[]
    for tab,rows in latest.items():
        requests.append({"deleteDimension":{"range":{"sheetId":ids[tab],"dimension":"ROWS","startIndex":rows[0],"endIndex":rows[0]+1}}})
    api(google,"POST","https://sheets.googleapis.com/v4/spreadsheets/"+SHEET_ID+":batchUpdate",{"requests":requests})
    if any(find_test_rows(google).values()):
        raise RuntimeError("Controlled-test cleanup readback failed")
    print(json.dumps({"cleanup":"VERIFIED","removed_only_test_rows":2,"real_reporting_records_preserved":True}))

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print(json.dumps({"result":"FAILED","error_type":type(exc).__name__,"http_code":getattr(exc,"code",None)}),file=sys.stderr)
        sys.exit(1)
