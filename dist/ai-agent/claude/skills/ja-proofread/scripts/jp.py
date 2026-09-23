#!/usr/bin/env python3
"""ja-proofread の補助スクリプト。

校閲対象の抽出、候補の取り込みと検証、レビュー画面用データの生成、反映を行う。
出力は常に JSON で、`status` が `ok` 以外なら失敗として扱う。
標準ライブラリだけで動く（Python 3.10 以上）。
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
from collections import Counter
from contextlib import contextmanager
from pathlib import Path

RUNS_DIRNAME = "ja-proofread-runs"
JA_RE = re.compile(r"[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]")
MARKER_RE = re.compile(r"^<!-- jp-block (b\d{3,})\b[^>]*-->\s*$")
SOURCES = ("gemini", "yomiyasu", "techwriting", "integrated", "concise")
SOURCE_LABELS = {
    "gemini": "japanese-natural-writing",
    "yomiyasu": "yomiyasu",
    "techwriting": "japanese-tech-writing",
    "integrated": "統合案",
    "concise": "統合案＋簡潔化",
}
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "build", "dist", "target", ".gradle",
             ".idea", ".next", ".nuxt", "vendor", ".mypy_cache", ".pytest_cache", "coverage"}


class UsageError(Exception):
    pass


def emit(obj: dict, code: int = 0) -> int:
    print(json.dumps(obj, ensure_ascii=False, indent=1))
    return code


def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


def load_json(path: Path, default=None):
    if not path.exists():
        if default is not None:
            return default
        raise UsageError(f"ファイルがありません: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, path)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def read_text(path: Path) -> str:
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def write_text(path: Path, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def has_ja(text: str) -> bool:
    return bool(JA_RE.search(text))


def wd(path: str) -> Path:
    p = Path(path).expanduser().resolve()
    if not (p / "run.json").exists():
        raise UsageError(f"作業ディレクトリではありません: {p}")
    return p


@contextmanager
def state_lock(workdir: Path):
    with open(workdir / ".state.lock", "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


def update_state(workdir: Path, fn) -> dict:
    with state_lock(workdir):
        state = load_json(workdir / "state.json", {})
        fn(state)
        state["updated_at"] = now()
        dump_json(workdir / "state.json", state)
        return state


def add_log(state: dict, message: str) -> None:
    log = state.setdefault("log", [])
    log.append({"time": now(), "message": message})
    del log[:-80]


# ------------------------------------------------------------------ init / progress / ask / wait


def cmd_init(args) -> int:
    base = Path(os.environ.get("TMPDIR", "/tmp")).resolve() / RUNS_DIRNAME
    run_id = dt.datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + secrets.token_hex(3)
    workdir = base / run_id
    (workdir / "files").mkdir(parents=True)
    (workdir / "answers").mkdir()
    request = Path(args.request_file).read_text(encoding="utf-8").strip() if args.request_file else ""
    dump_json(workdir / "run.json", {
        "run_id": run_id,
        "created_at": now(),
        "token": secrets.token_urlsafe(24),
        "cwd": os.getcwd(),
        "request": request,
    })
    dump_json(workdir / "state.json", {
        "phase": "resolving",
        "message": "校閲の対象を特定しています",
        "scope": {"request": request},
        "files": [],
        "questions": [],
        "log": [{"time": now(), "message": "開始しました"}],
    })
    return emit({"status": "ok", "workdir": str(workdir)})


def cmd_progress(args) -> int:
    workdir = wd(args.workdir)

    def fn(state):
        if args.phase:
            state["phase"] = args.phase
        if args.message:
            state["message"] = args.message
            add_log(state, args.message)
        if args.scope_file:
            scope = load_json(Path(args.scope_file))
            state.setdefault("scope", {}).update(scope)
        for item in args.file_status or []:
            fid, _, rest = item.partition("=")
            status, _, detail = rest.partition(":")
            for f in state.get("files", []):
                if f["id"] == fid:
                    f["status"] = status
                    f["detail"] = detail
    update_state(workdir, fn)
    return emit({"status": "ok"})


def cmd_ask(args) -> int:
    workdir = wd(args.workdir)
    q = load_json(Path(args.file))
    if not q.get("id") or not q.get("text"):
        raise UsageError("質問には id と text が必要です")
    q.setdefault("choices", [])
    q.setdefault("allow_free", True)
    q["status"] = "open"
    q["asked_at"] = now()

    def fn(state):
        qs = [x for x in state.setdefault("questions", []) if x["id"] != q["id"]]
        qs.append(q)
        state["questions"] = qs
        state["waiting_for"] = q["id"]
        add_log(state, f"質問しました: {q['text'][:60]}")
    update_state(workdir, fn)
    return emit({"status": "ok", "question": q["id"]})


def cmd_wait(args) -> int:
    workdir = wd(args.workdir)
    if args.what == "submit":
        target = workdir / "decisions.json"
    elif args.what.startswith("answer:"):
        target = workdir / "answers" / f"{args.what[7:]}.json"
    else:
        raise UsageError("--for には submit か answer:<質問ID> を指定します")
    deadline = time.time() + args.timeout
    while time.time() < deadline:
        if target.exists():
            data = load_json(target)
            if args.what.startswith("answer:"):
                qid = args.what[7:]

                def fn(state):
                    for q in state.get("questions", []):
                        if q["id"] == qid:
                            q["status"] = "answered"
                            q["answer"] = data
                    state.pop("waiting_for", None)
                    add_log(state, "質問への回答を受け取りました")
                update_state(workdir, fn)
                return emit({"status": "ok", "answer": data})
            return emit({"status": "ok", "submitted": True, "path": str(target)})
        time.sleep(2)
    return emit({"status": "pending"})


# ------------------------------------------------------------------ 抽出

LANGS: dict[str, dict] = {}


def _lang(exts, **spec):
    base = {"line": [], "block": [], "strings": [], "triple": [], "backtick": None}
    base.update(spec)
    for e in exts:
        LANGS[e] = base


_lang([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"],
      line=["//"], block=[("/*", "*/")], strings=['"', "'"], backtick="template")
_lang([".go"], line=["//"], block=[("/*", "*/")], strings=['"', "'"], backtick="raw")
_lang([".kt", ".kts"], line=["//"], block=[("/*", "*/")], strings=['"', "'"], triple=['"""'], backtick="ident")
_lang([".java", ".scala", ".groovy", ".gradle", ".swift"],
      line=["//"], block=[("/*", "*/")], strings=['"', "'"], triple=['"""'])
