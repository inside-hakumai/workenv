"use strict";

const TOKEN = new URLSearchParams(location.search).get("t") || "";
// 判断の持ち方を変えたので、以前の形式で保存した内容とは別のキーにする
const STORE_KEY = "jp-proofread2:" + TOKEN.slice(0, 16);
const STEPS = [["resolving", "対象の特定"], ["generating", "候補の作成"], ["review", "確認"], ["applying", "反映"]];
const SOURCE_NAMES = {
  gemini: "Gemini", yomiyasu: "yomiyasu", techwriting: "tech-writing",
  integrated: "統合案", concise: "簡潔化（表現）", trim: "簡潔化（削除・削減）",
};
const SOURCE_TITLES = {
  gemini: "japanese-natural-writing（Gemini）", yomiyasu: "yomiyasu", techwriting: "japanese-tech-writing",
  integrated: "各案の変更をまとめた案", concise: "統合案の表現を、情報を減らさずに短くした案",
  trim: "読み手に不要な文や、ほかで分かる説明を削った案",
};
// 提案を並べる順。各案をまとめた統合案を先に見せる
const PRIORITY = ["integrated", "concise", "trim", "gemini", "yomiyasu", "techwriting"];
// 候補の作成状況の列。2つの簡潔化案は同じワーカーが作るので1列にする
const GEN_COLUMNS = [["gemini", "Gemini"], ["yomiyasu", "yomiyasu"], ["techwriting", "tech-writing"], ["integrated", "統合案"], ["concise", "簡潔化"]];
// 1列に複数の案をまとめる列と、その案。すべての案が unpack されたら完了にする
const GEN_PARTS = { concise: ["concise", "trim"] };
const GEN_STATUS = { done: "完了", running: "作成中", retrying: "再実行中", failed: "失敗（候補なし）" };
const KIND_LABEL = { md: "Markdown", comment: "コメント", literal: "文字列" };
const STATE_LABEL = { todo: "未確認", keep: "原文のまま", change: "変更" };
const EDIT_HINT = {
  comment: "コメントの本文を編集します。コメント記号とインデントは自動で付けます。",
  literal: "文字列の中身を編集します。引用符は自動で付けます。プレースホルダー（%s、{name} など）は消さないでください。",
  md: "Markdown のまま編集します。",
};
const CONTEXT_LINES = 3;

let review = null;
let submitted = false;
let finished = false;
let lastStateJson = "";
let lastStepIndex = 0;
let filter = "all";
let current = null; // 現在の校閲箇所の key
let editing = null; // 手直しの欄を開いている校閲箇所の key
let logOpen = true;
let navAt = 0; // キー操作で箇所へ移った時刻。スクロールが終わるまでは、その箇所を現在の箇所とみなす
// decisions[key] = { sel: "orig" | <提案の key>, texts: { <提案の key>: 手直しした本文 }, occ }
// sel がない箇所は未確認。手直しは提案ごとに残すので、ほかの提案に切り替えて戻っても消えない
let decisions = loadStore().decisions || {};
let excluded = new Set(loadStore().excluded || []);
const blocks = []; // 画面に出した順の { b, file, node, draw }

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ decisions, excluded: [...excluded] })); } catch { /* 保存できなくても動作は続ける */ }
}

async function api(path, body) {
  const opts = { headers: { "X-JP-Token": TOKEN } };
  if (body !== undefined) {
    opts.method = "POST";
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
}

const $ = (id) => document.getElementById(id);

function splitPath(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? ["", p] : [p.slice(0, i + 1), p.slice(i + 1)];
}

const svg = (w, body) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("width", w);
  s.setAttribute("height", w);
  s.setAttribute("viewBox", "0 0 16 16");
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = body;
  return s;
};
const ICON_CHECK = (w = 11) => svg(w, '<path d="M3.5 8.3 6.6 11.3 12.5 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>');
const ICON_ASK = () => svg(14, '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".8" fill="currentColor"/>');
const ICON_WARN = () => svg(14, '<path d="M8 2.2 14.3 13.3H1.7Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.5v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".8" fill="currentColor"/>');

// ------------------------------------------------------------ 差分

// 配列どうしの LCS 差分。[op, items[]] の列を返す（op は "=", "-", "+"）。
function diffSeq(A, B) {
  let p = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p++;
  let s = 0;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
  const a2 = A.slice(p, A.length - s), b2 = B.slice(p, B.length - s);
  const ops = [];
  const push = (op, x) => {
    const last = ops[ops.length - 1];
    if (last && last[0] === op) last[1].push(x); else ops.push([op, [x]]);
  };
  for (let k = 0; k < p; k++) push("=", A[k]);
  const n = a2.length, m = b2.length;
  if (n * m > 4_000_000) {
    a2.forEach((x) => push("-", x));
    b2.forEach((x) => push("+", x));
  } else if (n || m) {
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = a2[i] === b2[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a2[i] === b2[j]) { push("=", a2[i]); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { push("-", a2[i]); i++; }
      else { push("+", b2[j]); j++; }
    }
    while (i < n) push("-", a2[i++]);
    while (j < m) push("+", b2[j++]);
  }
  for (let k = A.length - s; k < A.length; k++) push("=", A[k]);
  return ops;
}

