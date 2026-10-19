(function () {
  const app = document.getElementById("app");
  const Q = window.QUESTIONS, AXES = window.AXES, TYPES = window.TYPES, SPOTS = window.SPOTS, GROUPS = window.GROUPS;
  // シェアにはトップURLを使う（結果URLのハッシュには回答が含まれるため、投稿文には載せない）
  const SITE_URL = "https://tchida13.github.io/Totonology/";
  // lucide のSVGスプライト(assets/icons.svg)から表示する。色は currentColor に追従
  const icon = (name) => `<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"/></svg>`;
  const groupOf = (code) => GROUPS[code[0] + code[2]];
  const avatar = (code, alt, size, lazy) => `<img class="avatar" src="assets/characters/${code}.svg" alt="${esc(alt)}" width="${size}" height="${size}"${lazy ? ' loading="lazy" decoding="async"' : ""}>`;
  // 砂時計。--p(0〜1)で上の砂が下へ落ちる。ガラスと砂は clipPath で切り抜く
  const HOURGLASS = (p) => `<svg class="hg" viewBox="0 0 48 72" aria-hidden="true" focusable="false" style="--p:${p}">
    <defs><clipPath id="hg-top"><path d="M10 6H38C38 22 27 29 25 36H23C21 29 10 22 10 6Z"/></clipPath><clipPath id="hg-bot"><path d="M23 36H25C27 43 38 50 38 66H10C10 50 21 43 23 36Z"/></clipPath></defs>
    <g clip-path="url(#hg-top)"><rect class="sand-top" x="0" y="6" width="48" height="30"/></g>
    <g clip-path="url(#hg-bot)"><rect class="sand-bot" x="0" y="36" width="48" height="30"/></g>
    <line class="stream" x1="24" y1="34" x2="24" y2="64"/>
    <path class="glass" d="M6 4H42M6 68H42M10 6C10 22 21 29 23 36C21 43 10 50 10 66M38 6C38 22 27 29 25 36C27 43 38 50 38 66"/>
  </svg>`;
  // サウナハット(ウールフェルトの帽子)。色は button 側の --hat(currentColor)。折り返しのつばだけ少し暗くする。n は表示する番号(キー操作と同じ)
  const HAT = (n) => `<svg class="hat" viewBox="0 0 64 56" aria-hidden="true" focusable="false"><path class="dome" d="M9 38C9 15 21 6 32 6C43 6 55 15 55 38Z"/><path class="shade" d="M9 38C9 15 21 6 32 6C43 6 55 15 55 38Z"/><path class="fold" d="M5 37H59V46C59 48.500 57.500 50 55 50H9C6.500 50 5 48.500 5 46Z"/><path class="seam" d="M12 43.500H52"/><text class="num" x="32" y="31" text-anchor="middle">${n}</text></svg>`;
  // 左から右へ「そう思わない → そう思う」。データの値は +2..-2 のまま(保存・結果URLの互換性を保つ)
  const CHOICES = ["全くそう思わない", "あまり思わない", "どちらでもない", "ややそう思う", "とてもそう思う"];
  const ORDER = window.Score.order(Q, AXES); // 出題順 (質問インデックスの並び)
  let answers = []; // 各設問の回答 (+2..-2)。質問の定義順で保持
  // 場面(start/quiz/ritual/result)を body に伝え、背景や配色を切り替える。--heat は室温(0〜1)
  const scene = (name) => {
    if (document.body) document.body.dataset.scene = name;
    const meta = document.querySelector && document.querySelector('meta[name="theme-color"]'); // モバイルのブラウザバーも場面の色に合わせる
    if (meta) meta.setAttribute("content", { quiz: "#1B1614", ritual: "#1B1614" }[name] || "#F3F1EC");
  };
  const heat = (v) => { if (document.body) document.body.style.setProperty("--heat", v); };
  const calm = () => typeof matchMedia !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches; // 動きを減らす設定(や matchMedia のない環境)
  let loyly = false, fxTimer = 0; // ロウリュは質問の半分で一度だけ入る
  const setLoyly = (on) => { loyly = on; if (document.body) on ? (document.body.dataset.loyly = "1") : delete document.body.dataset.loyly; };
  const clearFx = () => { clearTimeout(fxTimer); document.getElementById("announce").textContent = ""; const fx = document.getElementById("fx"); if (fx) { fx.className = "fx"; fx.innerHTML = ""; } };
  // 質問の半分に到達した瞬間のオートロウリュ演出。入力はブロックしない(オーバーレイは操作を通す)
  function rouryu() {
    const fx = document.getElementById("fx");
    // ストーブ上のアームのノズルから霧がふわっと広がって石へ → 石から蒸気。画面下部のストーブ周辺だけで完結し、質問文に被らない。メッセージは出さない(読み上げ用の通知だけ)
    fx.innerHTML = `<div class="auto"><i class="puff m1"></i><i class="puff m2"></i><i class="puff m3"></i><i class="puff m4"></i><i class="puff m5"></i><i class="puff m6"></i>
      <i class="steam-burst b1"></i><i class="steam-burst b2"></i><i class="steam-burst b3"></i></div>`;
    fx.className = "fx on";
    document.getElementById("announce").textContent = "ロウリュ。熱気がぐっと増しました。"; // 常設の live region で読み上げる
    fxTimer = setTimeout(clearFx, 3800);
  }
  let shownP = 0; // 砂時計が直前に表示していた進捗(0〜1)。次の描画で砂が落ちるアニメーションに使う
  let view = ""; // 表示中の画面: start / quiz / result

  // 回答途中の保存・復元（sessionStorage が使えない環境でもそのまま動く）
  const KEY = "totonology:progress";
  const store = {
    save: (pos) => { try { sessionStorage.setItem(KEY, JSON.stringify({ a: Array.from(Q, (_, i) => answers[i] ?? null), p: pos })); } catch (e) {} },
    clear: () => { try { sessionStorage.removeItem(KEY); } catch (e) {} },
    load: () => {
      try {
        const d = JSON.parse(sessionStorage.getItem(KEY));
        const ok = d && Array.isArray(d.a) && d.a.length === Q.length && Number.isInteger(d.p) && d.p >= 0 && d.p < Q.length
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
      <ul class="tgrid">${byGroup[gk].map((code) => `<li class="tcard">${avatar(code, "", 96, true)}${esc(TYPES[code].name)}</li>`).join("")}</ul>
    </div>`).join("");
  }

  function start() {
    freeShareUrl();
    clearTimeout(ritualTimer);
    clearTimeout(ritualArm);
    ritualSkip = null;
    answers = [];
    shownP = 0;
    clearFx();
    setLoyly(false);
    scene("start");
    heat(0);
    store.clear();
    view = "start";
    history.replaceState(null, "", location.pathname + location.search);
    const mins = Math.max(1, Math.round(Q.length / 8));
    el(`<section class="hero">
      <span class="eyebrow">サウナ16タイプ診断</span>
      <h1 data-focus>あなたの<span class="nb">「ととのい方」</span>は、<br>どのタイプ？</h1>
      <p class="lead">${Q.length}問・約${mins}分。サウナの楽しみ方から、あなたにぴったりのサウナ性格タイプと、行ってみたい実在のサウナを見つけます。</p>
      <button class="btn lg" id="go">診断をはじめる${icon("arrow-right")}</button>
    </section>
    <section class="intro">
      <ul class="steps">
        <li><b>01</b>${Q.length}問に直感で回答</li>
        <li><b>02</b>16タイプから診断</li>
        <li><b>03</b>おすすめのサウナを紹介</li>
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
  // fresh: 直前の質問に回答して来たとき(復元・戻る操作ではロウリュを再生しない)
  function question(i, fresh) {
    view = "quiz";
    scene("quiz");
    const half = Math.floor(Q.length / 2);
    if (!loyly && i >= half) {
      setLoyly(true);
      if (fresh && i === half && !calm()) rouryu();
    }
    heat(i / Q.length);
    const qi = ORDER[i], q = Q[qi];
    el(`<section class="quiz">
      <div class="quizhead">
        <div class="progress" role="progressbar" aria-label="進捗" aria-valuemin="0" aria-valuemax="${Q.length}" aria-valuenow="${i}">${HOURGLASS(shownP)}</div>
        <p class="count"><span class="sr-only">Q${i + 1} / ${Q.length}</span><b class="no" aria-hidden="true">${String(i + 1).padStart(2, "0")}</b><span class="of" aria-hidden="true">/ ${Q.length}</span></p>
        <p class="temp" aria-hidden="true">${80 + Math.round((i / Q.length) * 14) + (i >= half ? 6 : 0)}°C</p>
      </div>
      <p class="q" data-focus>${esc(q.text)}</p>
      <div class="scale" role="group" aria-label="回答">
        ${[-2, -1, 0, 1, 2].map((v, k) => `<button class="opt${answers[qi] === v ? " on" : ""}" data-v="${v}" aria-pressed="${answers[qi] === v}" aria-label="${CHOICES[k]}" title="${CHOICES[k]}">${HAT(k + 1)}</button>`).join("")}
      </div>
      <div class="labels"><span class="disagree">そう思わない</span><span class="agree">そう思う</span></div>
      <p class="keyhint">キーボードの 1〜5 でも回答できます</p>
      <div class="actions">${i > 0 ? `<button class="btn ghost" id="back">${icon("arrow-left")}戻る</button>` : ""}</div>
    </section>`);
    // 描画直後に進捗を更新して、砂が落ちる動きを見せる（演出なので、使えない環境では即時反映）
    const hg = app.querySelector(".hg"), to = i / Q.length;
    if (hg && hg.style) {
      const set = () => hg.style.setProperty("--p", to);
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(set));
      else set();
    }
    shownP = to;
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      answers[qi] = Number(b.dataset.v);
      store.save(i + 1);
      i + 1 < Q.length ? question(i + 1, true) : finish();
    }));
    const back = document.getElementById("back");
    if (back) back.onclick = () => { store.save(i - 1); question(i - 1); };
  }

  const scores = () => window.Score.scores(answers, Q, AXES);
  const codeOf = window.Score.codeOf;

  function finish() {
    const sc = scores(), code = codeOf(sc);
    store.clear();
    // 結果URLと保存の消去は先に済ませる（演出中にリロードしても結果が出る）
    history.replaceState(null, "", "#" + code + "-" + answers.map((v) => v + 2).join(""));
    // 動きを減らす設定(や matchMedia のない環境)では演出なしで結果を出す
    calm() ? result(code, sc) : ritual(code, sc);
  }

  // 結果の前の「ため」: 水風呂→休憩→外気浴→整いと、暗い所から明るい所へ、背景の色がゆっくり変わるだけ。スキップ(右下のボタン/Esc)で即結果へ
  const RITUAL_STEP_MS = 1200;
  let ritualTimer = 0, ritualArm = 0, ritualSkip = null;
  const RITUAL_ARM_MS = 1500; // 演出の開始直後は、連打でスキップしてしまわないよう操作を受け付けない
  function ritual(code, sc) {
    view = "ritual";
    clearFx();
    scene("ritual");
    const R = window.RITUAL;
    let n = 0;
    // スキップは小さなボタン(と Esc)だけ。画面タップや Enter では飛ばさない。開始直後は受け付けない。二重に呼ばれても一度だけ結果を出す
    let armed = false;
    const finish = () => { if (ritualSkip !== skip) return; result(code, sc); };
    const skip = () => { if (armed) finish(); };
    ritualSkip = skip;
    ritualArm = setTimeout(() => { armed = true; }, RITUAL_ARM_MS);
    // 見た目は背景のグラデーションがゆっくり呼吸するように変わるだけ。「回答を分析しています」と段ごとの一言を、うっすら小さく添える
    el(`<section class="ritual s0" id="ritual">
      <div class="r-scene" aria-hidden="true"><i class="orb"></i></div>
      <div class="r-status" role="status" data-focus><p class="r-title">${esc(window.RITUAL_TITLE)}</p><h2 id="r-name" class="sr-only">${esc(R[0].name)}</h2><p class="r-line" id="r-line">${esc(R[0].line)}</p></div>
      <button class="skip" id="skip">スキップ</button>
    </section>`);
    document.getElementById("skip").onclick = skip;
    const step = () => {
      if (++n >= R.length) return finish();
      document.getElementById("ritual").className = "ritual s" + n;
      document.getElementById("r-name").textContent = R[n].name;
      document.getElementById("r-line").textContent = R[n].line;
      ritualTimer = setTimeout(step, R[n].ms || RITUAL_STEP_MS);
    };
    ritualTimer = setTimeout(step, R[0].ms || RITUAL_STEP_MS);
  }

  // 結果のシェア用画像を canvas で生成してプレビューし、保存・共有できるようにする（失敗したらセクションごと隠す）
  let shareUrls = []; // 生成した画像の object URL(横長・縦長)。画面を離れるときに解放する
  let shareSeq = 0; // 生成の世代。結果が切り替わったら古い生成結果を捨てる
  const freeShareUrl = () => { shareUrls.forEach((u) => URL.revokeObjectURL(u)); shareUrls = []; };
  function shareImage(code, t, grp, sc, text) {
    const seq = ++shareSeq;
    const spec = {
      code, name: t.name, en: t.en, tagline: t.tagline, groupName: grp.name, color: grp.color,
      letters: sc.map((x) => x.ax[x.side]), siteLabel: SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      avatarSrc: `assets/characters/${code}.svg`, photoSrc: grp.photo,
    };
    // 横長(1200x630)と縦長(1080x1350)を両方作り、切り替えて保存・共有できるようにする
    Promise.allSettled([window.ShareImage.render(spec, "landscape"), window.ShareImage.render(spec, "portrait")]).then(([landR, portR]) => {
      if (landR.status !== "fulfilled") throw landR.reason; // 横長が作れなければ全体を隠す(縦長だけ失敗した場合は横長のみで続行)
      const land = landR.value, port = portR.status === "fulfilled" ? portR.value : null;
      if (seq !== shareSeq || view !== "result" || !document.getElementById("share")) return; // 生成中に画面や結果が変わった
      freeShareUrl();
      const items = { landscape: { blob: land, name: `totonology-${code}.png`, w: 1200, h: 630 } };
      if (port) items.portrait = { blob: port, name: `totonology-${code}-portrait.png`, w: 1080, h: 1350 };
      Object.values(items).forEach((it) => { it.url = URL.createObjectURL(it.blob); shareUrls.push(it.url); });
      let cur = "landscape";
      const img = document.getElementById("share-img");
      const show = (k) => {
        cur = k;
        img.src = items[k].url; img.width = items[k].w; img.height = items[k].h;
        img.dataset.layout = k;
        document.getElementById("size-l").setAttribute("aria-pressed", String(k === "landscape"));
        document.getElementById("size-p").setAttribute("aria-pressed", String(k === "portrait"));
      };
      document.getElementById("size-l").onclick = () => show("landscape");
      document.getElementById("size-p").onclick = () => show("portrait");
      show("landscape");
      document.getElementById("share-size").hidden = !port; // 縦長が無ければ切り替えは出さない
      const save = document.getElementById("save-img");
      save.hidden = false;
      save.onclick = () => {
        const a = document.createElement("a");
        a.href = items[cur].url; a.download = items[cur].name;
        a.click();
      };
      const toFile = (it) => new File([it.blob], it.name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [toFile(items.landscape)] })) {
        const b = document.getElementById("share-files");
        b.hidden = false;
        b.onclick = () => navigator.share({ files: [toFile(items[cur])], text: `${text} ${SITE_URL}` }).catch(() => {}); // キャンセルは無視
      }
    }).catch(() => { const sec = document.getElementById("share"); if (sec && seq === shareSeq) sec.hidden = true; }); // 失敗したらセクションごと隠す
  }

  function result(code, sc) {
    freeShareUrl();
    clearTimeout(ritualTimer);
    clearTimeout(ritualArm);
    ritualSkip = null;
    view = "result";
    clearFx();
    scene("result");
    heat(0);
    const t = TYPES[code];
    const m = TYPES[t.match];
    const grp = groupOf(code);
    // 左=first側・右=second側。勝った側のラベルを強調する
    const bars = sc.map((s) => {
      const a = s.ax;
      return `<div class="bar"><div class="title">${esc(a.title)}</div><div class="row"><span class="${s.side === "first" ? "win" : ""}">${esc(a.first.label)} ${s.pct}%</span><span class="${s.side === "second" ? "win" : ""}">${100 - s.pct}% ${esc(a.second.label)}</span></div>
        <div class="track" role="img" aria-label="${esc(a.title)}: ${esc(a.first.label)} ${s.pct}%、${esc(a.second.label)} ${100 - s.pct}%"><div class="fill" style="width:${s.pct}%"></div></div></div>`;
    }).join("");
    const spots = t.spots.map((id) => {
      const sp = SPOTS[id];
      return `<li class="spot"><strong>${esc(sp.name)}</strong> <span class="sub">${esc(sp.area)}</span><br><span class="vibe">${esc(sp.vibe)}</span><span class="note">${esc(sp.note)}</span></li>`;
    }).join("");
    const text = `私のサウナタイプは【${t.name}】(${code})でした！ #Totonology`;
    const shareUrl = "https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(SITE_URL);
    // 整いタイム: Apple Watch のマインドフルネスのような花びら状の光を、全体の背景にうっすら置くだけ(主張しない)
    const petals = Array.from({ length: 8 }, (_, k) => `<i style="--r:${k * 45}deg"></i>`).join("");
    el(`<article class="result" style="--group:${grp.color}">
      <div class="bloom" aria-hidden="true">${petals}</div>
      <p class="tototime">整いタイム</p>
      <header class="pass" style="--photo:url(${grp.photo})">
        <div class="pass-band" aria-hidden="true"><span>SAUNA PASS</span><span>入館証</span></div>
        ${avatar(code, t.name + "のキャラクター", 200)}
        <ul class="code" aria-label="タイプコード ${code}">${sc.map((x, i) => `<li style="--i:${i}"><b>${x.ax[x.side].code}</b><small>${esc(x.ax[x.side].label)}</small></li>`).join("")}</ul>
        <h1 data-focus>${esc(t.name)}</h1>
        <p class="en">${esc(t.en)}</p>
        <p class="tagline">${esc(t.tagline)}</p>
        <p class="group">${esc(grp.desc)}</p>
        <span class="stamp">${esc(grp.name)}タイプ</span>
      </header>
      <p class="lead">${esc(t.desc)}</p>
      <section class="panel"><h2>あなたの傾向</h2>${bars}</section>
      <section class="panel pair" style="--you:${groupOf(t.match).color}"><h2>相性のいいタイプ</h2>
        <div class="pair-row">
          <figure class="pair-me">${avatar(code, t.name + "のキャラクター", 96)}<figcaption><small>あなた</small>${esc(t.name)}</figcaption></figure>
          <span class="pair-link" aria-hidden="true"><i></i><b>相性</b><i></i></span>
          <figure class="pair-you">${avatar(t.match, m.name + "のキャラクター", 128)}<figcaption><small>${t.match}</small><strong>${esc(m.name)}</strong></figcaption></figure>
        </div>
        <p class="pair-tag">${esc(m.tagline)}</p>
        <p class="pair-reason">${esc(t.matchReason)}</p></section>
      <div class="grid2">
        <section class="panel"><h2>強み</h2><ul class="list">${t.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section class="panel"><h2>気をつけたいこと</h2><ul class="list">${t.cautions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
      </div>
      <section class="panel"><h2>おすすめのサウナ</h2><p>${esc(t.sauna)}</p><ul class="spots" style="margin-top:14px">${spots}</ul>
        <p class="note-small">※ 営業状況・料金・利用条件は変わることがあります。訪問前に公式情報をご確認ください。</p></section>
      ${window.ShareImage ? `<section class="panel share" id="share"><h2>シェア用の画像</h2>
        <div class="seg" id="share-size" role="group" aria-label="画像のサイズ" hidden><button class="seg-btn" id="size-l" aria-pressed="true">横長</button><button class="seg-btn" id="size-p" aria-pressed="false">縦長</button></div>
        <img class="share-img" id="share-img" alt="${esc(t.name)}の結果のシェア用画像" width="1200" height="630">
        <div class="actions"><button class="btn ghost" id="save-img" hidden>画像を保存</button><button class="btn ghost" id="share-files" hidden>画像つきでシェア</button></div>
        <p class="note-small">保存した画像は、結果をシェアする投稿に添付できます。</p></section>` : ""}
      <div class="actions">
        <a class="btn" target="_blank" rel="noopener" href="${shareUrl}">${icon("share-2")}結果をシェア</a>
        <button class="btn ghost" id="copy">${icon("link")}結果リンクをコピー</button>
        <button class="btn ghost" id="again">${icon("rotate-ccw")}もう一度診断する</button>
      </div>
      <p class="disclaimer">※ 娯楽目的の診断です。サウナは体調に合わせて無理せず、水分補給をしてお楽しみください。</p>
    </article>`);
    document.getElementById("again").onclick = start;
    if (window.ShareImage) shareImage(code, t, grp, sc, text);
    const copy = document.getElementById("copy");
    const orig = copy.innerHTML; // 連打しても元の表示に戻せるよう、描画直後に保持する
    let timer;
    copy.onclick = () => {
      const done = (msg) => { copy.innerHTML = icon("check") + msg; clearTimeout(timer); timer = setTimeout(() => (copy.innerHTML = orig), 2000); };
      Promise.resolve().then(() => navigator.clipboard.writeText(location.href))
        .then(() => done("コピーしました"), () => done("コピーできませんでした"));
    };
  }

  // 回答中のロゴは確認してからトップへ戻る（誤クリックで途中経過を失わないように）
  document.addEventListener("click", (e) => {
    if (view !== "quiz" || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // 新規タブ等の操作は妨げない
    if (!(e.target.closest && e.target.closest(".brand"))) return;
    e.preventDefault();
    if (!answers.some((v) => v != null) || confirm("回答を破棄してトップに戻りますか？")) start();
  });

  // キー 1〜5 で回答（1=全くそう思わない … 5=とてもそう思う。画面の左から右の並びと同じ）
  document.addEventListener("keydown", (e) => {
    if (view === "ritual" && ritualSkip && !e.repeat && e.key === "Escape") return ritualSkip();
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