_lang([".dart"], line=["//"], block=[("/*", "*/")], strings=['"', "'"], triple=['"""', "'''"])
_lang([".c", ".h", ".cc", ".cpp", ".hpp", ".cxx", ".cs", ".rs", ".m", ".mm", ".jsonc", ".json5", ".css", ".scss",
       ".less", ".proto"],
      line=["//"], block=[("/*", "*/")], strings=['"', "'"])
_lang([".php"], line=["//", "#"], block=[("/*", "*/")], strings=['"', "'"])
_lang([".py", ".pyi"], line=["#"], strings=['"', "'"], triple=['"""', "'''"])
_lang([".rb", ".sh", ".bash", ".zsh", ".fish", ".pl", ".r", ".tf", ".toml", ".ex", ".exs", ".nim", ".cmake",
       ".mk", ".dockerfile", ".conf", ".ini", ".env.example"],
      line=["#"], strings=['"', "'"])
_lang([".sql"], line=["--"], block=[("/*", "*/")], strings=["'"])
_lang([".lua"], line=["--"], strings=['"', "'"])
_lang([".json"], strings=['"'])
_lang([".html", ".htm", ".xml", ".vue", ".svelte"], block=[("<!--", "-->")])
NAMED_FILES = {"Makefile": ".mk", "Dockerfile": ".dockerfile", "Rakefile": ".rb", "Gemfile": ".rb"}
MD_EXTS = {".md", ".markdown", ".mdx", ".txt"}


def detect_kind(path: Path) -> tuple[str, str | None]:
    ext = path.suffix.lower()
    if ext in MD_EXTS:
        return "md", ext
    if ext in (".yaml", ".yml"):
        return "yaml", ext
    if ext == ".properties":
        return "properties", ext
    if ext in LANGS:
        return "code", ext
    if path.name in NAMED_FILES:
        return "code", NAMED_FILES[path.name]
    return "unknown", None


def line_starts(text: str) -> list[int]:
    starts = [0]
    for i, ch in enumerate(text):
        if ch == "\n":
            starts.append(i + 1)
    return starts


def line_of(starts: list[int], offset: int) -> int:
    """0 始まりの行番号。"""
    lo, hi = 0, len(starts) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if starts[mid] <= offset:
            lo = mid
        else:
            hi = mid - 1
    return lo


def line_end(text: str, offset: int) -> int:
    """offset を含む行の、改行文字（\r\n を含む）を除いた終端。"""
    j = text.find("\n", offset)
    if j == -1:
        j = len(text)
    if j > 0 and text[j - 1:j] == "\r":
        j -= 1
    return j


def scan_code(text: str, spec: dict) -> list[dict]:
    """コメントと文字列リテラルを字句として切り出す（言語の厳密な構文解析はしない）。"""
    tokens = []
    i, n = 0, len(text)
    lines = sorted(spec["line"], key=len, reverse=True)
    triples = spec["triple"]
    while i < n:
        ch = text[i]
        matched = False
        for opener, closer in spec["block"]:
            if text.startswith(opener, i):
                j = text.find(closer, i + len(opener))
                end = n if j == -1 else j + len(closer)
                tokens.append({"type": "block_comment", "start": i, "end": end, "open": opener, "close": closer})
                i = end
                matched = True
                break
        if matched:
            continue
        for m in lines:
            if text.startswith(m, i):
                end = line_end(text, i)
                tokens.append({"type": "line_comment", "start": i, "end": end, "marker": m})
                i = end
                matched = True
                break
        if matched:
            continue
        for t in triples:
            if text.startswith(t, i):
                j = i + len(t)
                while j < n and not text.startswith(t, j):
                    j += 2 if text[j] == "\\" else 1
                end = min(n, j + len(t))
                tokens.append({"type": "string", "start": i, "end": end, "delim": t,
                               "cstart": i + len(t), "cend": min(j, n), "multiline": True})
                i = end
                matched = True
                break
        if matched:
            continue
        if ch in spec["strings"]:
            j = i + 1
            ok = False
            while j < n:
                c = text[j]
                if c == "\\":
                    j += 2
                    continue
                if c == "\n":
                    break
                if c == ch:
                    ok = True
                    break
                j += 1
            if ok:
                tokens.append({"type": "string", "start": i, "end": j + 1, "delim": ch,
                               "cstart": i + 1, "cend": j, "multiline": False})
                i = j + 1
            else:
                i += 1
            continue
        if ch == "`" and spec["backtick"]:
            mode = spec["backtick"]
            j = i + 1
            depth = 0
            ok = False
            while j < n:
                c = text[j]
                if mode == "ident" and c == "\n":
                    break
                if mode == "template":
                    if c == "\\":
                        j += 2
                        continue
                    if text.startswith("${", j):
                        depth += 1
                        j += 2
                        continue
                    if depth and c == "}":
                        depth -= 1
                        j += 1
                        continue
                if c == "`" and depth == 0:
                    ok = True
                    break
                j += 1
            if ok:
                tokens.append({"type": "string", "start": i, "end": j + 1, "delim": "`",
                               "cstart": i + 1, "cend": j, "multiline": mode != "ident",
                               "flavor": "kotlin_ident" if mode == "ident" else mode})
                i = j + 1
            else:
                i += 1
            continue
        i += 1
    return tokens


