#!/usr/bin/env python3
"""ja-proofread のレビュー画面を配信するローカルサーバー。

このスクリプトはサンドボックスの外（settings.json の sandbox.excludedCommands）で動くため、役割を次に限る。

- 127.0.0.1 で待ち受け、ui/ 配下の画面と作業ディレクトリの state.json・review.json を返す
- 画面からの回答を、作業ディレクトリの answers/<質問ID>.json と decisions.json にだけ書き込む
- 起動時にブラウザを開く

作業ディレクトリは `<TMPDIR>/ja-proofread-runs/<実行ID>` の形でなければ受け付けない。
ファイルの反映やその他の処理は、サンドボックス内で動く jp.py が行う。

使い方: python3 serve.py <作業ディレクトリ> [--no-open]
"""
from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

UI_DIR = Path(__file__).resolve().parent / "ui"
UI_FILES = {"/": ("index.html", "text/html; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
            "/style.css": ("style.css", "text/css; charset=utf-8")}
PORTS = range(3118, 3138)
RUN_ID_RE = re.compile(r"^\d{8}-\d{6}-[0-9a-f]{6}$")
QID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
MAX_BODY = 20_000_000
IDLE_AFTER_DONE = 15 * 60
MAX_LIFETIME = 6 * 3600


def fail(msg: str) -> None:
    print(json.dumps({"status": "failed", "error": msg}, ensure_ascii=False), flush=True)
    sys.exit(1)


def check_workdir(arg: str) -> Path:
    p = Path(arg).expanduser().resolve()
    if p.parent.name != "ja-proofread-runs" or not RUN_ID_RE.match(p.name):
        fail(f"作業ディレクトリの形式が不正です: {p}")
    if not (p / "run.json").is_file():
        fail(f"run.json がありません: {p}")
    return p


def read_json(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write_json_once(path: Path, obj) -> bool:
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    return True


def alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False


def make_handler(workdir: Path, token: str, port: int):
    allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}

    class Handler(BaseHTTPRequestHandler):
        server_version = "ja-proofread"

        def log_message(self, fmt, *args):  # 標準エラーへのアクセスログは出さない
            pass

        def _send(self, code: int, body: bytes, ctype: str = "application/json; charset=utf-8"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy",
                             "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:")
            self.end_headers()
            self.wfile.write(body)

        def _json(self, code: int, obj):
            self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"))

        def _guard(self, api: bool) -> bool:
            if self.headers.get("Host", "") not in allowed_hosts:
                self._json(403, {"error": "host"})
                return False
            if api and not hmac.compare_digest(self.headers.get("X-JP-Token", ""), token):
                self._json(403, {"error": "token"})
                return False
            return True

        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
                return
            if path in UI_FILES:
                if not self._guard(api=False):
                    return
                name, ctype = UI_FILES[path]
                self._send(200, (UI_DIR / name).read_bytes(), ctype)
                return
            if not path.startswith("/api/") or not self._guard(api=True):
                if not path.startswith("/api/"):
                    self._json(404, {"error": "not found"})
                return
            if path == "/api/state":
                state = read_json(workdir / "state.json", {})
                answered = sorted(p.stem for p in (workdir / "answers").glob("*.json"))
                self._json(200, {"state": state, "answered": answered,
                                 "review_ready": (workdir / "review.json").exists(),
                                 "submitted": (workdir / "decisions.json").exists()})
            elif path == "/api/review":
                data = read_json(workdir / "review.json")
                self._json(200 if data is not None else 404, data or {"error": "not ready"})
            else:
                self._json(404, {"error": "not found"})

        def do_POST(self):
            path = urlparse(self.path).path
            if not self._guard(api=True):
                return
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > MAX_BODY:
                self._json(400, {"error": "body"})
                return
            try:
                body = json.loads(self.rfile.read(length).decode("utf-8"))
            except ValueError:
                self._json(400, {"error": "json"})
                return
            if path == "/api/answer":
                qid = str(body.get("qid", ""))
                if not QID_RE.match(qid):
                    self._json(400, {"error": "qid"})
                    return
                ans = {"choice": body.get("choice"), "text": body.get("text", ""), "answered_at": time.time()}
                ok = write_json_once(workdir / "answers" / f"{qid}.json", ans)
                self._json(200 if ok else 409, {"ok": ok})
            elif path == "/api/submit":
                if not isinstance(body.get("blocks"), dict):
                    self._json(400, {"error": "blocks"})
                    return
                dec = {"excluded_files": [str(x) for x in body.get("excluded_files", [])],
                       "blocks": body["blocks"], "submitted_at": time.time()}
                ok = write_json_once(workdir / "decisions.json", dec)
                self._json(200 if ok else 409, {"ok": ok})
            else:
                self._json(404, {"error": "not found"})

    return Handler


def open_browser(url: str) -> None:
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", url], check=False, timeout=15)
        else:
            webbrowser.open(url)
    except Exception:
        pass


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("workdir")
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()
    workdir = check_workdir(args.workdir)
    run = read_json(workdir / "run.json", {})
    token = run.get("token") or fail("run.json に token がありません")

    info = read_json(workdir / "server.json")
    if info and alive(int(info.get("pid", 0))):
        if not args.no_open:
            open_browser(info["url"])
        print(json.dumps({"status": "ok", "url": info["url"], "reused": True}, ensure_ascii=False), flush=True)
        return

    httpd = None
    for port in PORTS:
        try:
            httpd = ThreadingHTTPServer(("127.0.0.1", port), make_handler(workdir, token, port))
            break
        except OSError:
            continue
    if httpd is None:
        fail(f"空いているポートがありません（{PORTS.start}〜{PORTS.stop - 1}）")
    port = httpd.server_address[1]
    url = f"http://127.0.0.1:{port}/?t={token}"
    (workdir / "server.json").write_text(json.dumps({"url": url, "port": port, "pid": os.getpid()}), encoding="utf-8")
    print(json.dumps({"status": "ok", "url": url}, ensure_ascii=False), flush=True)
    if not args.no_open:
        open_browser(url)

    started = time.time()

    def reaper():
        done_since = None
        while True:
            time.sleep(10)
            phase = (read_json(workdir / "state.json", {}) or {}).get("phase")
            if phase in ("done", "failed"):
                done_since = done_since or time.time()
            if (done_since and time.time() - done_since > IDLE_AFTER_DONE) or time.time() - started > MAX_LIFETIME:
                httpd.shutdown()
                return

    threading.Thread(target=reaper, daemon=True).start()
    try:
        httpd.serve_forever()
    finally:
        try:
            (workdir / "server.json").unlink()
        except OSError:
            pass


if __name__ == "__main__":
    socket.setdefaulttimeout(30)
    main()