// 文字単位の差分を、語句の単位の置き換えにまとめる。
// 変更どうしの間にある2文字以下の共通部分は、前後の変更に含める。
function wordSegments(a, b) {
  const items = [];
  for (const [op, xs] of diffSeq(Array.from(a), Array.from(b))) {
    const t = xs.join("");
    let last = items[items.length - 1];
    if (op === "=") { items.push({ eq: t }); continue; }
    if (!last || last.eq !== undefined) { last = { del: "", ins: "" }; items.push(last); }
    if (op === "-") last.del += t; else last.ins += t;
  }
  for (let merged = true; merged;) {
    merged = false;
    for (let k = 1; k < items.length - 1; k++) {
      const [p, e, n] = [items[k - 1], items[k], items[k + 1]];
      if (e.eq !== undefined && p.eq === undefined && n.eq === undefined && Array.from(e.eq).length <= 2 && !e.eq.includes("\n")) {
        items.splice(k - 1, 3, { del: p.del + e.eq + n.del, ins: p.ins + e.eq + n.ins });
        merged = true;
        break;
      }
    }
  }
  return items;
}

function charStat(a, b) {
  let del = 0, ins = 0;
  for (const [op, xs] of diffSeq(Array.from(a), Array.from(b))) {
    if (op === "-") del += xs.filter((c) => c !== "\n").length;
    if (op === "+") ins += xs.filter((c) => c !== "\n").length;
  }
  return { del, ins };
}

// 校閲後の本文を、ソースに書き戻す形にする（jp.py の to_raw と同じ規則）。
function toRaw(b, prose) {
  const w = b.wrap || {};
  if (b.kind === "md") return prose;
  if (b.kind === "literal") return (w.lead || "") + prose + (w.trail || "");
  const line = (p, l) => (l ? p + l : p.trimEnd());
  const lines = prose.split("\n");
  if (b.style === "line") return lines.map((l) => line(w.prefix, l)).join("\n");
  if (b.style === "trailing") return w.prefix + prose;
  if (b.style === "block1") return w.open + prose + w.close;
  const out = [];
  if (w.opener_alone) {
    out.push(w.open, ...lines.map((l) => line(w.inner_prefix, l)));
  } else {
    out.push(w.open + lines[0], ...lines.slice(1).map((l) => line(w.inner_prefix, l)));
  }
  if (w.closer_alone) return [...out, w.closer_line].join("\n");
  return out.join("\n") + w.close_sep + w.close;
}

function oldSourceLines(b) {
  return (b.line_prefix + b.raw + b.line_suffix).split("\n");
}

// 丸ごと削除するときの見え方は jp.py の deletion_span と合わせる
function newSourceLines(b, prose) {
  if (!prose.trim() && b.deletable && b.original.trim()) {
    if (!b.line_prefix.trim() && !b.line_suffix.trim()) return [];
    return [b.line_prefix.replace(/[ \t]+$/, "") + b.line_suffix];
  }
  return (b.line_prefix + toRaw(b, prose) + b.line_suffix).split("\n");
}

// 実際のソースの行の形で、変わった語句を文の中に書き込んだ差分を描く。
// 原文は校閲箇所の上に1回だけ出すので、提案ごとに削除行と追加行を並べない。
function renderInlineDiff(b, prose, cls) {
  const box = el("span", { class: cls });
  if (prose === b.original) {
    box.append(el("span", { class: "same" }, "（原文と同じです）"));
    return box;
  }
  const oldLines = oldSourceLines(b);
  const newLines = newSourceLines(b, prose);
  // 行頭の共通のインデントは、読みやすさのために除く
  const indent = Math.min(...oldLines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length));
  const strip = (ls) => ls.map((l) => l.slice(Math.min(indent, l.match(/^[ \t]*/)[0].length))).join("\n");
  const a = strip(oldLines);
  if (!newLines.length) {
    box.append(el("span", { class: "d" }, a), el("span", { class: "same" }, "\n（この箇所を削除します）"));
    return box;
  }
  for (const it of wordSegments(a, strip(newLines))) {
    if (it.eq !== undefined) { box.append(it.eq); continue; }
    if (it.del) box.append(el("del", { class: "d" }, it.del));
    if (it.ins) box.append(el("ins", { class: "i" }, it.ins));
  }
  return box;
}

// ------------------------------------------------------------ 状態の表示

async function poll() {
  try {
    const { status, data } = await api("/api/state");
    if (status !== 200) {
      setMessage("サーバーに接続できません。URL の t= の値が正しいか確認してください", true);
      return;
    }
    submitted = data.submitted;
    if (data.review_ready && !review) {
      const r = await api("/api/review");
      if (r.status === 200) {
        review = r.data;
        renderReview();
        lastStateJson = "";
      }
    }
    const json = JSON.stringify(data);
    if (json !== lastStateJson) {
      lastStateJson = json;
      renderState(data);
    }
  } catch (e) {
    setMessage("サーバーとの通信が切れました（" + e.message + "）", true);
  } finally {
    setTimeout(poll, 2000);
  }
}

function setMessage(text, isErr) {
  const m = $("message");
  m.textContent = text;
  m.classList.toggle("err", !!isErr);
}

function renderState(data) {
  const st = data.state || {};
  renderSteps(st.phase);
  setMessage(st.phase === "review" && review ? "" : st.message || "", st.phase === "failed");
  renderQuestions(st.questions || [], new Set(data.answered || []));
  renderScope(st);
  renderProgress(st);
  renderResult(st);
}