def _split_ws(content: str) -> tuple[str, str, str]:
    stripped = content.strip()
    if not stripped:
        return content, "", ""
    lead = content[: len(content) - len(content.lstrip())]
    trail = content[len(content.rstrip()):]
    return lead, stripped, trail


def blocks_from_code(text: str, spec: dict) -> list[dict]:
    starts = line_starts(text)
    tokens = scan_code(text, spec)
    blocks: list[dict] = []
    pending_group: list[dict] = []

    def own_line(tok) -> bool:
        ls = starts[line_of(starts, tok["start"])]
        return text[ls:tok["start"]].strip() == ""

    def flush_group():
        if not pending_group:
            return
        group = list(pending_group)
        pending_group.clear()
        if not any(has_ja(text[t["start"]:t["end"]]) for t in group):
            return
        first = group[0]
        ls = starts[line_of(starts, first["start"])]
        indent = text[ls:first["start"]]
        marker = first["marker"]
        body_lines = []
        for t in group:
            raw = text[t["start"] + len(marker):t["end"]]
            body_lines.append(raw[1:] if raw.startswith(" ") else raw)
        blocks.append({
            "kind": "comment", "style": "line", "start": ls, "end": group[-1]["end"],
            "prefix": indent + marker + " ", "prose": "\n".join(body_lines),
        })

    for tok in tokens:
        if tok["type"] == "line_comment" and own_line(tok):
            if pending_group:
                prev = pending_group[-1]
                prev_line = line_of(starts, prev["start"])
                cur_line = line_of(starts, tok["start"])
                same_indent = (text[starts[prev_line]:prev["start"]] == text[starts[cur_line]:tok["start"]])
                if cur_line == prev_line + 1 and same_indent and prev["marker"] == tok["marker"]:
                    pending_group.append(tok)
                    continue
                flush_group()
            pending_group.append(tok)
            continue
        flush_group()
        seg = text[tok["start"]:tok["end"]]
        if not has_ja(seg):
            continue
        if tok["type"] == "line_comment":
            raw = text[tok["start"] + len(tok["marker"]):tok["end"]]
            blocks.append({"kind": "comment", "style": "trailing", "start": tok["start"], "end": tok["end"],
                           "prefix": tok["marker"] + (" " if raw.startswith(" ") else ""),
                           "prose": raw[1:] if raw.startswith(" ") else raw})
        elif tok["type"] == "block_comment":
            b = parse_block_comment(text, tok, starts)
            if b:
                blocks.append(b)
        else:
            content = text[tok["cstart"]:tok["cend"]]
            lead, prose, trail = _split_ws(content)
            blocks.append({"kind": "literal", "start": tok["cstart"], "end": tok["cend"], "delim": tok["delim"],
                           "flavor": tok.get("flavor", ""), "multiline": tok["multiline"],
                           "lead": lead, "trail": trail, "prose": prose})
    flush_group()
    return blocks


def parse_block_comment(text: str, tok: dict, starts: list[int]) -> dict | None:
    raw = text[tok["start"]:tok["end"]]
    opener, closer = tok["open"], tok["close"]
    m = re.match(re.escape(opener) + r"[*!]*[ \t]?", raw)
    head = m.group(0) if m else opener
    if not raw.endswith(closer):
        return None
    lines = raw[len(head): len(raw) - len(closer)].split("\n")
    first_line_start = starts[line_of(starts, tok["start"])]
    indent = text[first_line_start:tok["start"]]
    if len(lines) == 1:
        body = lines[0]
        tail = body[len(body.rstrip()):]
        return {"kind": "comment", "style": "block1", "start": tok["start"], "end": tok["end"],
                "open": head, "close": tail + closer, "prose": body.strip()}
    inner_prefix = None
    out = []
    for idx, ln in enumerate(lines):
        ln = ln.rstrip("\r")
        if idx == 0:
            out.append(ln.strip())
            continue
        mm = re.match(r"^([ \t]*\*?[ \t]?)", ln) if opener == "/*" else re.match(r"^([ \t]*)", ln)
        p = mm.group(1)
        if inner_prefix is None and ln.strip():
            inner_prefix = p
        out.append(ln[len(p):] if ln.startswith(p) else ln.lstrip())
    last_raw = lines[-1].rstrip("\r")
    close_sep = last_raw[len(last_raw.rstrip()):]
    out = [ln.rstrip() for ln in out]
    opener_alone = out[0] == ""
    closer_alone = last_raw.strip() in ("", "*")
    if opener_alone:
        out = out[1:]
    if closer_alone:
        out = out[:-1]
    if inner_prefix is None:
        inner_prefix = indent + (" * " if opener == "/*" else "")
    closer_line = last_raw + closer if closer_alone else None
    return {"kind": "comment", "style": "block", "start": tok["start"], "end": tok["end"],
            "open": head.rstrip() if opener_alone else head, "opener_alone": opener_alone,
            "closer_alone": closer_alone, "closer_line": closer_line, "close": closer, "close_sep": close_sep or " ",
            "inner_prefix": inner_prefix, "prose": "\n".join(out)}


