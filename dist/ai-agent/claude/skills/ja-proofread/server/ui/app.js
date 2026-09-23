"use strict";

const TOKEN = new URLSearchParams(location.search).get("t") || "";
const STORE_KEY = "jp-proofread:" + TOKEN.slice(0, 16);
const PHASES = { resolving: "対象を特定中", generating: "候補を作成中", review: "確認待ち", applying: "反映中", done: "反映済み", failed: "失敗" };
const SOURCE_NAMES = {
  gemini: "Gemini", yomiyasu: "yomiyasu", techwriting: "tech-writing",
  integrated: "統合案", concise: "統合案＋簡潔化",
};
const SOURCE_TITLES = {
  gemini: "japanese-natural-writing（Gemini）", yomiyasu: "yomiyasu", techwriting: "japanese-tech-writing",
  integrated: "各案の変更をまとめた案", concise: "統合案をさらに簡潔にした案",
};
const KIND_LABEL = { md: "Markdown", comment: "コメント", literal: "文字列" };
const EDIT_HINT = {
  comment: "コメントの本文を編集します。コメント記号とインデントは自動で付けます。",
  literal: "文字列の中身を編集します。引用符は自動で付けます。プレースホルダー（%s、{name} など）は消さないでください。",
  md: "Markdown のまま編集します。",
};
const CONTEXT_LINES = 3;