function renderSteps(phase) {
  const idx = phase === "done" ? STEPS.length : STEPS.findIndex(([p]) => p === phase);
  if (idx >= 0) lastStepIndex = idx;
  const failed = phase === "failed";
  fill($("steps"), STEPS.map(([, label], i) => {
    const done = i < lastStepIndex;
    const now = i === lastStepIndex;
    const cls = done ? "done" : now ? (failed ? "failed" : "now") : "";
    return el("li", { class: cls, "aria-current": now && !failed ? "step" : null },
      el("span", { class: "n" }, done ? ICON_CHECK() : failed && now ? "!" : String(i + 1)), label,
      failed && now ? el("span", { class: "sr" }, "（失敗）") : null);
  }));
}

function remainingText(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!(ms > 0)) return null;
  const min = Math.ceil(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)} 時間 ${min % 60} 分` : `${min} 分`;
}

function renderQuestions(questions, answered) {
  const box = $("questions");
  const open = questions.filter((q) => q.status === "open" && !answered.has(q.id));
  for (const node of box.querySelectorAll("[data-qid]")) {
    if (!open.some((q) => q.id === node.dataset.qid)) node.remove();
  }
  const waitText = (q) => {
    const rest = q.expires_at ? remainingText(q.expires_at) : null;
    return rest ? `回答があるまで校閲は止まっています。あと ${rest}待っても回答がなければ、何も変更せずに終了します。`
      : "回答があるまで校閲は止まっています。";
  };
  for (const q of open) {
    const shown = box.querySelector(`[data-qid="${CSS.escape(q.id)}"]`);
    if (shown) { shown.querySelector(".q-wait").textContent = waitText(q); continue; }
    const form = el("form", { class: "card question", "data-qid": q.id });
    form.append(el("h2", { class: "q-h" }, svg(20, '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".8" fill="currentColor"/>'), "確認したいことがあります"),
      el("p", { class: "q-text" }, q.text));
    if ((q.choices || []).length) {
      form.append(el("fieldset", { class: "choices" }, el("legend", { class: "sr" }, "選択肢"),
        q.choices.map((c) => el("label", { class: "q-choice" }, el("input", { type: "radio", name: "choice", value: c }), c))));
    }
    if (q.allow_free !== false) {
      const id = "q-free-" + q.id;
      const optional = (q.choices || []).length > 0;
      form.append(el("label", { class: "free-k", for: id }, optional ? "補足" : "回答", optional ? el("span", {}, "任意") : null),
        el("textarea", { id, name: "text", rows: "3" }));
    }
    const err = el("div", { class: "err small", role: "alert" });
    form.append(el("div", { class: "q-actions" },
      el("button", { class: "btn btn-primary", type: "submit" }, "回答を送る"),
      el("span", { class: "q-wait" }, waitText(q))), err);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const choice = form.querySelector("input[name=choice]:checked")?.value ?? null;
      const text = form.querySelector("textarea")?.value ?? "";
      if (!choice && !text.trim()) { err.textContent = "選択肢を選ぶか、回答を書いてください"; return; }
      const r = await api("/api/answer", { qid: q.id, choice, text });
      if (r.status === 200 || r.status === 409) form.remove();
      else err.textContent = "回答を送れませんでした（" + r.status + "）。もう一度押してください";
    });
    box.append(form);
  }
}

function renderScope(st) {
  const sc = st.scope || {};
  const rows = [["依頼", sc.request], ["対象", sc.interpretation], ["文書の種類と文体", sc.settings], ["用語集", sc.glossary]]
    .filter(([, v]) => v);
  const items = () => rows.map(([k, v]) => [el("dt", {}, k), el("dd", {}, v)]);
  fill($("scope"), items());
  fill($("side-scope"), items());
  $("scope-card").hidden = !rows.length || !!review;
  $("side-scope-sec").hidden = !rows.length;
}

function genStatus(f, src) {
  const ss = (GEN_PARTS[src] || [src]).map((k) => (f.sources || {})[k]);
  if (ss.every((s) => s === "done")) return "done";
  for (const s of ["failed", "retrying", "running"]) if (ss.includes(s)) return s;
  // 一部の案だけ unpack された（ワーカーはまだ動いている）
  return ss.includes("done") ? "running" : undefined;
}

function genCell(f, src) {
  if (src === "techwriting" && f.kind !== "md") return el("span", { class: "st na" }, "対象外");
  const s = genStatus(f, src);
  if (s === "done") return el("span", { class: "st done" }, el("span", { class: "ic" }, ICON_CHECK(10)), GEN_STATUS.done);
  if (GEN_STATUS[s]) return el("span", { class: "st " + s }, el("span", { class: "ic" }, s === "failed" ? "×" : ""), GEN_STATUS[s]);
  return el("span", { class: "st wait" }, el("span", { class: "ic" }), "待機");
}

function renderProgress(st) {
  const box = $("progress");
  const active = ["resolving", "generating", "applying", "failed"].includes(st.phase);
  box.hidden = !active && !!review;
  if (box.hidden) return;
  const files = st.files || [];
  let total = 0, finishedJobs = 0, doneJobs = 0;
  for (const f of files) {
    if (f.status === "skipped") continue;
    for (const [src] of GEN_COLUMNS) {
      if (src === "techwriting" && f.kind !== "md") continue;
      total++;
      const s = genStatus(f, src);
      if (s === "done") doneJobs++;
      if (s === "done" || s === "failed") finishedJobs++;
    }
  }
  const gen = files.length ? el("section", { class: "card", "aria-labelledby": "gen-h" },
    el("div", { class: "gen-head" }, el("h2", { id: "gen-h" }, "候補の作成"),
      el("span", { class: "meta" }, `${total} 件中 ${doneJobs} 件ができました`)),
    el("div", { class: "big-bar", role: "progressbar", "aria-label": "候補の作成", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(finishedJobs) },
      el("span", { style: `width: ${total ? Math.round((finishedJobs / total) * 100) : 0}%` })),
    el("div", { class: "tbl" }, el("table", { class: "matrix" },
      el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "ファイル"), el("th", { scope: "col" }, "箇所"),
        GEN_COLUMNS.map(([, label]) => el("th", { scope: "col" }, label)))),
      el("tbody", {}, files.map((f) => el("tr", {},
        el("th", { scope: "row" }, f.path, f.detail && f.status !== "skipped" ? el("span", { class: "detail" }, f.detail) : null),
        el("td", { class: "num" }, String(f.blocks ?? "")),
        f.status === "skipped"
          ? el("td", { class: "skip", colspan: String(GEN_COLUMNS.length) }, f.detail || "対象外")
          : GEN_COLUMNS.map(([src]) => el("td", {}, genCell(f, src)))))))),
    el("p", { class: "tbl-note" }, "Gemini は 1 ファイルずつ順に処理します。統合案はそのファイルの各案がそろった時点で、簡潔化は統合案ができた時点で作り始めます。tech-writing は Markdown だけが対象です。"))
    : null;
  const lines = (st.log || []).slice(-30);
  const details = el("details", { class: "card log", open: logOpen },
    el("summary", {}, "ログ", el("span", {}, `最新 ${lines.length} 件`)),
    el("ol", { class: "loglines" }, lines.map((l) => el("li", {}, el("time", {}, l.time.slice(11)), l.message))));
  details.addEventListener("toggle", () => { logOpen = details.open; });
  fill(box, gen, details);
  const list = details.querySelector(".loglines");
  list.scrollTop = list.scrollHeight;
}

function renderResult(st) {
  const box = $("result");
  if (st.phase !== "done" || !st.result) { box.hidden = true; return; }
  const r = st.result;
  finished = true;
  box.hidden = false;
  const issues = [];
  if ((r.rejected || []).length) {
    issues.push(el("div", { class: "res-issues" }, "次の箇所は形式の検査に通らなかったため、変更していません。",
      el("ul", {}, r.rejected.map((x) => el("li", {}, `${x.path} ${x.block}: ${x.errors.join("; ")}`)))));
  }
  if ((r.skipped || []).length) {
    issues.push(el("div", { class: "res-issues" }, "次のファイルは変更していません。",
      el("ul", {}, r.skipped.map((x) => el("li", {}, `${x.path} ${x.block || ""}: ${x.reason}`)))));
  }
  const written = r.written || [];
  fill(box,
    el("h2", { class: "res-h" }, el("span", { class: "res-ic" }, ICON_CHECK(16)), `${r.applied} 箇所を変更しました`),
    el("p", { class: "res-sub" }, `原文のまま ${r.kept_original} 箇所` + (r.occurrences ? `・同じ文字列の書き換え ${r.occurrences} 箇所` : "")),
    written.length ? el("ul", { class: "res-list" }, written.map((w) => el("li", {},
      el("span", { class: "res-path" }, w.path), el("span", { class: "res-n" }, `${w.edits} 箇所`),
      el("span", { class: "res-bk" }, "元のファイル：", el("code", {}, w.backup))))) : null,
    issues,
    written.length ? el("ol", { class: "res-next" },
      el("li", {}, "変更はコミットしていません。", el("code", {}, "git diff"), " で内容を確かめてください。"),
      el("li", {}, "元に戻すときは、上の元のファイルで上書きしてください。")) : null,
    el("p", { class: "muted small" }, "このページは閉じて構いません。"));
  $("submit").hidden = true;
  $("next-todo").hidden = true;
  $("prog").hidden = true;
  closeConfirm();
  lockAll();
}

// ------------------------------------------------------------ 判断

function sortedOptions(b) {
  if (!b._opts) {
    const rank = (s) => { const i = PRIORITY.indexOf(s); return i < 0 ? PRIORITY.length : i; };
    b._opts = b.options.map((o) => {
      const sources = [...o.sources].sort((x, y) => rank(x) - rank(y));
      return { ...o, primary: sources[0], others: sources.slice(1) };
    }).sort((x, y) => rank(x.primary) - rank(y.primary));
  }
  return b._opts;
}

function optionName(o) {
  return SOURCE_NAMES[o.primary] || o.primary;
}

function selectedOption(b) {
  const d = decisions[b.key];
  if (!d || !d.sel || d.sel === "orig") return null;
  return sortedOptions(b).find((o) => o.key === d.sel) || null;
}

function editedText(b, o) {
  return decisions[b.key]?.texts?.[o.key];
}

// 反映する本文。原文のまま／未確認なら null
function finalText(b) {
  const o = selectedOption(b);
  if (!o) return null;
  return editedText(b, o) ?? o.text;
}

function stateOf(b) {
  const d = decisions[b.key];
  if (!d || !d.sel) return "todo";
  const t = finalText(b);
  return t !== null && t !== b.original ? "change" : "keep";
}

function chipLabel(b) {
  const s = stateOf(b);
  if (s !== "change") return STATE_LABEL[s];
  const o = selectedOption(b);
  const t = editedText(b, o);
  return t !== undefined && t !== o.text ? `変更：${optionName(o)}を手直し` : `変更：${optionName(o)}`;
}

function tally() {
  let change = 0, keep = 0, todo = 0, total = 0;
  const perFile = [];
  for (const f of review?.files || []) {
    if (excluded.has(f.id)) continue;
    let n = 0;
    for (const b of f.blocks) {
      total++;
      const s = stateOf(b);
      if (s === "change") { change++; n++; } else if (s === "keep") keep++; else todo++;
    }
    if (n) perFile.push({ path: f.path, n });
  }
  return { change, keep, todo, total, perFile };
}

function firstTodo() {
  return blocks.find(({ b, file }) => !excluded.has(file.id) && stateOf(b) === "todo") || null;
}

function updateCounts() {
  const t = tally();
  const reviewed = t.total - t.todo;
  $("prog-num").textContent = `${reviewed} / ${t.total}`;
  $("prog-bar").style.width = (t.total ? Math.round((reviewed / t.total) * 100) : 0) + "%";
  $("prog-sub").textContent = `変更 ${t.change}・原文のまま ${t.keep}・未確認 ${t.todo}`;
  const next = firstTodo();
  $("next-todo").hidden = !next || submitted || finished;
  if (next) $("next-todo").href = "#" + next.node.id;
  for (const f of review?.files || []) {
    const node = document.querySelector(`#file-${CSS.escape(f.id)} .count`);
    const n = f.blocks.filter((b) => stateOf(b) === "change").length;
    if (node) node.textContent = `${f.blocks.length} 箇所` + (n ? `・変更 ${n}` : "");
  }
  if (!$("confirm").hidden) renderConfirm();
}