def blocks_from_md(text: str) -> list[dict]:
    starts = line_starts(text)
    lines = text.split("\n")
    blocks = []
    i = 0
    n = len(lines)
    fence_re = re.compile(r"^\s*(`{3,}|~{3,})")
    list_re = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+")
    heading_re = re.compile(r"^\s{0,3}#{1,6}\s")
    table_re = re.compile(r"^\s*\|")

    def add(a: int, b: int):  # 行 a..b-1
        start = starts[a]
        end = line_end(text, starts[b - 1])
        seg = text[start:end]
        if has_ja(seg):
            blocks.append({"kind": "md", "start": start, "end": end, "prose": seg})

    if lines and lines[0].strip() == "---":
        for j in range(1, n):
            if lines[j].strip() in ("---", "..."):
                i = j + 1
                break
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        m = fence_re.match(line)
        if m:
            fence = m.group(1)
            j = i + 1
            while j < n and not re.match(r"^\s*" + re.escape(fence[0]) + "{" + str(len(fence)) + ",}\\s*$", lines[j]):
                j += 1
            i = j + 1
            continue
        if line.lstrip().startswith("<!--"):
            j = i
            while j < n and "-->" not in lines[j]:
                j += 1
            i = j + 1
            continue
        if heading_re.match(line):
            add(i, i + 1)
            i += 1
            continue
        if table_re.match(line):
            j = i
            while j < n and table_re.match(lines[j]):
                j += 1
            add(i, j)
            i = j
            continue
        lm = list_re.match(line)
        if lm:
            item_indent = len(lm.group(1))
            j = i + 1
            while j < n and lines[j].strip() and not list_re.match(lines[j]) and not fence_re.match(lines[j]) \
                    and (len(lines[j]) - len(lines[j].lstrip()) > item_indent):
                j += 1
            add(i, j)
            i = j
            continue
        j = i + 1
        while j < n and lines[j].strip() and not heading_re.match(lines[j]) and not list_re.match(lines[j]) \
                and not fence_re.match(lines[j]) and not table_re.match(lines[j]) \
                and not lines[j].lstrip().startswith("<!--"):
            j += 1
        add(i, j)
        i = j
    return blocks


YAML_PLAIN_RE = re.compile(r"^(\s*(?:-\s+)?[^#'\"\s][^:#]*:\s+|\s*-\s+)([^'\"|>&*!%@`{\[#\s].*?)\s*(\s#.*)?$")
PROP_RE = re.compile(r"^(\s*[^#!\s][^=:]*?\s*[=:]\s*)(.+?)\s*$")


def blocks_from_lines(text: str, kind: str) -> list[dict]:
    """YAML と properties: コメント・引用符付き文字列・行の値を拾う。"""
    starts = line_starts(text)
    spec = {"line": ["#"] if kind == "yaml" else ["#", "!"], "block": [], "strings": ['"', "'"] if kind == "yaml" else [],
            "triple": [], "backtick": None}
    blocks = blocks_from_code(text, spec)
    covered = [(b["start"], b["end"]) for b in blocks]
    for idx, ls in enumerate(starts):
        le = line_end(text, ls)
        line = text[ls:le]
        rx = YAML_PLAIN_RE if kind == "yaml" else PROP_RE
        m = rx.match(line)
        if not m or not has_ja(m.group(2)):
            continue
        s = ls + m.start(2)
        e = ls + m.end(2)
        if any(a <= s < b for a, b in covered):
            continue
        blocks.append({"kind": "literal", "start": s, "end": e, "delim": "", "flavor": kind + "_plain",
                       "multiline": False, "lead": "", "trail": "", "prose": text[s:e]})
    blocks.sort(key=lambda b: b["start"])
    return blocks


def blocks_from_manual(text: str, spans: list[dict]) -> list[dict]:
    blocks = []
    for sp in spans:
        needle = sp["text"]
        nth = sp.get("occurrence", 1)
        pos = -1
        for _ in range(nth):
            pos = text.find(needle, pos + 1)
            if pos == -1:
                raise UsageError(f"指定された文字列が見つかりません（{nth}番目）: {needle[:60]!r}")
        blocks.append({"kind": sp.get("kind", "literal"), "start": pos, "end": pos + len(needle), "delim": "",
                       "flavor": "manual", "multiline": "\n" in needle, "lead": "", "trail": "", "prose": needle})
    blocks.sort(key=lambda b: b["start"])
    return blocks


def parse_ranges(spec: str | None) -> list[tuple[int, int]] | None:
    if not spec:
        return None
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        a, _, b = part.partition("-")
        out.append((int(a), int(b or a)))
    return out


def cmd_add_file(args) -> int:
    workdir = wd(args.workdir)
    src = Path(args.path).expanduser().resolve()
    if not src.is_file():
        raise UsageError(f"ファイルがありません: {src}")
    try:
        text = read_text(src)
    except UnicodeDecodeError:
        raise UsageError(f"UTF-8 として読めません: {src}")
    kind, ext = detect_kind(src)
    if args.manual:
        blocks = blocks_from_manual(text, load_json(Path(args.manual)))
        kind = kind if kind != "unknown" else "manual"
    elif kind == "md":
        blocks = blocks_from_md(text)
    elif kind == "code":
        blocks = blocks_from_code(text, LANGS[ext])
    elif kind in ("yaml", "properties"):
        blocks = blocks_from_lines(text, kind)
    else:
        return emit({"status": "unsupported", "path": str(src),
                     "hint": "形式を判定できません。--manual で対象の文字列を指定してください"}, 1)

    ranges = parse_ranges(args.lines)
    starts = line_starts(text)
    for b in blocks:
        b["line_start"] = line_of(starts, b["start"]) + 1
        b["line_end"] = line_of(starts, max(b["start"], b["end"] - 1)) + 1
    if ranges is not None:
        blocks = [b for b in blocks if any(not (b["line_end"] < a or b["line_start"] > z) for a, z in ranges)]

    run = load_json(workdir / "run.json")
    state = load_json(workdir / "state.json")
    for f in state.get("files", []):
        if f["abs"] == str(src):
            return emit({"status": "ok", "file_id": f["id"], "blocks": f["blocks"], "note": "登録済み"})
    fid = f"f{len(state.get('files', [])) + 1:02d}"
    fdir = workdir / "files" / fid
    fdir.mkdir(parents=True, exist_ok=True)
    for idx, b in enumerate(blocks, 1):
        b["id"] = f"b{idx:03d}"
    write_text(fdir / "source", text)
    try:
        rel = str(src.relative_to(Path(args.root or run["cwd"]).resolve()))
    except ValueError:
        rel = str(src)
    meta = {"id": fid, "abs": str(src), "path": rel, "kind": kind, "ext": ext, "sha256": sha256_text(text),
            "md_rules": kind == "md"}
    dump_json(fdir / "meta.json", meta)
    dump_json(fdir / "blocks.json", blocks)
    write_text(fdir / "pack.md", make_pack(meta, blocks))

    def fn(st):
        st.setdefault("files", []).append({"id": fid, "path": rel, "abs": str(src), "kind": kind,
                                           "blocks": len(blocks),
                                           "status": "queued" if blocks else "skipped",
                                           "detail": "" if blocks else "日本語の校閲対象がありません"})
    update_state(workdir, fn)
    return emit({"status": "ok", "file_id": fid, "kind": kind, "blocks": len(blocks),
                 "pack": str(fdir / "pack.md")})


