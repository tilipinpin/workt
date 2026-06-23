#!/usr/bin/env python3
import base64
import json
import os
import re
import urllib.error
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "8080"))
CSV_PATH = os.path.join(os.path.dirname(__file__), "date", "usage_data.csv")
CSV_HEADER = "日期,开机时间,关机时间,使用时间，备注"

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "tilipinpin/workt")
GITHUB_FILE_PATH = os.environ.get("GITHUB_FILE_PATH", "date/usage_data.csv")

ENTRY_TYPES = {
    "leave": {"hours": "17", "start": "00:00:00", "end": "00:00:00", "default_remark": "请假"},
    "business_trip": {"hours": "16", "start": "00:00:00", "end": "00:00:00", "default_remark": "出差"},
    "on_site": {"hours": "8.75", "start": " ", "end": " ", "default_remark": "现场服务"},
}

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def build_csv_row(date, entry_type, remark="", start_time="", end_time="", hours=""):
    config = ENTRY_TYPES.get(entry_type)
    if not config:
        raise ValueError("无效的类型")

    mark = remark.strip() or config["default_remark"]
    if entry_type == "on_site" and start_time and end_time and hours:
        return f"{date},{start_time},{end_time},{hours},{mark}"
    return f"{date},{config['start']},{config['end']},{config['hours']},{mark}"


def upsert_csv_text(content, date, entry_type, remark="", start_time="", end_time="", hours=""):
    if not DATE_PATTERN.match(date):
        raise ValueError("日期格式无效")

    new_row = build_csv_row(date, entry_type, remark, start_time, end_time, hours)
    lines = content.splitlines() if content else []

    if not lines:
        lines = [CSV_HEADER]
    elif not lines[0].startswith("日期"):
        lines.insert(0, CSV_HEADER)

    updated = False
    for index in range(1, len(lines)):
        row = lines[index].strip()
        if not row:
            continue
        row_date = row.split(",", 1)[0].strip()
        if row_date == date:
            lines[index] = new_row
            updated = True
            break

    if not updated:
        lines.append(new_row)

    return "\n".join(lines) + "\n", updated, new_row


def write_local_csv(content):
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    with open(CSV_PATH, "w", encoding="utf-8", newline="\n") as file:
        file.write(content)


def github_request(url, method="GET", payload=None):
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "workt-manual-entry",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(detail).get("message", detail)
        except json.JSONDecodeError:
            message = detail
        raise ValueError(f"GitHub API 错误 ({error.code}): {message}") from error


def github_fetch_file():
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_FILE_PATH}"
    data = github_request(url)
    content = base64.b64decode(data["content"]).decode("utf-8")
    return content, data["sha"]


def github_push_file(content, sha, message):
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_FILE_PATH}"
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "sha": sha,
    }
    return github_request(url, method="PUT", payload=payload)


def upsert_csv_row(date, entry_type, remark="", start_time="", end_time="", hours=""):
    if GITHUB_TOKEN:
        content, sha = github_fetch_file()
        new_content, updated, new_row = upsert_csv_text(
            content, date, entry_type, remark, start_time, end_time, hours
        )
        github_push_file(new_content, sha, f"手动录入 {date}")
        write_local_csv(new_content)
        return {"updated": updated, "row": new_row, "github": True}

    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r", encoding="utf-8") as file:
            content = file.read()
    else:
        content = CSV_HEADER + "\n"

    new_content, updated, new_row = upsert_csv_text(
        content, date, entry_type, remark, start_time, end_time, hours
    )
    write_local_csv(new_content)
    return {"updated": updated, "row": new_row, "github": False}


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/entry":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")

        try:
            payload = json.loads(body or "{}")
            date = payload.get("date", "").strip()
            entry_type = payload.get("type", "").strip()
            remark = payload.get("remark", "")
            start_time = payload.get("startTime", "").strip()
            end_time = payload.get("endTime", "").strip()
            hours = payload.get("hours", "").strip()
            result = upsert_csv_row(date, entry_type, remark, start_time, end_time, hours)
            response = json.dumps({"ok": True, **result}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except (json.JSONDecodeError, ValueError) as error:
            response = json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False).encode("utf-8")
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except OSError as error:
            response = json.dumps({"ok": False, "error": f"写入失败: {error}"}, ensure_ascii=False).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))


if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    server = HTTPServer(("", PORT), Handler)
    print("Serving at http://localhost:%s" % PORT)
    print("CSV path: %s" % CSV_PATH)
    if GITHUB_TOKEN:
        print("GitHub sync: enabled (%s / %s)" % (GITHUB_REPO, GITHUB_FILE_PATH))
    else:
        print("GitHub sync: disabled (set GITHUB_TOKEN to enable)")
    server.serve_forever()
