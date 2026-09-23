"use strict";

const TOKEN = new URLSearchParams(location.search).get("t") || "";
const STORE_KEY = "jp-proofread:" + TOKEN.slice(0, 16);
const PHASES = { resolving: "対象を特定中", generating: "候補を生成中", review: "レビュー待ち", applying: "反映中", done: "完了", failed: "失敗" };
const CONTEXT_LINES = 3;

let review = null;
let submitted = false;
let lastStateJson = "";
// decisions[key] = { mode: "adopted" | "original", source, text, occ }
let decisions = loadDecisions();
let excluded = new Set(loadExcluded());
const viewTab = {};

function loadDecisions() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}").decisions || {}; } catch { return {}; }
}
function loadExcluded() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}").excluded || []; } catch { return []; }
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
    else if (k === "text") e.textContent = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

function fill(node, ...children) {
  node.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
}

// ------------------------------------------------------------ 差分（文字単位の LCS）

function diff(a, b) {
  const A = Array.from(a), B = Array.from(b);
  let p = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p++;
  let s = 0;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
  const a2 = A.slice(p, A.length - s), b2 = B.slice(p, B.length - s);
  const ops = [];
  if (p) ops.push(["=", A.slice(0, p).join("")]);
  const n = a2.length, m = b2.length;
  if (n * m > 4_000_000) {
    if (n) ops.push(["-", a2.join("")]);
    if (m) ops.push(["+", b2.join("")]);
  } else if (n || m) {
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = a2[i] === b2[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0, j = 0;
    const push = (op, ch) => {
      const last = ops[ops.length - 1];
      if (last && last[0] === op) last[1] += ch; else ops.push([op, ch]);
    };
    while (i < n && j < m) {
      if (a2[i] === b2[j]) { push("=", a2[i]); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { push("-", a2[i]); i++; }
      else { push("+", b2[j]); j++; }
    }
    while (i < n) push("-", a2[i++]);
    while (j < m) push("+", b2[j++]);
  }
  if (s) {
    const last = ops[ops.length - 1];
    const tail = A.slice(A.length - s).join("");
    if (last && last[0] === "=") last[1] += tail; else ops.push(["=", tail]);
  }
  return ops;
}

function renderDiff(a, b) {
  const box = el("div", { class: "diff" });
  if (a === b) {
    box.append(el("span", { class: "muted" }, "（原文と同じ）"));
    return box;
  }
  for (const [op, t] of diff(a, b)) {
    box.append(op === "=" ? document.createTextNode(t) : el(op === "-" ? "del" : "ins", {}, t));
  }
  return box;
}

// ------------------------------------------------------------ 状態の表示

async function poll() {
  try {
    const { status, data } = await api("/api/state");
    if (status !== 200) {
      setMessage("サーバーに接続できません（URL のトークンを確認してください）", true);
      return;
    }
    submitted = data.submitted;
    const json = JSON.stringify(data);
    if (json !== lastStateJson) {
      lastStateJson = json;
      renderState(data);
    }
    if (data.review_ready && !review) {
      const r = await api("/api/review");
      if (r.status === 200) {
        review = r.data;
        renderReview();
        renderState(data);
      }
    }
    updateCounts();
  } catch (e) {
    setMessage("サーバーとの通信が途切れました: " + e.message, true);
  } finally {
    setTimeout(poll, 2000);
  }
}

function setMessage(text, isErr) {
  const m = document.getElementById("message");
  m.textContent = text;
  m.classList.toggle("err", !!isErr);
}

function renderState(data) {
  const st = data.state || {};
  document.getElementById("phase").textContent = PHASES[st.phase] || st.phase || "";
  setMessage(st.message || "");
  renderQuestions(st.questions || [], new Set(data.answered || []));
  renderScope(st);
  renderProgress(st);
  renderResult(st);
}

function renderQuestions(questions, answered) {
  const box = document.getElementById("questions");
  const open = questions.filter((q) => q.status === "open" && !answered.has(q.id));
  const shown = new Set([...box.querySelectorAll("[data-qid]")].map((n) => n.dataset.qid));
  for (const node of box.querySelectorAll("[data-qid]")) {
    if (!open.some((q) => q.id === node.dataset.qid)) node.remove();
  }
  for (const q of open) {
    if (shown.has(q.id)) continue;
    const form = el("form", { class: "question", "data-qid": q.id });
    form.append(el("h2", {}, "エージェントからの質問"), el("p", {}, q.text));
    for (const c of q.choices || []) {
      form.append(el("label", {}, el("input", { type: "radio", name: "choice", value: c }), " ", c));
    }
    if (q.allow_free !== false) {
      form.append(el("textarea", { name: "text", placeholder: (q.choices || []).length ? "補足（任意）" : "回答" }));
    }
    const err = el("div", { class: "err small" });
    form.append(el("button", { class: "primary", type: "submit" }, "回答する"), err);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const choice = form.querySelector("input[name=choice]:checked")?.value ?? null;
      const text = form.querySelector("textarea")?.value ?? "";
      if (!choice && !text.trim()) { err.textContent = "選択するか、回答を入力してください"; return; }
      const r = await api("/api/answer", { qid: q.id, choice, text });
      if (r.status === 200 || r.status === 409) form.replaceWith(el("div", { class: "panel muted" }, "回答を送りました。"));
      else err.textContent = "送信に失敗しました";
    });
    box.append(form);
  }
}

