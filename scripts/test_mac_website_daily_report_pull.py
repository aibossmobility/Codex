import importlib.util
import json
import os
import pathlib
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).with_name("mac-website-daily-report-pull.py")
spec = importlib.util.spec_from_file_location("website_mac_report_pull", SCRIPT)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class ReportCollectorTest(unittest.TestCase):
    def test_two_brands_readback_and_idempotent_retry(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            token_path = root / "token"
            token_path.write_text("safe-test-token-abcdefghijklmnopqrstuvwxyz1234")
            token_path.chmod(0o600)
            oauth = root / "sheets-oauth.json"
            oauth.write_text("{}")
            config = {"PAPA_REPORT_WEBSITE_URL":"http://127.0.0.1:8764",
                      "PAPA_REPORT_SHEETS_SPREADSHEET_ID":"TEST_WORKBOOK_ID_123456789",
                      "PAPA_REPORT_MAC_TOKEN_FILE":str(token_path),
                      "PAPA_REPORT_SHEETS_OAUTH_FILE":str(oauth)}
            unacked = [
              {"id":1,"brand":"papa-life","report_date":"2026-11-02","markdown":"controlled Papa test","created_by":"owner"},
              {"id":2,"brand":"ai-boss-mobility","report_date":"2026-11-02","markdown":"controlled AI test","created_by":"owner"}]
            rows = {"Papa Life Daily":[["date","category","activity","state","evidence","agent","next","updated"]],
                    "AI Boss Mobility Daily":[["date","category","activity","state","evidence","agent","next","updated"]]}
            receipts = []
            def fetch(url, token, payload):
                self.assertEqual(token, token_path.read_text())
                if url.endswith("/pull"):
                    return {"ok":True,"reports":list(unacked)}
                if url.endswith("/ack"):
                    marker = payload["evidenceKey"]
                    id_ = int(url.split("/")[-2])
                    receipts.append((id_,marker))
                    unacked[:]=[item for item in unacked if item["id"]!=id_]
                    return {"ok":True,"status":"synced_mac"}
                raise AssertionError(url)
            def sheets(token, sheet, range_, add=None):
                self.assertEqual(token,"testGoogleToken")
                self.assertEqual(sheet,config["PAPA_REPORT_SHEETS_SPREADSHEET_ID"])
                tab = range_.split("'")[1]
                if add is not None:
                    rows[tab].extend(add)
                    return {"updates":{"updatedRows":len(add)}}
                return {"values":list(rows[tab])}
            with patch.object(worker,"google_token",return_value="testGoogleToken"):
                r=worker.main(config,fetch,sheets)
                self.assertEqual((r["pulled"],r["appended"],r["acknowledged"]),(2,2,2))
                self.assertEqual([row[4] for row in rows["Papa Life Daily"][1:]],["Website daily report #1"])
                self.assertEqual([row[4] for row in rows["AI Boss Mobility Daily"][1:]],["Website daily report #2"])
                r2=worker.main(config,fetch,sheets)
                self.assertEqual((r2["pulled"],r2["appended"]),(0,0))
                self.assertEqual(len(receipts),2)
    def test_spreadsheet_formula_is_escaped(self):
        self.assertEqual(worker.safe_cell("=SUM(1,2)"),"'=SUM(1,2)")

if __name__=="__main__":
    unittest.main()