def make_pack(meta: dict, blocks: list[dict]) -> str:
    parts = [f"<!-- jp-pack file={meta['path']} kind={meta['kind']} -->", ""]
    for b in blocks:
        label = b["kind"] + (f"/{b['style']}" if b.get("style") else "") + (f"/{b['flavor']}" if b.get("flavor") else "")
        parts += [f"<!-- jp-block {b['id']} {label} line={b['line_start']} -->", "", b["prose"], ""]
    return "\n".join(parts)


# ------------------------------------------------------------------ 候補の検証と元の形への復元

PH_RE = re.compile(
    r"%(?:\d+\$)?[-#+ 0,(]*\d*(?:\.\d+)?[sdifoxXeEgGcbnu@%]"
    r"|\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*"
    r"|\{\{[^}]*\}\}|\{[A-Za-z0-9_.\-:]*\}"
    r"|\\u[0-9a-fA-F]{4}|\\.")


def placeholders(text: str) -> Counter:
    return Counter(PH_RE.findall(text))


def validate_prose(block: dict, prose: str) -> list[str]:
    errs = []
    if MARKER_RE.search(prose) or "<!-- jp-block" in prose:
        errs.append("区切りの目印が本文に混入しています")
    if block["kind"] == "literal":
        if placeholders(block["prose"]) != placeholders(prose):
            errs.append("プレースホルダーまたはエスケープが原文と一致しません")
        if not block.get("multiline") and "\n" in prose:
            errs.append("1行の文字列リテラルに改行が含まれています")
        delim = block.get("delim") or ""
        if delim and len(delim) == 1 and re.search(r"(?<!\\)" + re.escape(delim), prose):
            errs.append(f"文字列の区切り文字 {delim} が含まれています")
        if delim and len(delim) == 3 and delim in prose:
            errs.append(f"文字列の区切り {delim} が含まれています")
        if block.get("flavor") == "kotlin_ident" and re.search(r"[`.;\[\]/<>:\\\n]", prose):
            errs.append("Kotlin のバッククォート識別子に使えない文字が含まれています")
        if block.get("flavor") == "yaml_plain" and (re.search(r": |\s#", prose) or prose[:1] in "'\"|>&*!%@`{[#-?"):
            errs.append("YAML の引用符なし値に使えない書き方が含まれています")
    elif block["kind"] == "comment":
        if block.get("style") in ("block", "block1") and block.get("close", "") in prose:
            errs.append("コメントの終端記号が含まれています")
        if block.get("style") in ("trailing", "block1") and "\n" in prose:
            errs.append("1行のコメントに改行が含まれています")
    if not prose.strip() and block["prose"].strip() and not deletable(block):
        errs.append("この種類の箇所は空にできません（Markdown のブロックと行コメントだけを丸ごと削除できます）")
    return errs


def deletable(block: dict) -> bool:
    return block["kind"] == "md" or (block["kind"] == "comment" and block.get("style") == "line")


def to_raw(block: dict, prose: str) -> str:
    """校閲後の本文を、ソースに書き戻す形（コメント記号などを付けた形）に戻す。"""
    k = block["kind"]
    if k == "md":
        return prose
    if k == "literal":
        return block.get("lead", "") + prose + block.get("trail", "")
    style = block["style"]
    if style == "line":
        # 範囲は1行目の行頭から始まるので、どの行にもインデントを含む接頭辞を付ける
        p = block["prefix"]
        return "\n".join((p + ln) if ln else p.rstrip() for ln in prose.split("\n"))
    if style == "trailing":
        return block["prefix"] + prose
    if style == "block1":
        return block["open"] + prose + block["close"]
    lines = prose.split("\n")
    out = []
    ip = block["inner_prefix"]
    if block["opener_alone"]:
        out.append(block["open"])
        out += [(ip + ln) if ln else ip.rstrip() for ln in lines]
    else:
        out.append(block["open"] + lines[0])
        out += [(ip + ln) if ln else ip.rstrip() for ln in lines[1:]]
    if block["closer_alone"]:
        out.append(block["closer_line"])
        return "\n".join(out)
    return "\n".join(out) + block["close_sep"] + block["close"]


WRAP_KEYS = ("prefix", "open", "close", "close_sep", "inner_prefix", "opener_alone", "closer_alone", "closer_line",
             "lead", "trail")


def raw_original(text: str, block: dict) -> str:
    return text[block["start"]:block["end"]]