function refreshAll() {
  saveLocal();
  renderToc();
  updateCounts();
}

// ------------------------------------------------------------ レビュー

function renderReview() {
  const box = $("files");
  fill(box);
  blocks.length = 0;
  if (!review.total) {
    box.append(el("div", { class: "card" }, "直す候補はありませんでした。「反映する」を押すと、何も変えずに終了します。"));
  }
  for (const f of review.files) if (f.blocks.length) box.append(renderFile(f));
  $("side").hidden = false;
  $("prog").hidden = false;
  $("submit").hidden = false;
  $("scope-card").hidden = true;
  renderFilters();
  renderToc();
  updateCounts();
  if (submitted) markSubmitted();
}

function renderFilters() {
  const t = tally();
  fill($("filters"), [["all", "すべて", t.total], ["todo", "未確認", t.todo], ["change", "変更", t.change]].map(([k, label, n]) =>
    el("button", {
      type: "button", "aria-pressed": filter === k ? "true" : "false",
      onclick: () => { filter = k; renderToc(); },
    }, label, " ", el("span", { class: "n" }, String(n)))));
}

function renderToc() {
  renderFilters();
  const files = (review?.files || []).filter((f) => f.blocks.length);
  fill($("toc"), files.map((f) => {
    const [dir, base] = splitPath(f.path);
    const items = blocks.filter((x) => x.file === f && (filter === "all" || stateOf(x.b) === filter));
    return el("div", { class: "toc-file" + (excluded.has(f.id) ? " excluded" : "") },
      el("a", { class: "toc-path", href: "#file-" + f.id, title: f.path }, el("span", { class: "dir" }, dir), el("span", { class: "base" }, base)),
      items.length ? el("ol", { class: "toc-list" }, items.map(({ b, node }) => {
        const s = stateOf(b);
        return el("li", {}, el("a", {
          class: "toc-item" + (current === b.key ? " cur" : ""), href: "#" + node.id,
          onclick: () => setCurrent(b.key),
        },
        el("span", { class: "mk " + s }), el("span", { class: "sr" }, STATE_LABEL[s]),
        el("span", { class: "ln" }, `L${b.line_start}`),
        el("span", { class: "snip" }, b.original.replace(/\s+/g, " ").slice(0, 40))));
      })) : el("div", { class: "toc-empty" }, "該当する箇所はありません"));
  }));
}