function renderScope(st) {
  const box = document.getElementById("scope");
  const sc = st.scope || {};
  box.hidden = !(sc.request || sc.interpretation);
  fill(box,
    el("h2", {}, "校閲の範囲"),
    sc.request ? el("div", {}, el("span", { class: "muted" }, "依頼: "), sc.request) : null,
    sc.interpretation ? el("div", {}, el("span", { class: "muted" }, "解釈: "), sc.interpretation) : null,
    sc.settings ? el("div", {}, el("span", { class: "muted" }, "文書の種類・文体: "), sc.settings) : null,
    sc.glossary ? el("div", {}, el("span", { class: "muted" }, "用語集: "), sc.glossary) : null,
  );
}

function renderProgress(st) {
  const box = document.getElementById("progress");
  const active = ["resolving", "generating", "applying", "failed"].includes(st.phase);
  box.hidden = !active && !!review;
  const rows = (st.files || []).map((f) =>
    el("tr", {}, el("td", { class: "small" }, f.path), el("td", { class: "small" }, f.kind),
      el("td", { class: "small" }, String(f.blocks ?? "")), el("td", { class: "small" }, f.status || ""),
      el("td", { class: "small muted" }, f.detail || "")));
  const log = el("div", { class: "log" }, (st.log || []).slice(-30).map((l) => el("div", {}, `${l.time.slice(11)}  ${l.message}`)));
  fill(box,
    el("h2", {}, "進行状況"),
    rows.length ? el("table", { class: "status" },
      el("tr", {}, ["ファイル", "形式", "箇所", "状態", "詳細"].map((h) => el("th", { class: "small" }, h))), rows) : null,
    log,
  );
  log.scrollTop = log.scrollHeight;
}

function renderResult(st) {
  const box = document.getElementById("result");
  if (st.phase !== "done" || !st.result) { box.hidden = true; return; }
  const r = st.result;
  box.hidden = false;
  fill(box,
    el("h2", {}, "反映結果"),
    el("div", {}, `反映 ${r.applied} 箇所 / 他の出現箇所 ${r.occurrences} 箇所 / 原文のまま ${r.kept_original} 箇所`),
    (r.written || []).length ? el("ul", {}, r.written.map((w) => el("li", { class: "small" }, `${w.path}（${w.edits} 箇所、バックアップ: ${w.backup}）`))) : null,
    (r.rejected || []).length ? el("div", { class: "err" }, "検証に通らず反映しなかった箇所:",
      el("ul", {}, r.rejected.map((x) => el("li", { class: "small" }, `${x.path} ${x.block}: ${x.errors.join("; ")}`)))) : null,
    (r.skipped || []).length ? el("div", { class: "err" }, "反映しなかったファイル:",
      el("ul", {}, r.skipped.map((x) => el("li", { class: "small" }, `${x.path} ${x.block || ""}: ${x.reason}`)))) : null,
    el("p", { class: "muted small" }, "このページは閉じて構いません。"),
  );
  document.getElementById("submitbar").hidden = true;
  lockAll();
}