let review = null;
let submitted = false;
let lastStateJson = "";
// decisions[key] = { mode: "change" | "original", text, source, occ }
// mode が "original" でも text は残す（切り替えて戻したときに編集内容を失わないため）
let decisions = loadDecisions();
let excluded = new Set(loadStore().excluded || []);

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function loadDecisions() {
  const ds = loadStore().decisions || {};
  for (const d of Object.values(ds)) if (d.mode === "adopted") d.mode = "change";
  return ds;
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

function newSourceLines(b, prose) {
  if (!prose.trim() && b.deletable && b.original.trim()) return [];
  return (b.line_prefix + toRaw(b, prose) + b.line_suffix).split("\n");
}

const row = (cls, n, sign, content) => el("div", { class: "row " + cls },
  el("span", { class: "num" }, n ?? ""), el("span", { class: "sign" }, sign), el("span", { class: "tx" }, content));

// 校閲箇所の行を、実際のソースの形で unified diff として描く。
function renderDiffRows(b, prose) {
  const oldLines = oldSourceLines(b);
  const newLines = newSourceLines(b, prose);
  const rows = el("div", { class: "diff-rows code" });
  if (prose === b.original) {
    rows.append(row("ctx note-row", null, "", "（原文と同じです）"));
    return rows;
  }
  let num = b.line_start;
  const ops = diffSeq(oldLines, newLines);
  for (let k = 0; k < ops.length; k++) {
    const [op, xs] = ops[k];
    if (op === "=") { xs.forEach((l) => rows.append(row("ctx", num++, "", l))); continue; }
    // 連続する削除と追加をまとめ、行の中で変わった語句を強調する
    let dels = [], adds = [];
    if (op === "-") { dels = xs; if (ops[k + 1]?.[0] === "+") adds = ops[++k][1]; } else adds = xs;
    const delFrag = [[]], addFrag = [[]];
    const put = (frags, text, mark) => text.split("\n").forEach((part, i) => {
      if (i > 0) frags.push([]);
      if (part) frags[frags.length - 1].push(mark ? el(mark, {}, part) : document.createTextNode(part));
    });
    const both = dels.length && adds.length;
    for (const it of wordSegments(dels.join("\n"), adds.join("\n"))) {
      if (it.eq !== undefined) { put(delFrag, it.eq); put(addFrag, it.eq); continue; }
      put(delFrag, it.del, both ? "del" : null);
      put(addFrag, it.ins, both ? "ins" : null);
    }
    if (dels.length) delFrag.forEach((f) => rows.append(row("del", num++, "−", f)));
    if (adds.length) addFrag.forEach((f) => rows.append(row("ins", null, "+", f)));
  }
  if (!newLines.length) rows.append(row("ins note-row", null, "", "（この行を削除します）"));
  return rows;
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
  $("phase").textContent = PHASES[st.phase] || st.phase || "";
  setMessage(st.phase === "review" && review ? "" : st.message || "");
  renderQuestions(st.questions || [], new Set(data.answered || []));
  renderScope(st);
  renderProgress(st);
  renderResult(st);
}

function renderQuestions(questions, answered) {
  const box = $("questions");
  const open = questions.filter((q) => q.status === "open" && !answered.has(q.id));
  for (const node of box.querySelectorAll("[data-qid]")) {
    if (!open.some((q) => q.id === node.dataset.qid)) node.remove();
  }
  const shown = new Set([...box.querySelectorAll("[data-qid]")].map((n) => n.dataset.qid));
  for (const q of open) {
    if (shown.has(q.id)) continue;
    const form = el("form", { class: "question", "data-qid": q.id });
    form.append(el("h2", {}, "確認したいことがあります"), el("p", {}, q.text));
    for (const c of q.choices || []) {
      form.append(el("label", {}, el("input", { type: "radio", name: "choice", value: c }), c));
    }
    if (q.allow_free !== false) {
      form.append(el("textarea", { name: "text", "aria-label": "回答", placeholder: (q.choices || []).length ? "補足があれば書いてください" : "回答を書いてください" }));
    }
    const err = el("div", { class: "err small", role: "alert" });
    form.append(el("button", { class: "btn btn-primary", type: "submit" }, "回答を送る"), err);
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
  const box = $("scope");
  const sc = st.scope || {};
  const rows = [["依頼", sc.request], ["対象", sc.interpretation], ["文書の種類と文体", sc.settings], ["用語集", sc.glossary]]
    .filter(([, v]) => v);
  box.hidden = !rows.length;
  fill(box, rows.map(([k, v]) => [el("dt", {}, k), el("dd", {}, v)]));
}

function renderProgress(st) {
  const box = $("progress");
  const active = ["resolving", "generating", "applying", "failed"].includes(st.phase);
  box.hidden = !active && !!review;
  const rows = (st.files || []).map((f) =>
    el("tr", {}, el("td", {}, f.path), el("td", {}, String(f.blocks ?? "")),
      el("td", {}, f.status || ""), el("td", { class: "muted" }, f.detail || "")));
  const log = el("div", { class: "log" }, (st.log || []).slice(-30).map((l) => el("div", {}, `${l.time.slice(11)}  ${l.message}`)));
  fill(box,
    el("h2", {}, "進み具合"),
    rows.length ? el("table", { class: "status" },
      el("tr", {}, ["ファイル", "箇所", "状態", "詳細"].map((h) => el("th", {}, h))), rows) : null,
    log);
  log.scrollTop = log.scrollHeight;
}

function renderResult(st) {
  const box = $("result");
  if (st.phase !== "done" || !st.result) { box.hidden = true; return; }
  const r = st.result;
  box.hidden = false;
  fill(box,
    el("h2", {}, `${r.applied} 箇所を変更しました`),
    el("div", { class: "muted small" },
      `原文のままにした箇所 ${r.kept_original}` + (r.occurrences ? `、同じ文字列の書き換え ${r.occurrences}` : "")),
    (r.written || []).length ? el("ul", {}, r.written.map((w) => el("li", {}, `${w.path}（${w.edits} 箇所。元のファイル: ${w.backup}）`))) : null,
    (r.rejected || []).length ? el("div", { class: "err" }, "次の箇所は形式の検査に通らなかったため、変更していません。",
      el("ul", {}, r.rejected.map((x) => el("li", {}, `${x.path} ${x.block}: ${x.errors.join("; ")}`)))) : null,
    (r.skipped || []).length ? el("div", { class: "err" }, "次のファイルは変更していません。",
      el("ul", {}, r.skipped.map((x) => el("li", {}, `${x.path} ${x.block || ""}: ${x.reason}`)))) : null,
    el("p", { class: "muted small" }, "このページは閉じて構いません。"));
  $("submit").hidden = true;
  $("confirm").hidden = true;
  lockAll();
}

// ------------------------------------------------------------ レビュー

function isChanging(b) {
  const d = decisions[b.key];
  return !!d && d.mode === "change" && d.text !== b.original;
}

function renderReview() {
  const box = $("files");
  fill(box);
  if (!review.total) {
    box.append(el("div", { class: "panel" }, "直す候補はありませんでした。「反映する」を押すと、何も変えずに終了します。"));
  }
  for (const f of review.files) if (f.blocks.length) box.append(renderFile(f));
  $("submit").hidden = false;
  $("counts").hidden = false;
  renderToc();
  updateCounts();
  if (submitted) lockAll();
}

function renderToc() {
  const nav = $("toc");
  const files = review.files.filter((f) => f.blocks.length);
  nav.hidden = !files.length;
  fill(nav, el("div", { class: "toc-title" }, `${files.length} ファイル`), files.map((f) => {
    const [dir, base] = splitPath(f.path);
    return el("div", { class: "toc-file" + (excluded.has(f.id) ? " excluded" : "") },
      el("a", { href: "#file-" + f.id, title: f.path }, el("span", { class: "dir" }, dir), el("span", { class: "base" }, base)),
      el("ol", {}, f.blocks.map((b) => {
        const changing = isChanging(b);
        const label = changing ? "変更する" : "原文のまま変更しない";
        return el("li", {}, el("a", { href: "#hunk-" + b.key.replace(":", "-"), title: label },
          el("span", { class: "mark" + (changing ? " change" : ""), "aria-label": label }),
          el("span", { class: "ln" }, `L${b.line_start}`),
          el("span", { class: "snip" }, b.original.replace(/\s+/g, " ").slice(0, 40))));
      })));
  }));
}

function renderFile(f) {
  const wrap = el("article", { class: "file" + (excluded.has(f.id) ? " excluded" : ""), id: "file-" + f.id });
  const cb = el("input", { type: "checkbox", checked: excluded.has(f.id) });
  cb.addEventListener("change", () => {
    if (cb.checked) excluded.add(f.id); else excluded.delete(f.id);
    wrap.classList.toggle("excluded", cb.checked);
    saveLocal();
    renderToc();
    updateCounts();
  });
  const [dir, base] = splitPath(f.path);
  wrap.append(el("div", { class: "file-head" },
    el("span", { class: "path" }, el("span", { class: "dir" }, dir), el("span", { class: "base" }, base)),
    el("span", { class: "count" }, `${f.blocks.length} 箇所`),
    el("span", { class: "spacer" }),
    el("label", {}, cb, "このファイルは変更しない")));
  if ((f.warnings || []).length) {
    wrap.append(el("div", { class: "warnings" }, el("ul", {}, f.warnings.map((w) => el("li", {}, w)))));
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
  const lineNode = (i, cls) => row(cls || "", i, "", lines[i - 1].replace(/\r$/, ""));

  const body = el("div", { class: "file-body code" });
  let i = 1;
  while (i <= lines.length) {
    const g = groupAt[i];
    if (g) {
      for (let k = g.start; k <= g.end; k++) body.append(lineNode(k, "target"));
      for (const b of g.blocks) body.append(renderBlock(b));
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

function optionName(o) {
  return o.sources.map((s) => SOURCE_NAMES[s] || s).join("／");
}

function renderNotes(o) {
  return el("div", { class: "notes" },
    o.deletion ? el("div", { class: "cut" }, "この提案は文や行を削ります。") : null,
    o.reason ? el("div", {}, el("span", { class: "k" }, "理由"), o.reason) : null,
    (o.conflicts || []).length ? el("div", {}, el("span", { class: "k" }, "案どうしで食い違った点"), el("ul", {}, o.conflicts.map((c) => el("li", {}, c)))) : null,
    (o.questions || []).length ? el("div", { class: "query" }, el("span", { class: "k" }, "書き手に確かめたい点"), el("ul", {}, o.questions.map((c) => el("li", {}, c)))) : null,
    (o.warnings || []).length ? el("div", { class: "warn" }, el("ul", {}, o.warnings.map((c) => el("li", {}, c)))) : null);
}

function renderBlock(b) {
  const box = el("section", { class: "block", id: "hunk-" + b.key.replace(":", "-"), "data-key": b.key });
  const name = `mode-${b.key}`;

  const draw = (focusEditor) => {
    const d = decisions[b.key];
    const changing = !!d && d.mode === "change";
    box.classList.toggle("changing", changing);

    const choice = (mode, label) => el("label", { class: "choice" + ((mode === "change") === changing ? " on" : "") },
      el("input", {
        type: "radio", name, value: mode, checked: (mode === "change") === changing,
        onchange: () => {
          if (mode === "change") decisions[b.key] = { ...(d || { text: b.original, source: "original" }), mode: "change" };
          else if (d) d.mode = "original";
          commit(mode === "change");
        },
      }), label);

    // 各提案を縦に並べる
    const options = el("div", { class: "options" }, b.options.map((o) => {
      const st = charStat(b.original, o.text);
      const current = changing && d.text === o.text;
      return el("div", { class: "option" + (current ? " current" : ""), "data-opt": o.key },
        el("div", { class: "option-head" },
          el("span", { class: "option-name", title: o.sources.map((s) => SOURCE_TITLES[s] || s).join("、") + (o.sources.length > 1 ? "（同じ内容の提案）" : "") }, optionName(o)),
          el("span", { class: "stat", "aria-label": `${st.del} 文字削除、${st.ins} 文字追加` },
            el("span", { class: "m" }, `−${st.del}`), " ", el("span", { class: "p" }, `+${st.ins}`)),
          current ? el("span", { class: "current-mark" }, "編集欄と同じ内容") : null,
          el("span", { class: "spacer" }),
          el("button", {
            class: "btn btn-small", type: "button",
            onclick: () => { decisions[b.key] = { mode: "change", text: o.text, source: o.key, occ: d?.occ ?? false }; commit(true); },
          }, "この提案をベースに変更する")),
        renderDiffRows(b, o.text),
        renderNotes(o));
    }));

    let editor = null;
    if (changing) {
      const ta = el("textarea", { "aria-label": "変更後の内容", spellcheck: "false" });
      ta.value = d.text;
      let preview = renderDiffRows(b, d.text);
      ta.addEventListener("input", () => {
        d.text = ta.value;
        const same = b.options.find((o) => o.text === ta.value);
        d.source = same ? same.key : "edited";
        for (const n of box.querySelectorAll(".option")) {
          const on = !!same && n.dataset.opt === same.key;
          n.classList.toggle("current", on);
          n.querySelector(".current-mark")?.remove();
          if (on) n.querySelector(".stat").after(el("span", { class: "current-mark" }, "編集欄と同じ内容"));
        }
        const next = renderDiffRows(b, ta.value);
        preview.replaceWith(next);
        preview = next;
        saveLocal();
        renderToc();
        updateCounts();
      });
      queueMicrotask(() => {
        ta.style.height = Math.max(64, ta.scrollHeight + 4) + "px";
        if (focusEditor) { ta.focus(); ta.scrollIntoView({ block: "nearest" }); }
      });
      let occ = null;
      if ((b.occurrences || []).length) {
        const cb = el("input", { type: "checkbox", checked: !!d.occ });
        cb.addEventListener("change", () => { d.occ = cb.checked; saveLocal(); });
        occ = el("div", { class: "occ" },
          `同じ文字列が、ほかに ${b.occurrences.length} 箇所あります。テストの期待値などに使われていると、この箇所だけ変えるとテストが失敗します。`,
          el("ul", {}, b.occurrences.map((o) => el("li", {}, `${o.path}:${o.line}  ${o.context}`))),
          el("label", {}, cb, "変更後の内容で、これらも書き換える"));
      }
      editor = el("div", { class: "editor" },
        el("div", { class: "editor-title" }, "変更後の内容"),
        el("span", { class: "k" }, EDIT_HINT[b.kind] || ""),
        ta,
        el("span", { class: "k" }, "ファイルに反映される差分"),
        preview,
        occ);
    }

    fill(box,
      el("div", { class: "block-head" },
        el("span", { class: "kind" }, KIND_LABEL[b.kind] || b.kind),
        el("span", {}, b.line_start === b.line_end ? `${b.line_start} 行目` : `${b.line_start}〜${b.line_end} 行目`),
        el("span", { class: "spacer" }),
        el("div", { class: "mode", role: "radiogroup", "aria-label": "この箇所の扱い" },
          choice("original", "原文のまま変更しない"),
          choice("change", "変更する"))),
      el("div", { class: "options-title" }, `提案 ${b.options.length} 件`),
      options,
      editor);
    if (submitted) lockAll();
  };
  const commit = (focusEditor) => { saveLocal(); draw(focusEditor); renderToc(); updateCounts(); };
  draw(false);
  return box;
}

// ------------------------------------------------------------ 反映

function tally() {
  let change = 0, total = 0;
  for (const f of review?.files || []) {
    if (excluded.has(f.id)) continue;
    for (const b of f.blocks) {
      total++;
      if (isChanging(b)) change++;
    }
  }
  return { change, total };
}

function updateCounts() {
  const t = tally();
  $("counts").textContent = `${t.total} 箇所中 ${t.change} 箇所を変更`;
}

function lockAll() {
  for (const n of document.querySelectorAll("#files button, #files input, #files textarea")) {
    if (!n.classList.contains("fold")) n.disabled = true;
  }
  $("submit").disabled = true;
}

$("submit").addEventListener("click", () => {
  const t = tally();
  $("confirm-text").textContent = `${t.change} 箇所を変更し、残りの ${t.total - t.change} 箇所は原文のままにします。`;
  $("confirm").hidden = false;
  $("submit").hidden = true;
  $("confirm-yes").focus();
});
$("confirm-no").addEventListener("click", () => {
  $("confirm").hidden = true;
  $("submit").hidden = false;
  $("submit").focus();
});
$("confirm-yes").addEventListener("click", async () => {
  const blocks = {};
  for (const f of review.files) {
    if (excluded.has(f.id)) continue;
    for (const b of f.blocks) {
      const d = decisions[b.key];
      if (isChanging(b)) blocks[b.key] = { text: d.text, source: d.source, apply_occurrences: !!d.occ };
    }
  }
  $("confirm-yes").disabled = true;
  const r = await api("/api/submit", { blocks, excluded_files: [...excluded] });
  $("confirm").hidden = true;
  $("confirm-yes").disabled = false;
  if (r.status === 200 || r.status === 409) {
    submitted = true;
    lockAll();
    $("submit").hidden = false;
    $("submit").textContent = "反映を待っています";
  } else {
    $("submit").hidden = false;
    setMessage("送れませんでした（" + r.status + "）。もう一度「反映する」を押してください", true);
  }
});

poll();