function renderFile(f) {
  const wrap = el("article", { class: "file" + (excluded.has(f.id) ? " excluded" : ""), id: "file-" + f.id });
  const cb = el("input", { type: "checkbox", checked: excluded.has(f.id) });
  cb.addEventListener("change", () => {
    if (cb.checked) excluded.add(f.id); else excluded.delete(f.id);
    wrap.classList.toggle("excluded", cb.checked);
    refreshAll();
  });
  const [dir, base] = splitPath(f.path);
  wrap.append(el("div", { class: "file-head" },
    el("span", { class: "path" }, el("span", { class: "dir" }, dir), el("span", { class: "base" }, base)),
    el("span", { class: "count" }, `${f.blocks.length} 箇所`),
    el("span", { class: "sp" }),
    el("label", {}, cb, "このファイルは変更しない")));
  if ((f.warnings || []).length) {
    wrap.append(el("ul", { class: "warnings" }, f.warnings.map((w) => el("li", {}, w))));
  }

  // 行の範囲が重なる校閲箇所（同じ行の文字列と行末コメントなど）は1つのまとまりにする
  const lines = f.text.split("\n");
  const groups = [];
  for (const b of [...f.blocks].sort((x, y) => x.line_start - y.line_start)) {
    const g = groups[groups.length - 1];
    if (g && b.line_start <= g.end) { g.blocks.push(b); g.end = Math.max(g.end, b.line_end); }
    else groups.push({ start: b.line_start, end: b.line_end, blocks: [b] });
  }
  const visible = new Uint8Array(lines.length + 2);
  const groupAt = {};
  for (const g of groups) {
    for (let i = Math.max(1, g.start - CONTEXT_LINES); i <= Math.min(lines.length, g.end + CONTEXT_LINES); i++) visible[i] = 1;
    groupAt[g.start] = g;
  }
  const lineNode = (i, cls) => el("div", { class: "row " + (cls || "") },
    el("span", { class: "num" }, i), el("span", { class: "tx" }, lines[i - 1].replace(/\r$/, "")));

  const body = el("div", { class: "file-body" });
  let i = 1;
  while (i <= lines.length) {
    const g = groupAt[i];
    if (g) {
      for (let k = g.start; k <= g.end; k++) body.append(lineNode(k, "target"));
      for (const b of g.blocks) body.append(renderBlock(b, f));
      i = g.end + 1;
      continue;
    }
    if (!visible[i]) {
      const from = i;
      while (i <= lines.length && !visible[i] && !groupAt[i]) i++;
      const to = i - 1;
      if (to === lines.length && from === to && lines[to - 1] === "") continue;
      const btn = el("button", { class: "fold", type: "button" }, `${from}〜${to} 行目を表示（${to - from + 1} 行）`);
      btn.addEventListener("click", () => {
        const frag = document.createDocumentFragment();
        for (let k = from; k <= to; k++) frag.append(lineNode(k));
        btn.replaceWith(frag);
      });
      body.append(btn);
      continue;
    }
    body.append(lineNode(i));
    i++;
  }
  wrap.append(body);
  return wrap;
}