// ------------------------------------------------------------ レビュー

function renderReview() {
  const box = document.getElementById("files");
  box.replaceChildren();
  if (!review.files.length || !review.total) {
    box.append(el("div", { class: "panel" }, "修正の候補はありませんでした。Submit すると何も変更せずに終了します。"));
  }
  for (const f of review.files) box.append(renderFile(f));
  document.getElementById("submitbar").hidden = false;
  if (submitted) lockAll();
}

function renderFile(f) {
  const wrap = el("div", { class: "file" + (excluded.has(f.id) ? " excluded" : ""), id: "file-" + f.id });
  const cb = el("input", { type: "checkbox", checked: excluded.has(f.id) });
  cb.addEventListener("change", () => {
    if (cb.checked) excluded.add(f.id); else excluded.delete(f.id);
    wrap.classList.toggle("excluded", cb.checked);
    saveLocal();
    updateCounts();
  });
  wrap.append(el("div", { class: "file-head" },
    el("span", { class: "path" }, f.path),
    el("span", { class: "badge" }, `${f.blocks.length} 箇所`),
    el("span", { class: "spacer" }),
    el("label", { class: "small" }, cb, " このファイルを除外")));
  if ((f.warnings || []).length) {
    wrap.append(el("div", { class: "warnings" }, el("ul", {}, f.warnings.map((w) => el("li", {}, w)))));
  }
  const body = el("div", { class: "file-body code" });
  if (!f.blocks.length) {
    body.append(el("div", { class: "muted", style: "padding:8px 12px" }, "修正の候補はありません"));
    wrap.append(body);
    return wrap;
  }
  const lines = f.text.split("\n");
  const visible = new Uint8Array(lines.length + 2);
  const target = new Uint8Array(lines.length + 2);
  const cardsAfter = {};
  for (const b of f.blocks) {
    for (let i = Math.max(1, b.line_start - CONTEXT_LINES); i <= Math.min(lines.length, b.line_end + CONTEXT_LINES); i++) visible[i] = 1;
    for (let i = b.line_start; i <= b.line_end; i++) target[i] = 1;
    (cardsAfter[b.line_end] ||= []).push(b);
  }
  const lineNode = (i) => el("div", { class: "line" + (target[i] ? " target" : "") },
    el("span", { class: "ln" }, String(i)), el("span", { class: "tx" }, lines[i - 1].replace(/\r$/, "")));
  let i = 1;
  while (i <= lines.length) {
    if (!visible[i]) {
      const from = i;
      while (i <= lines.length && !visible[i]) i++;
      const to = i - 1;
      if (to === lines.length && lines[to - 1] === "" && from === to) continue;
      const btn = el("button", { class: "fold" }, `⋯ ${to - from + 1} 行を表示（${from}〜${to} 行目）`);
      btn.addEventListener("click", () => {
        const frag = document.createDocumentFragment();
        for (let k = from; k <= to; k++) frag.append(lineNode(k));
        btn.replaceWith(frag);
      });
      body.append(btn);
      continue;
    }
    body.append(lineNode(i));
    for (const b of cardsAfter[i] || []) body.append(renderCard(f, b));
    i++;
  }
  wrap.append(body);
  return wrap;
}

const KIND_LABEL = { md: "Markdown", comment: "コメント", literal: "文字列" };