def parse_pack(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    order: list[str] = []
    cur = None
    buf: list[str] = []
    for line in text.split("\n"):
        m = MARKER_RE.match(line.strip())
        if m:
            if cur:
                result[cur] = "\n".join(buf)
            cur = m.group(1)
            order.append(cur)
            buf = []
            continue
        if cur:
            buf.append(line)
    if cur:
        result[cur] = "\n".join(buf)
    for k, v in result.items():
        result[k] = re.sub(r"^(?:[ \t]*\n)+", "", v).rstrip()
    result["__order__"] = order  # type: ignore[assignment]
    return result


def cmd_unpack(args) -> int:
    workdir = wd(args.workdir)
    if args.source not in SOURCES:
        raise UsageError(f"--source は {', '.join(SOURCES)} のいずれかです")
    fdir = workdir / "files" / args.file_id
    blocks = {b["id"]: b for b in load_json(fdir / "blocks.json")}
    parsed = parse_pack(read_text(Path(args.file)))
    order = parsed.pop("__order__")
    warnings = []
    expected = list(blocks)
    if order != [x for x in expected if x in order]:
        warnings.append("ブロックの順序が原文と異なります（各ブロックは目印で対応づけました）")
    cands = {}
    for bid, block in blocks.items():
        if bid not in parsed:
            warnings.append(f"{bid}: 候補がありません（原文のまま扱います）")
            continue
        prose = parsed[bid]
        if prose == block["prose"]:
            continue
        errs = validate_prose(block, prose)
        if errs:
            warnings.append(f"{bid}: 候補を除外しました（{'; '.join(errs)}）")
            continue
        cands[bid] = prose
    notes = load_json(Path(args.notes), {}) if args.notes else {}
    if args.default_reason:
        for bid in cands:
            notes.setdefault(bid, {"reason": args.default_reason})
    dump_json(fdir / "candidates" / f"{args.source}.json", {"source": args.source, "blocks": cands, "notes": notes,
                                                            "warnings": warnings, "created_at": now()})
    return emit({"status": "ok", "changed_blocks": len(cands), "warnings": warnings})


def cmd_view(args) -> int:
    """統合担当に渡すため、原文と各候補をブロックごとに並べた JSON を書き出す。"""
    workdir = wd(args.workdir)
    fdir = workdir / "files" / args.file_id
    blocks = load_json(fdir / "blocks.json")
    cdir = fdir / "candidates"
    srcs = {}
    for s in ("gemini", "yomiyasu", "techwriting"):
        p = cdir / f"{s}.json"
        if p.exists():
            srcs[s] = load_json(p)
    out = []
    for b in blocks:
        item = {"id": b["id"], "kind": b["kind"], "line": b["line_start"], "original": b["prose"], "candidates": {}}
        for s, data in srcs.items():
            if b["id"] in data["blocks"]:
                item["candidates"][s] = data["blocks"][b["id"]]
            note = data.get("notes", {}).get(b["id"])
            if note:
                item.setdefault("notes", {})[s] = note
        out.append(item)
    dest = fdir / "view.json"
    dump_json(dest, {"file": load_json(fdir / "meta.json")["path"], "blocks": out})
    return emit({"status": "ok", "view": str(dest)})


# ------------------------------------------------------------------ 他の出現箇所（文字列リテラル）


def iter_files(root: Path):
    try:
        out = subprocess.run(["git", "-C", str(root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                             capture_output=True, check=True)
        for rel in out.stdout.decode("utf-8", "replace").split("\0"):
            if rel:
                yield root / rel
        return
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            yield Path(dirpath) / fn


def cmd_occurrences(args) -> int:
    workdir = wd(args.workdir)
    root = Path(args.root).expanduser().resolve()
    state = load_json(workdir / "state.json")
    targets = []
    for f in state.get("files", []):
        fdir = workdir / "files" / f["id"]
        for b in load_json(fdir / "blocks.json"):
            if b["kind"] == "literal" and len(b["prose"]) >= 4:
                targets.append((f, b))
    if not targets:
        return emit({"status": "ok", "found": 0})
    found: dict[tuple[str, str], list] = {}
    for path in iter_files(root):
        try:
            if path.stat().st_size > 2_000_000:
                continue
            text = read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        starts = None
        for f, b in targets:
            needle = b["prose"]
            pos = text.find(needle)
            while pos != -1:
                is_self = str(path.resolve()) == f["abs"] and pos == b["start"] + len(b.get("lead", ""))
                end = pos + len(needle)
                # 完全一致だけを数える: 同じ引用符で前後を囲まれていること
                quoted = pos > 0 and end < len(text) and text[pos - 1] in "\"'`" and text[end] == text[pos - 1]
                if not is_self and quoted:
                    if starts is None:
                        starts = line_starts(text)
                    ln = line_of(starts, pos)
                    found.setdefault((f["id"], b["id"]), []).append({
                        "abs": str(path.resolve()), "path": str(path.resolve().relative_to(root))
                        if str(path.resolve()).startswith(str(root)) else str(path),
                        "offset": pos, "line": ln + 1, "sha256": sha256_text(text),
                        "context": text[starts[ln]:line_end(text, starts[ln])].strip()[:200],
                    })
                pos = text.find(needle, pos + 1)
    for (fid, bid), occ in found.items():
        p = workdir / "files" / fid / "occurrences.json"
        data = load_json(p, {})
        data[bid] = occ
        dump_json(p, data)
    return emit({"status": "ok", "found": sum(len(v) for v in found.values()), "blocks_with_occurrences": len(found)})


# ------------------------------------------------------------------ レビュー画面のデータ


def cmd_build_review(args) -> int:
    workdir = wd(args.workdir)
    state = load_json(workdir / "state.json")
    terms = load_json(Path(args.terms), []) if args.terms else []
    files_out = []
    total = 0
    for f in state.get("files", []):
        if not f.get("blocks"):
            continue
        fdir = workdir / "files" / f["id"]
        meta = load_json(fdir / "meta.json")
        text = read_text(fdir / "source")
        starts = line_starts(text)
        blocks = load_json(fdir / "blocks.json")
        occ = load_json(fdir / "occurrences.json", {})
        cands = {}
        for s in SOURCES:
            p = fdir / "candidates" / f"{s}.json"
            if p.exists():
                cands[s] = load_json(p)
        file_warnings = []
        for s, data in cands.items():
            file_warnings += [f"{SOURCE_LABELS[s]}: {w}" for w in data.get("warnings", [])]
        for s in ("gemini", "yomiyasu", "techwriting", "integrated"):
            if s == "techwriting" and not meta["md_rules"]:
                continue
            if s not in cands:
                file_warnings.append(f"{SOURCE_LABELS[s]} の候補がありません（失敗または未実行）")
        out_blocks = []
        for b in blocks:
            options = []
            seen: dict[str, dict] = {}
            for s in SOURCES:
                data = cands.get(s)
                if not data or b["id"] not in data["blocks"]:
                    continue
                prose = data["blocks"][b["id"]]
                integ = cands.get("integrated", {}).get("blocks", {}).get(b["id"])
                if s == "concise" and prose == integ:
                    continue  # 簡潔化で変わらなかった箇所は「統合案＋簡潔化」を出さない
                note = data.get("notes", {}).get(b["id"], {})
                if isinstance(note, str):
                    note = {"reason": note}
                if prose in seen:
                    # 内容が同じ候補は1つにまとめ、注記は結合する
                    opt = seen[prose]
                    opt["sources"].append(s)
                    if note.get("reason"):
                        opt["reasons"].append((SOURCE_LABELS[s], note["reason"]))
                    opt["questions"] += [q for q in note.get("questions", []) if q not in opt["questions"]]
                    opt["conflicts"] += note.get("conflicts", [])
                    opt["deletion"] = opt["deletion"] or bool(note.get("deletion"))
                    continue
                opt = {"key": s, "label": SOURCE_LABELS[s], "sources": [s], "text": prose,
                       "reasons": [(SOURCE_LABELS[s], note["reason"])] if note.get("reason") else [],
                       "questions": list(note.get("questions", [])),
                       "deletion": bool(note.get("deletion")), "conflicts": list(note.get("conflicts", [])),
                       "warnings": []}
                for t in terms:
                    term = t["term"] if isinstance(t, dict) else str(t)
                    if term and term in b["prose"] and term not in prose:
                        opt["warnings"].append(f"用語集の用語「{term}」が候補から消えています")
                seen[prose] = opt
                options.append(opt)
            if not options:
                continue
            for opt in options:
                rs = opt.pop("reasons")
                opt["reason"] = rs[0][1] if len(rs) == 1 else "\n".join(f"【{label}】{text}" for label, text in rs)
            total += 1
            # 画面で「実際のソースの行」として差分を出すため、校閲箇所の前後の文字列と、
            # コメント記号などの付け方（to_raw と同じ規則）を渡す
            ls = starts[b["line_start"] - 1]
            le = line_end(text, starts[b["line_end"] - 1])
            out_blocks.append({
                "id": b["id"], "key": f"{f['id']}:{b['id']}", "kind": b["kind"], "style": b.get("style", ""),
                "flavor": b.get("flavor", ""), "line_start": b["line_start"], "line_end": b["line_end"],
                "raw": raw_original(text, b), "original": b["prose"], "options": options,
                "line_prefix": text[ls:b["start"]], "line_suffix": text[b["end"]:le],
                "wrap": {k: b[k] for k in WRAP_KEYS if k in b}, "deletable": deletable(b),
                "occurrences": occ.get(b["id"], []),
            })
        files_out.append({"id": f["id"], "path": meta["path"], "kind": meta["kind"], "text": text,
                          "blocks": out_blocks, "warnings": file_warnings})
    dump_json(workdir / "review.json", {"built_at": now(), "files": files_out, "total": total})

    def fn(st):
        st["phase"] = "review"
        st["message"] = f"候補ができました（{total} 箇所）。ブラウザで確認してください"
        add_log(st, st["message"])
    update_state(workdir, fn)
    return emit({"status": "ok", "blocks": total, "files": len(files_out)})


# ------------------------------------------------------------------ 反映


def cmd_apply(args) -> int:
    workdir = wd(args.workdir)
    decisions = load_json(workdir / "decisions.json")
    review = load_json(workdir / "review.json")
    excluded = set(decisions.get("excluded_files", []))
    chosen = decisions.get("blocks", {})
    backup = workdir / "backup"
    report = {"applied": [], "skipped_files": [], "rejected": [], "occurrences": [], "kept_original": 0}
    edits_by_file: dict[str, list] = {}   # abs -> [(start, end, new, expected_sha)]
    meta_by_abs = {}

    for f in review["files"]:
        fdir = workdir / "files" / f["id"]
        meta = load_json(fdir / "meta.json")
        blocks = {b["id"]: b for b in load_json(fdir / "blocks.json")}
        if f["id"] in excluded:
            report["skipped_files"].append({"path": meta["path"], "reason": "除外が指定されました"})
            continue
        meta_by_abs[meta["abs"]] = meta
        for rb in f["blocks"]:
            d = chosen.get(rb["key"])
            if not d or d.get("text") is None:
                report["kept_original"] += 1
                continue
            b = blocks[rb["id"]]
            prose = d["text"].replace("\r\n", "\n")
            if prose == b["prose"]:
                report["kept_original"] += 1
                continue
            errs = validate_prose(b, prose)
            if errs:
                report["rejected"].append({"path": meta["path"], "block": rb["key"], "errors": errs})
                continue
            start, end = b["start"], b["end"]
            if not prose.strip():
                # 丸ごと削除: 行末の改行と、Markdown では続く空行1つも消す
                src_text = read_text(fdir / "source")
                new_raw = ""
                if src_text[end:end + 2] == "\r\n":
                    end += 2
                elif src_text[end:end + 1] == "\n":
                    end += 1
                if b["kind"] == "md" and src_text[end:end + 1] == "\n":
                    end += 1
            else:
                new_raw = to_raw(b, prose)
            edits_by_file.setdefault(meta["abs"], []).append((start, end, new_raw, meta["sha256"], rb["key"]))
            if d.get("apply_occurrences"):
                for o in rb.get("occurrences", []):
                    edits_by_file.setdefault(o["abs"], []).append(
                        (o["offset"], o["offset"] + len(b["prose"]), prose, o["sha256"], rb["key"] + "@occ"))

    written = []
    for abs_path, edits in edits_by_file.items():
        p = Path(abs_path)
        if not p.exists():
            report["skipped_files"].append({"path": abs_path, "reason": "ファイルが見つかりません"})
            continue
        cur = read_text(p)
        cur_sha = sha256_text(cur)
        ok_edits = [e for e in edits if e[3] == cur_sha]
        for e in edits:
            if e[3] != cur_sha:
                report["skipped_files"].append({"path": abs_path, "block": e[4],
                                                "reason": "候補を作った後にファイルが変更されたため反映しません"})
        if not ok_edits:
            continue
        ok_edits.sort(key=lambda e: e[0])
        for a, b in zip(ok_edits, ok_edits[1:]):
            if b[0] < a[1]:
                raise UsageError(f"反映範囲が重なっています: {abs_path} {a[4]} / {b[4]}")
        bk = backup / hashlib.sha1(abs_path.encode()).hexdigest()[:8] / p.name
        bk.parent.mkdir(parents=True, exist_ok=True)
        if not bk.exists():
            shutil.copyfile(p, bk)
        out = cur
        for start, end, new, _, key in reversed(ok_edits):
            out = out[:start] + new + out[end:]
        write_text(p, out)
        written.append({"path": abs_path, "backup": str(bk), "edits": len(ok_edits)})
        for e in ok_edits:
            (report["occurrences"] if e[4].endswith("@occ") else report["applied"]).append(
                {"path": abs_path, "block": e[4].removesuffix("@occ")})
    report["written"] = written

    def fn(st):
        st["phase"] = "done"
        st["result"] = {"applied": len(report["applied"]), "occurrences": len(report["occurrences"]),
                        "kept_original": report["kept_original"], "rejected": report["rejected"],
                        "skipped": report["skipped_files"], "written": written}
        st["message"] = f"反映しました（{len(report['applied'])} 箇所）"
        add_log(st, st["message"])
    update_state(workdir, fn)
    dump_json(workdir / "apply-report.json", report)
    return emit({"status": "ok", **report})


def cmd_changed_lines(args) -> int:
    p = Path(args.path).expanduser().resolve()
    cmd = ["git", "-C", str(p.parent), "diff", "-U0", "--no-color"]
    if args.base:
        cmd.append(args.base)
    cmd += ["--", p.name]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        raise UsageError(f"git diff に失敗しました: {e}")
    ranges = []
    for m in re.finditer(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", out, re.M):
        start = int(m.group(1))
        count = int(m.group(2) or 1)
        if count:
            ranges.append(f"{start}-{start + count - 1}")
    untracked = subprocess.run(["git", "-C", str(p.parent), "ls-files", "--error-unmatch", p.name],
                               capture_output=True).returncode != 0
    return emit({"status": "ok", "lines": ",".join(ranges), "untracked": untracked})


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("init")
    p.add_argument("--request-file")
    p.set_defaults(fn=cmd_init)

    p = sub.add_parser("progress")
    p.add_argument("workdir")
    p.add_argument("--phase", choices=["resolving", "generating", "review", "applying", "done", "failed"])
    p.add_argument("--message")
    p.add_argument("--scope-file")
    p.add_argument("--file-status", action="append", help="f01=generating:詳細")
    p.set_defaults(fn=cmd_progress)

    p = sub.add_parser("ask")
    p.add_argument("workdir")
    p.add_argument("--file", required=True)
    p.set_defaults(fn=cmd_ask)

    p = sub.add_parser("wait")
    p.add_argument("workdir")
    p.add_argument("--for", dest="what", required=True)
    p.add_argument("--timeout", type=int, default=540)
    p.set_defaults(fn=cmd_wait)

    p = sub.add_parser("add-file")
    p.add_argument("workdir")
    p.add_argument("path")
    p.add_argument("--lines", help="対象を絞る行範囲（例: 10-20,35-40）")
    p.add_argument("--manual", help="対象の文字列を列挙した JSON")
    p.add_argument("--root", help="表示用の相対パスの基準")
    p.set_defaults(fn=cmd_add_file)

    p = sub.add_parser("changed-lines")
    p.add_argument("path")
    p.add_argument("--base")
    p.set_defaults(fn=cmd_changed_lines)

    p = sub.add_parser("unpack")
    p.add_argument("workdir")
    p.add_argument("file_id")
    p.add_argument("--source", required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--notes")
    p.add_argument("--default-reason", help="理由が書かれていない変更箇所に付ける理由")
    p.set_defaults(fn=cmd_unpack)

    p = sub.add_parser("view")
    p.add_argument("workdir")
    p.add_argument("file_id")
    p.set_defaults(fn=cmd_view)

    p = sub.add_parser("occurrences")
    p.add_argument("workdir")
    p.add_argument("--root", required=True)
    p.set_defaults(fn=cmd_occurrences)

    p = sub.add_parser("build-review")
    p.add_argument("workdir")
    p.add_argument("--terms")
    p.set_defaults(fn=cmd_build_review)

    p = sub.add_parser("apply")
    p.add_argument("workdir")
    p.set_defaults(fn=cmd_apply)

    args = ap.parse_args(argv)
    try:
        return args.fn(args)
    except UsageError as e:
        return emit({"status": "failed", "error": str(e)}, 1)


if __name__ == "__main__":
    sys.exit(main())