function renderNotes(o) {
  return [
    o.deletion ? el("div", { class: "onote warn" }, "この提案は文や箇所を削ります。") : null,
    o.reason ? el("div", { class: "onote" }, o.reason) : null,
    (o.conflicts || []).length ? el("div", { class: "onote" }, el("span", { class: "k" }, "案どうしで食い違った点"),
      el("ul", {}, o.conflicts.map((c) => el("li", {}, c)))) : null,
    (o.questions || []).length ? el("div", { class: "ask" }, el("span", { class: "k" }, ICON_ASK(), "書き手に確かめたい点"),
      el("ul", {}, o.questions.map((c) => el("li", {}, c)))) : null,
    (o.warnings || []).length ? el("div", { class: "onote warn" }, el("ul", {}, o.warnings.map((c) => el("li", {}, c)))) : null,
  ];
}

function renderBlock(b, file) {
  const box = el("section", {
    class: "block", id: "hunk-" + b.key.replace(":", "-"), "data-key": b.key, tabindex: "-1",
    "aria-label": `${file.path} ${b.line_start === b.line_end ? `${b.line_start} 行目` : `${b.line_start}〜${b.line_end} 行目`}`,
  });
  const name = `mode-${b.key}`;
  const range = b.line_start === b.line_end ? `${b.line_start} 行目` : `${b.line_start}〜${b.line_end} 行目`;
  const occList = b.occurrences || [];
  box.addEventListener("focusin", () => { if (current !== b.key) setCurrent(b.key); });
  box.addEventListener("pointerdown", () => { if (current !== b.key) setCurrent(b.key); });

  const pick = (key) => {
    const d = decisions[b.key] || {};
    decisions[b.key] = { ...d, sel: key };
    if (editing === b.key) editing = null;
    commit();
  };
  const startEdit = (o) => {
    const d = decisions[b.key] || { sel: o.key };
    d.texts = d.texts || {};
    if (d.texts[o.key] === undefined) d.texts[o.key] = o.text;
    decisions[b.key] = d;
    editing = b.key;
    commit(true);
  };

  const draw = (focusEditor) => {
    const d = decisions[b.key] || {};
    const sel = d.sel;
    const chip = el("span", { class: "chip " + stateOf(b) }, chipLabel(b));

    const radio = (key, checked) => el("input", { type: "radio", name, value: key, checked, onchange: () => pick(key) });
    const orig = el("div", { class: "opt orig" + (sel === "orig" ? " on" : "") },
      el("label", { class: "opt-row" }, radio("orig", sel === "orig"), el("kbd", {}, "0"), el("span", { class: "oname" }, "原文のまま変更しない")));

    const opts = sortedOptions(b).map((o, idx) => {
      const on = sel === o.key;
      const st = charStat(b.original, o.text);
      const txt = editedText(b, o);
      const edited = on && txt !== undefined && txt !== o.text;
      const isEditing = on && editing === b.key;
      const editedTag = edited ? el("span", { class: "edited-tag" }, "手直し済み") : null;
      const card = el("div", { class: "opt" + (on ? " on" : ""), "data-opt": o.key },
        el("label", { class: "opt-main" },
          el("span", { class: "opt-row" }, radio(o.key, on),
            el("kbd", {}, idx < 9 ? String(idx + 1) : "·"),
            el("span", { class: "oname", title: o.sources.map((s) => SOURCE_TITLES[s] || s).join("、") }, optionName(o)),
            o.others.length ? el("span", { class: "also" }, o.others.map((s) => SOURCE_NAMES[s] || s).join("、") + " と同じ案") : null,
            el("span", { class: "stat", "aria-label": `${st.del} 文字削除、${st.ins} 文字追加` },
              el("span", { class: "m" }, `−${st.del}`), " ", el("span", { class: "p" }, `+${st.ins}`)),
            o.deletion ? el("span", { class: "cut-tag" }, "削除を含む") : null,
            editedTag),
          renderInlineDiff(b, o.text, "odiff")),
        renderNotes(o));
      if (on && !isEditing) {
        card.append(el("div", { class: "opt-actions" },
          el("button", { class: "btn btn-small", type: "button", onclick: () => startEdit(o) },
            txt !== undefined && txt !== o.text ? "手直しを続ける" : "手直しする", " ", el("kbd", {}, "E"))));
      }
      if (isEditing) card.append(renderEditor(b, o, card, focusEditor));
      return card;
    });

    let occ = null;
    if (occList.length) {
      const changing = stateOf(b) === "change";
      const cb = el("input", { type: "checkbox", checked: !!d.occ, disabled: !changing });
      cb.addEventListener("change", () => { decisions[b.key].occ = cb.checked; saveLocal(); });
      occ = el("div", { class: "occ" },
        `同じ文字列が、ほかに ${occList.length} 箇所あります。テストの期待値などに使われていると、この箇所だけ変えるとテストが失敗します。`,
        el("ul", {}, occList.map((x) => el("li", {}, `${x.path}:${x.line}  ${x.context}`))),
        el("label", { class: changing ? "" : "off" }, cb, "変更後の内容で、これらも書き換える"));
    }

    fill(box,
      el("div", { class: "bhead" },
        el("span", { class: "kind" }, KIND_LABEL[b.kind] || b.kind),
        el("span", {}, range),
        chip,
        occList.length ? el("span", { class: "occ-tag" }, ICON_WARN(), `同じ文字列がほかに ${occList.length} 箇所`) : null),
      el("fieldset", { class: "opts" }, el("legend", { class: "sr" }, `${range}の扱い`), orig, opts),
      occ);
    box.classList.toggle("cur", current === b.key);
    if (submitted || finished) lockAll();
  };

  const renderEditor = (b, o, card, focusEditor) => {
    const d = decisions[b.key];
    const ta = el("textarea", { id: "ta-" + b.key, spellcheck: "false" });
    ta.value = d.texts[o.key];
    let preview = renderInlineDiff(b, ta.value, "preview");
    ta.addEventListener("input", () => {
      d.texts[o.key] = ta.value;
      const next = renderInlineDiff(b, ta.value, "preview");
      preview.replaceWith(next);
      preview = next;
      // 手直し済みの印と状態の表示だけを更新する（作り直すと入力中の欄からフォーカスが外れる）
      const row = card.querySelector(".opt-row");
      row.querySelector(".edited-tag")?.remove();
      if (ta.value !== o.text) row.append(el("span", { class: "edited-tag" }, "手直し済み"));
      const chip = box.querySelector(".chip");
      chip.className = "chip " + stateOf(b);
      chip.textContent = chipLabel(b);
      const occCb = box.querySelector(".occ input");
      if (occCb) { occCb.disabled = stateOf(b) !== "change"; occCb.parentElement.className = occCb.disabled ? "off" : ""; }
      refreshAll();
    });
    queueMicrotask(() => {
      ta.style.height = Math.max(64, ta.scrollHeight + 4) + "px";
      if (focusEditor) { ta.focus(); ta.scrollIntoView({ block: "nearest" }); }
    });
    return el("div", { class: "editor" },
      el("label", { class: "ed-k", for: ta.id }, "変更後の内容", el("span", { class: "hint" }, EDIT_HINT[b.kind] || "")),
      ta,
      el("div", { class: "ed-k" }, "ファイルに反映される差分"),
      preview,
      el("div", { class: "ed-actions" },
        el("button", { class: "btn btn-small", type: "button", onclick: () => { editing = null; draw(false); box.focus({ preventScroll: true }); } }, "編集を閉じる"),
        el("button", { class: "btn btn-small btn-quiet", type: "button", onclick: () => { d.texts[o.key] = o.text; commit(true); } }, "提案の内容に戻す")));
  };

  const commit = (focusEditor) => { draw(focusEditor); refreshAll(); };
  blocks.push({ b, file, node: box, draw, pick, startEdit });
  draw(false);
  return box;
}