function renderCard(f, b) {
  const card = el("div", { class: "card", "data-key": b.key });
  const draw = () => {
    const d = decisions[b.key];
    card.classList.toggle("decided", !!d);
    const tabKey = viewTab[b.key] || (d && d.mode === "adopted" && d.source !== "edited" ? d.source : b.options[0].key);
    const opt = b.options.find((o) => o.key === tabKey) || b.options[0];
    const stateBadge = !d ? el("span", { class: "badge state-none" }, "未選択")
      : d.mode === "original" ? el("span", { class: "badge" }, "原文のまま")
        : el("span", { class: "badge state-adopted" }, d.source === "edited" ? "編集して採用" : "採用: " + labelOf(b, d.source));

    const tabs = el("div", { class: "tabs" }, b.options.map((o) => {
      const chosen = d && d.mode === "adopted" && d.source === o.key;
      return el("button", {
        class: (o.key === opt.key ? "active " : "") + (chosen ? "chosen" : ""),
        onclick: () => { viewTab[b.key] = o.key; draw(); },
        title: o.sources.map((s) => sourceLabel(b, s)).join(" / "),
      }, o.sources.length > 1 ? o.sources.map((s) => sourceLabel(b, s)).join(" = ") : o.label, o.deletion ? " ✂" : "");
    }));

    const notes = el("div", { class: "notes" });
    if (opt.deletion) notes.append(el("div", {}, el("span", { class: "badge del" }, "削除・削減の提案")));
    if (opt.reason) notes.append(el("div", {}, el("span", { class: "label" }, "理由"), opt.reason));
    if ((opt.conflicts || []).length) notes.append(el("div", {}, el("span", { class: "label" }, "衝突"), el("ul", {}, opt.conflicts.map((c) => el("li", {}, c)))));
    if ((opt.questions || []).length) notes.append(el("div", {}, el("span", { class: "label" }, "書き手に確かめたい点"), el("ul", {}, opt.questions.map((c) => el("li", {}, c)))));
    if ((opt.warnings || []).length) notes.append(el("div", { class: "warn" }, el("ul", {}, opt.warnings.map((c) => el("li", {}, "⚠ " + c)))));

    const actions = el("div", { class: "actions" },
      el("button", { class: "primary", onclick: () => { decisions[b.key] = { mode: "adopted", source: opt.key, text: opt.text, occ: d?.occ ?? false }; commit(); } }, "この候補を採用して編集"),
      el("button", { onclick: () => { decisions[b.key] = { mode: "original" }; commit(); } }, "原文のまま"),
      d ? el("button", { onclick: () => { delete decisions[b.key]; commit(); } }, "未選択に戻す") : null);

    let editor = null;
    if (d && d.mode === "adopted") {
      const ta = el("textarea", {}, "");
      ta.value = d.text;
      let live = renderDiff(b.original, d.text);
      ta.addEventListener("input", () => {
        d.text = ta.value;
        const base = b.options.find((o) => o.key === d.source)?.text;
        if (d.source !== "edited" && ta.value !== base) {
          d.baseSource = d.source;
          d.source = "edited";
          stateBadge.textContent = "編集して採用";
          for (const t of card.querySelectorAll(".tabs button.chosen")) t.classList.remove("chosen");
        }
        const next = renderDiff(b.original, ta.value);
        live.replaceWith(next);
        live = next;
        saveLocal();
        updateCounts();
      });
      editor = el("div", { class: "editor" },
        el("div", { class: "small muted" }, "反映する内容（直接編集できます）"), ta,
        el("div", { class: "small muted" }, "原文との差分"), live);
      queueMicrotask(() => { ta.style.height = Math.max(80, ta.scrollHeight + 4) + "px"; });
    }

    let occ = null;
    if ((b.occurrences || []).length) {
      const cb = el("input", { type: "checkbox", checked: !!(d && d.occ), disabled: !(d && d.mode === "adopted") });
      cb.addEventListener("change", () => { d.occ = cb.checked; saveLocal(); });
      occ = el("div", { class: "occ" },
        `⚠ 同じ文字列が他に ${b.occurrences.length} 箇所あります（テストの期待値などが壊れる可能性があります）`,
        el("ul", {}, b.occurrences.map((o) => el("li", {}, `${o.path}:${o.line}  ${o.context}`))),
        el("label", {}, cb, " 採用した内容で、これらも書き換える"));
    }

    fill(card, [
      el("div", { class: "card-head" },
        el("span", { class: "small muted" }, `${b.line_start === b.line_end ? b.line_start : b.line_start + "〜" + b.line_end} 行目`),
        el("span", { class: "badge" }, KIND_LABEL[b.kind] || b.kind),
        stateBadge),
      tabs,
      el("div", { class: "small muted", style: "padding:4px 10px 0" }, `原文 → ${opt.label}`),
      renderDiff(b.original, opt.text),
      notes,
      actions,
      editor,
      occ,
    ]);
    if (submitted) lockAll();
  };
  const commit = () => { saveLocal(); draw(); updateCounts(); };
  draw();
  return card;
}

