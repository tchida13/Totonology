(function () {
  const app = document.getElementById("app");
  const Q = window.QUESTIONS, AXES = window.AXES, TYPES = window.TYPES, SPOTS = window.SPOTS, GROUPS = window.GROUPS;
  // シェアにはトップURLを使う（結果URLのハッシュには回答が含まれるため、投稿文には載せない）
  const SITE_URL = "https://tchida13.github.io/Totonology/";
  // lucide のSVGスプライト(assets/icons.svg)から表示する。色は currentColor に追従
  const icon = (name) => `<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"/></svg>`;
  const AXIS_ICON = { heat: "thermometer", cool: "waves", mate: "users", style: "compass" };
  const STEAM = '<div class="steam" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>';
  const groupOf = (code) => GROUPS[code[0] + code[2]];
  const avatar = (code, alt, size) => `<img class="avatar" src="assets/characters/${code}.svg" alt="${esc(alt)}" width="${size}" height="${size}">`;
  const CHOICES = ["とてもそう思う", "ややそう思う", "どちらでもない", "あまり思わない", "全くそう思わない"];
  const ORDER = window.Score.order(Q, AXES); // 出題順 (質問インデックスの並び)
  let answers = []; // 各設問の回答 (+2..-2)。質問の定義順で保持

  // 回答途中の保存・復元（sessionStorage が使えない環境でもそのまま動く）
  const KEY = "totonology:progress";
  const store = {
    save: (pos) => { try { sessionStorage.setItem(KEY, JSON.stringify({ a: Array.from(Q, (_, i) => answers[i] ?? null), p: pos })); } catch (e) {} },
    clear: () => { try { sessionStorage.removeItem(KEY); } catch (e) {} },
    load: () => {
      try {
        const d = JSON.parse(sessionStorage.getItem(KEY));
        const ok = d && Array.isArray(d.a) && d.a.length === Q.length && Number.isInteger(d.p) && d.p > 0 && d.p < Q.length
          && d.a.every((v, i) => ORDER.indexOf(i) >= d.p || [-2, -1, 0, 1, 2].includes(v));
        return ok ? d : null;
      } catch (e) { return null; }
    },
  };

  // 描画後、[data-focus] の要素（質問文・見出し）へフォーカスを移して画面遷移を支援技術に伝える
  const el = (html) => {
    app.innerHTML = html;
    window.scrollTo(0, 0);
    const f = app.querySelector("[data-focus]");
    if (f) { f.setAttribute("tabindex", "-1"); f.focus({ preventScroll: true }); }
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 16タイプ一覧（グループごと）
  function typesList() {
    const byGroup = {};
    Object.keys(TYPES).forEach((code) => (byGroup[code[0] + code[2]] = byGroup[code[0] + code[2]] || []).push(code));
    return Object.keys(GROUPS).map((gk) => `<div class="tgroup" style="--group:${GROUPS[gk].color}">
      <h3>${esc(GROUPS[gk].name)} <span>${esc(GROUPS[gk].desc)}</span></h3>
      <ul class="tgrid">${byGroup[gk].map((code) => `<li class="tcard">${avatar(code, "", 96)}${esc(TYPES[code].name)}</li>`).join("")}</ul>
    </div>`).join("");
  }

  function start() {
    answers = [];
    store.clear();
    history.replaceState(null, "", location.pathname);
    const mins = Math.max(1, Math.round(Q.length / 8));
    el(`<section class="hero">
      ${STEAM}
      <span class="eyebrow">サウナ16タイプ診断</span>
      <h1 data-focus>あなたの<span class="nb">「ととのい方」</span>は、<br>どのタイプ？</h1>
      <p class="lead">${Q.length}問・約${mins}分。サウナの楽しみ方から、あなたにぴったりのサウナ性格タイプと、行ってみたい実在のサウナを見つけます。</p>
      <button class="btn lg" id="go">診断をはじめる${icon("arrow-right")}</button>
    </section>
    <section class="intro">
      <ul class="steps">
        <li>${icon("check")}${Q.length}問に直感で回答</li>
        <li>${icon("sparkles")}16タイプから診断</li>
        <li>${icon("map-pin")}おすすめのサウナを紹介</li>
      </ul>
    </section>
    <section class="types">
      <h2>16のサウナタイプ</h2>
      <p class="sub">熱の好みと過ごし方で、4つのグループに分かれます。</p>
      ${typesList()}
    </section>`);
    document.getElementById("go").onclick = () => question(0);
  }

  // i は出題順の位置。回答は質問インデックス(ORDER[i])に記録する
  function question(i) {
    const qi = ORDER[i], q = Q[qi];
    el(`<section class="quiz">
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.length}" aria-valuenow="${i}"><div style="width:${(i / Q.length) * 100}%"></div></div>
      <p class="count">Q${i + 1} / ${Q.length}</p>
      <p class="q" data-focus>${esc(q.text)}</p>
      <div class="scale" role="group" aria-label="回答">
        ${[2, 1, 0, -1, -2].map((v, k) => `<button class="opt${answers[qi] === v ? " on" : ""}" data-v="${v}" aria-pressed="${answers[qi] === v}" aria-label="${CHOICES[k]}" title="${CHOICES[k]}"></button>`).join("")}
      </div>
      <div class="labels"><span class="agree">そう思う</span><span class="disagree">そう思わない</span></div>
      <p class="keyhint">キーボードの 1〜5 でも回答できます</p>
      <div class="actions">${i > 0 ? `<button class="btn ghost" id="back">${icon("arrow-left")}戻る</button>` : ""}</div>
    </section>`);
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      answers[qi] = Number(b.dataset.v);
      store.save(i + 1);
      i + 1 < Q.length ? question(i + 1) : finish();
    }));
    const back = document.getElementById("back");
    if (back) back.onclick = () => question(i - 1);
  }

  const scores = () => window.Score.scores(answers, Q, AXES);
  const codeOf = window.Score.codeOf;

  function finish() {
    const code = codeOf(scores());
    store.clear();
    history.replaceState(null, "", "#" + code + "-" + answers.map((v) => v + 2).join(""));
    result(code, scores());
  }

  function result(code, sc) {
    const t = TYPES[code];
    const m = TYPES[t.match];
    const grp = groupOf(code);
    // 左=first側・右=second側。勝った側のラベルを強調する
    const bars = sc.map((s) => {
      const a = s.ax;
      return `<div class="bar"><div class="title">${icon(AXIS_ICON[a.id])}${esc(a.title)}</div><div class="row"><span class="${s.side === "first" ? "win" : ""}">${esc(a.first.label)} ${s.pct}%</span><span class="${s.side === "second" ? "win" : ""}">${100 - s.pct}% ${esc(a.second.label)}</span></div>
        <div class="track" role="img" aria-label="${esc(a.title)}: ${esc(a.first.label)} ${s.pct}%、${esc(a.second.label)} ${100 - s.pct}%"><div class="fill" style="width:${s.pct}%"></div></div></div>`;
    }).join("");
    const spots = t.spots.map((id) => {
      const sp = SPOTS[id];
      return `<li class="spot"><strong>${esc(sp.name)}</strong> <span class="sub">${esc(sp.area)}</span><br><span class="vibe">${esc(sp.vibe)}</span><span class="note">${esc(sp.note)}</span></li>`;
    }).join("");
    const text = `私のサウナタイプは【${t.name}】(${code})でした！ #Totonology`;
    const shareUrl = "https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(SITE_URL);
    el(`<article class="result" style="--group:${grp.color}">
      <header class="r-hero" style="--photo:url(${grp.photo})">
        ${STEAM}
        ${avatar(code, t.name + "のキャラクター", 240)}
        <p class="code">${code}</p>
        <h1 data-focus>${esc(t.name)}</h1>
        <p class="en">${esc(t.en)}</p>
        <p class="tagline">${esc(t.tagline)}</p>
        <span class="group">${esc(grp.name)}タイプ ― ${esc(grp.desc)}</span>
      </header>
      <section class="panel"><p>${esc(t.desc)}</p></section>
      <section class="panel"><h2>${icon("thermometer")}あなたの傾向</h2>${bars}</section>
      <div class="grid2">
        <section class="panel"><h2>${icon("sparkles")}強み</h2><ul class="list">${t.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section class="panel"><h2>${icon("triangle-alert")}気をつけたいこと</h2><ul class="list">${t.cautions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
      </div>
      <section class="panel"><h2>${icon("map-pin")}おすすめのサウナ</h2><p>${esc(t.sauna)}</p><ul class="spots" style="margin-top:14px">${spots}</ul>
        <p class="note-small">※ 営業状況・料金・利用条件は変わることがあります。訪問前に公式情報をご確認ください。</p></section>
      <section class="panel"><h2>${icon("heart-handshake")}相性のいいタイプ</h2>
        <p class="match">${avatar(t.match, m.name + "のキャラクター", 72)}<span><strong>${esc(m.name)}</strong> <span class="sub">(${t.match})</span><br><span class="sub">${esc(m.tagline)}</span></span></p></section>
      <div class="actions">
        <a class="btn" target="_blank" rel="noopener" href="${shareUrl}">${icon("share-2")}結果をシェア</a>
        <button class="btn ghost" id="copy">${icon("link")}結果リンクをコピー</button>
        <button class="btn ghost" id="again">${icon("rotate-ccw")}もう一度診断する</button>
      </div>
      <p class="disclaimer">※ 娯楽目的の診断です。サウナは体調に合わせて無理せず、水分補給をしてお楽しみください。</p>
    </article>`);
    document.getElementById("again").onclick = start;
    const copy = document.getElementById("copy");
    copy.onclick = () => {
      const orig = copy.innerHTML;
      const done = (msg) => { copy.innerHTML = icon("check") + msg; setTimeout(() => (copy.innerHTML = orig), 2000); };
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject())
        .then(() => done("コピーしました"), () => done("コピーできませんでした"));
    };
  }

  // キー 1〜5 で回答（1=とてもそう思う … 5=全くそう思わない）
  document.addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !/^[1-5]$/.test(e.key)) return;
    const opt = app.querySelectorAll(".opt")[Number(e.key) - 1];
    if (opt) opt.click();
  });

  // 結果URL (#CODE-回答列) からの復元。有効なら結果を表示して true を返す
  function showResultFromHash() {
    const m = location.hash.match(/^#([HS][WA][OT][RF])-([0-4]+)$/);
    if (!(m && TYPES[m[1]] && m[2].length === Q.length)) return false;
    answers = m[2].split("").map((c) => Number(c) - 2);
    result(codeOf(scores()), scores());
    return true;
  }

  // 手動のハッシュ変更や履歴操作に追従する（アプリ自身の replaceState では発火しない）
  window.addEventListener("hashchange", () => { if (!showResultFromHash()) start(); });

  if (!showResultFromHash()) {
    const saved = store.load();
    if (saved) { answers = saved.a; question(saved.p); } else start();
  }
})();