// ------------------------------------------------------------ キー操作

function setCurrent(key, scroll) {
  const prev = current;
  current = key;
  for (const x of blocks) {
    if (x.b.key === prev || x.b.key === key) x.node.classList.toggle("cur", x.b.key === key);
  }
  const x = blocks.find((y) => y.b.key === key);
  if (x && scroll) {
    navAt = Date.now();
    x.node.focus({ preventScroll: true });
    x.node.scrollIntoView({ block: "start" });
  }
  renderToc();
}

function inView(node) {
  if (Date.now() - navAt < 1500 && node.classList.contains("cur")) return true;
  const r = node.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
}

function moveCurrent(delta) {
  if (!blocks.length) return;
  let idx = blocks.findIndex((x) => x.b.key === current);
  if (idx < 0 || !inView(blocks[idx].node)) {
    // 現在の箇所が画面の外なら、いま見えている位置から数える
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar-h")) || 60;
    const first = blocks.findIndex((x) => x.node.getBoundingClientRect().bottom > top + 40);
    idx = first < 0 ? blocks.length - 1 : first - (delta > 0 ? 1 : 0);
  }
  const next = Math.max(0, Math.min(blocks.length - 1, idx + delta));
  setCurrent(blocks[next].b.key, true);
}

function currentEntry() {
  let x = blocks.find((y) => y.b.key === current);
  if (!x || !inView(x.node)) {
    x = blocks.find((y) => inView(y.node)) || x;
    if (x) setCurrent(x.b.key);
  }
  return x;
}

