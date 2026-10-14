(function () {
  const app = document.getElementById("app");
  const Q = window.QUESTIONS, AXES = window.AXES, TYPES = window.TYPES;
  const CHOICES = ["とてもそう思う", "ややそう思う", "どちらでもない", "あまり思わない", "全くそう思わない"];
  let answers = []; // 各設問の回答 (+2..-2)

  const el = (html) => { app.innerHTML = html; app.focus?.(); window.scrollTo(0, 0); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function start() {
    answers = [];
    history.replaceState(null, "", location.pathname);
    el(`<section class="card center">
      <div class="emoji">🧖</div>
      <h1>Totonology</h1>
      <p>サウナ16タイプ診断</p>
      <p class="sub">${Q.length}問・約2分。あなたのサウナの楽しみ方から、<br>16のサウナ性格タイプを診断します。</p>
      <div class="actions"><button class="btn" id="go">診断をはじめる</button></div>
    </section>`);
    document.getElementById("go").onclick = () => question(0);
  }

  function question(i) {
    const q = Q[i];
    el(`<section class="card">
      <div class="progress"><div style="width:${(i / Q.length) * 100}%"></div></div>
      <p class="sub">Q${i + 1} / ${Q.length}</p>
      <p class="q">${esc(q.text)}</p>
      <div class="scale" role="group" aria-label="回答">
        ${[2, 1, 0, -1, -2].map((v, k) => `<button class="opt" data-v="${v}" aria-label="${CHOICES[k]}" title="${CHOICES[k]}"></button>`).join("")}
      </div>
      <div class="labels"><span>そう思う</span><span>思わない</span></div>
      <div class="actions">${i > 0 ? '<button class="btn ghost" id="back">戻る</button>' : ""}</div>
    </section>`);
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      answers[i] = Number(b.dataset.v);
      i + 1 < Q.length ? question(i + 1) : finish();
    }));
    const back = document.getElementById("back");
    if (back) back.onclick = () => question(i - 1);
  }

  const scores = () => window.Score.scores(answers, Q, AXES);
  const codeOf = window.Score.codeOf;

  function finish() {
    const code = codeOf(scores());
    history.replaceState(null, "", "#" + code + "-" + answers.map((v) => v + 2).join(""));
    result(code, scores());
  }

  function result(code, sc) {
    const t = TYPES[code];
    const m = TYPES[t.match];
    const bars = sc.map((s) => {
      const pct = s.side === "first" ? s.pct : 100 - s.pct;
      const main = s.ax[s.side];
      return `<div class="bar"><div class="row"><span>${esc(s.ax.title)}</span><span>${esc(main.label)} ${pct}%</span></div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>`;
    }).join("");
    const text = `私のサウナタイプは【${t.name}】(${code})でした！ #Totonology`;
    el(`<section class="card">
      <div class="center">
        <div class="emoji">${t.emoji}</div>
        <div class="code">${code}</div>
        <h1>${esc(t.name)}</h1>
        <p class="sub">${esc(t.en)} ― ${esc(t.tagline)}</p>
      </div>
      <p>${esc(t.desc)}</p>
      ${bars}
      <h2>強み</h2><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <h2>気をつけたいこと</h2><ul>${t.cautions.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <h2>おすすめのサウナ</h2><p>${esc(t.sauna)}</p>
      <h2>相性のいいタイプ</h2><p>${m.emoji} ${esc(m.name)} <span class="sub">(${t.match})</span></p>
      <div class="actions">
        <a class="btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}">結果をシェア</a>
        <button class="btn ghost" id="again">もう一度診断する</button>
      </div>
      <p class="sub center" style="font-size:.8rem;margin-top:20px">※ 娯楽目的の診断です。サウナは体調に合わせて無理せず、水分補給をしてお楽しみください。</p>
    </section>`);
    document.getElementById("again").onclick = start;
  }

  // 結果URL (#CODE-回答列) からの復元
  const m = location.hash.match(/^#([HS][WA][OT][RF])-([0-4]+)$/);
  if (m && TYPES[m[1]] && m[2].length === Q.length) {
    answers = m[2].split("").map((c) => Number(c) - 2);
    result(codeOf(scores()), scores());
  } else start();
})();