function sourceLabel(b, s) {
  const map = { gemini: "japanese-natural-writing", yomiyasu: "yomiyasu", techwriting: "japanese-tech-writing", integrated: "統合案", concise: "統合案＋簡潔化" };
  return map[s] || s;
}
function labelOf(b, key) {
  const o = b.options.find((x) => x.key === key);
  return o ? o.label : key;
}

// ------------------------------------------------------------ 送信

function tally() {
  let adopted = 0, original = 0, none = 0;
  if (!review) return { adopted, original, none };
  for (const f of review.files) {
    if (excluded.has(f.id)) continue;
    for (const b of f.blocks) {
      const d = decisions[b.key];
      if (!d) none++; else if (d.mode === "adopted") adopted++; else original++;
    }
  }
  return { adopted, original, none };
}

function updateCounts() {
  const t = tally();
  document.getElementById("counts").textContent =
    `採用 ${t.adopted} / 原文のまま ${t.original} / 未選択 ${t.none}` + (excluded.size ? ` / 除外ファイル ${excluded.size}` : "");
}

function lockAll() {
  for (const n of document.querySelectorAll("#files button, #files input, #files textarea")) {
    if (!n.classList.contains("fold")) n.disabled = true;
  }
  document.getElementById("submit").disabled = true;
}

document.getElementById("submit").addEventListener("click", () => {
  const t = tally();
  document.getElementById("confirm-text").textContent =
    `採用 ${t.adopted} 箇所を反映します。` + (t.none ? `未選択の ${t.none} 箇所は原文のままにします。` : "");
  document.getElementById("confirm").hidden = false;
  document.getElementById("submit").hidden = true;
});
document.getElementById("confirm-no").addEventListener("click", () => {
  document.getElementById("confirm").hidden = true;
  document.getElementById("submit").hidden = false;
});
document.getElementById("confirm-yes").addEventListener("click", async () => {
  const blocks = {};
  for (const f of review.files) {
    if (excluded.has(f.id)) continue;
    for (const b of f.blocks) {
      const d = decisions[b.key];
      if (d && d.mode === "adopted") blocks[b.key] = { text: d.text, source: d.source, apply_occurrences: !!d.occ };
    }
  }
  document.getElementById("confirm-yes").disabled = true;
  const r = await api("/api/submit", { blocks, excluded_files: [...excluded] });
  document.getElementById("confirm").hidden = true;
  if (r.status === 200 || r.status === 409) {
    submitted = true;
    lockAll();
    document.getElementById("submit").hidden = false;
    document.getElementById("counts").textContent = "送信しました。エージェントが反映するのを待っています…";
  } else {
    document.getElementById("confirm-yes").disabled = false;
    document.getElementById("submit").hidden = false;
    setMessage("送信に失敗しました（" + r.status + "）", true);
  }
});

poll();