document.addEventListener("keydown", (ev) => {
  if (!review || submitted || finished || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing) return;
  const t = ev.target;
  if (t.tagName === "TEXTAREA") {
    if (ev.key === "Escape") {
      const x = blocks.find((y) => y.node.contains(t));
      if (x) { ev.preventDefault(); editing = null; x.draw(false); x.node.focus({ preventScroll: true }); }
    }
    return;
  }
  if (t.tagName === "INPUT" && t.type !== "radio" && t.type !== "checkbox") return;
  if (!$("confirm").hidden) {
    if (ev.key === "Escape") { closeConfirm(); $("submit").focus(); }
    return;
  }
  const k = ev.key.toLowerCase();
  if (k === "j" || k === "k") { ev.preventDefault(); moveCurrent(k === "j" ? 1 : -1); return; }
  if (k === "n") {
    const x = firstTodo();
    if (x) { ev.preventDefault(); setCurrent(x.b.key, true); }
    return;
  }
  if (/^[0-9]$/.test(k)) {
    const x = currentEntry();
    if (!x || excluded.has(x.file.id)) return;
    const n = Number(k);
    const opts = sortedOptions(x.b);
    if (n > opts.length) return;
    ev.preventDefault();
    x.pick(n === 0 ? "orig" : opts[n - 1].key);
    x.node.focus({ preventScroll: true });
    return;
  }
  if (k === "e") {
    const x = currentEntry();
    const o = x && selectedOption(x.b);
    if (o && !excluded.has(x.file.id)) { ev.preventDefault(); x.startEdit(o); }
  }
});

// ------------------------------------------------------------ 反映

function lockAll() {
  for (const n of document.querySelectorAll("#files button, #files input, #files textarea")) {
    if (!n.classList.contains("fold")) n.disabled = true;
  }
  $("submit").disabled = true;
}

function markSubmitted() {
  lockAll();
  $("submit").hidden = false;
  $("submit").textContent = "反映を待っています";
  $("next-todo").hidden = true;
}

function closeConfirm() {
  $("confirm").hidden = true;
  $("submit").setAttribute("aria-expanded", "false");
}

function renderConfirm() {
  const t = tally();
  const err = el("div", { class: "err small", role: "alert" });
  const next = firstTodo();
  const yes = el("button", { class: "btn btn-primary", type: "button" }, t.change ? `${t.change} 箇所を反映する` : "何も変えずに終了する");
  yes.addEventListener("click", async () => {
    const out = {};
    for (const f of review.files) {
      if (excluded.has(f.id)) continue;
      for (const b of f.blocks) {
        if (stateOf(b) !== "change") continue;
        const o = selectedOption(b);
        const text = finalText(b);
        out[b.key] = { text, source: text === o.text ? o.key : "edited", apply_occurrences: !!decisions[b.key].occ };
      }
    }
    yes.disabled = true;
    const r = await api("/api/submit", { blocks: out, excluded_files: [...excluded] });
    if (r.status === 200 || r.status === 409) {
      submitted = true;
      closeConfirm();
      markSubmitted();
    } else {
      yes.disabled = false;
      err.textContent = "送れませんでした（" + r.status + "）。もう一度押してください";
    }
  });
  fill($("confirm"),
    el("h2", { id: "cf-title", class: "cf-h" }, "反映の確認"),
    el("dl", { class: "cf-list" },
      el("div", { class: "cf-row" }, el("dt", {}, "変更する"), el("dd", {}, el("b", {}, String(t.change)), " 箇所")),
      t.perFile.map((x) => el("div", { class: "cf-sub" }, el("dt", {}, x.path), el("dd", {}, `${x.n} 箇所`))),
      el("div", { class: "cf-row" }, el("dt", {}, "原文のまま"), el("dd", {}, el("b", {}, String(t.keep)), " 箇所")),
      t.todo ? el("div", { class: "cf-row warn" }, el("dt", {}, "未確認"), el("dd", {}, el("b", {}, String(t.todo)), " 箇所（原文のままになります）")) : null,
      excluded.size ? el("div", { class: "cf-row" }, el("dt", {}, "変更しないファイル"), el("dd", {}, String(excluded.size))) : null),
    next ? el("p", { class: "cf-note" }, "確かめていない箇所が残っています。このまま反映すると、それらは原文のままになります。 ",
      el("a", { href: "#" + next.node.id, onclick: () => { closeConfirm(); setCurrent(next.b.key, true); } }, "未確認の箇所へ")) : null,
    el("div", { class: "cf-actions" }, yes,
      el("button", { class: "btn btn-quiet", type: "button", onclick: () => { closeConfirm(); $("submit").focus(); } }, "戻る")),
    err);
  return yes;
}

$("submit").addEventListener("click", () => {
  if (!$("confirm").hidden) { closeConfirm(); return; }
  const yes = renderConfirm();
  $("confirm").hidden = false;
  $("submit").setAttribute("aria-expanded", "true");
  yes.focus({ preventScroll: true });
});
$("next-todo").addEventListener("click", (ev) => {
  const x = firstTodo();
  if (!x) return;
  ev.preventDefault();
  setCurrent(x.b.key, true);
});

poll();
