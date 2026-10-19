// スコア計算・タイプ判定（DOM非依存。ブラウザと Node の両方から読める）
(function (root) {
  // 各軸のスコア。sum は first 側が正、pct は first 側の割合(0-100)
  // side は判定結果("first" | "second")。sum が 0 の同点は次の順で決める:
  //   1. 強い回答(±2)の多い側
  //   2. 軸の決め手質問(decisive)の回答の側
  //   3. それも中立なら first 側
  function scores(answers, questions, axes) {
    return axes.map((ax) => {
      let sum = 0, max = 0, strong = 0, decisive = 0;
      questions.forEach((q, i) => {
        if (q.axis !== ax.id) return;
        const v = answers[i] * q.dir;
        sum += v; max += 2;
        if (Math.abs(v) === 2) strong += Math.sign(v);
        if (q.decisive) decisive = Math.sign(v);
      });
      const lead = sum || strong || decisive;
      return { ax, sum, pct: Math.round(((sum + max) / (2 * max)) * 100), side: lead >= 0 ? "first" : "second" };
    });
  }

  function codeOf(sc) {
    return sc.map((s) => s.ax[s.side].code).join("");
  }

  // 出題順（質問インデックスの並び）。軸が交互になるよう、各軸の n 問目ずつを軸順に並べる。
  // 回答は質問の定義順(インデックス)で保持するため、結果URLの互換性は変わらない
  function order(questions, axes) {
    const byAxis = axes.map((ax) => questions.map((q, i) => (q.axis === ax.id ? i : -1)).filter((i) => i >= 0));
    const rounds = Math.max(...byAxis.map((a) => a.length));
    const out = [];
    for (let r = 0; r < rounds; r++) byAxis.forEach((a) => { if (r < a.length) out.push(a[r]); });
    return out;
  }

  // ---- おすすめ施設の選定 ----
  // 施設の4軸の親和度(-2〜+2)と、タイプ(各軸のどちら側か)の一致度で並べる。
  // 一致度の高いものから n 件。首都圏に偏らないよう、首都圏は n-1 件までにし(地方に十分近い施設があれば地方を入れる)、
  // 同点は「タイプ×施設」の安定ハッシュで並べて、タイプごとに結果が分散するようにする
  const METRO = ["東京都", "神奈川県", "埼玉県", "千葉県"];
  const isMetro = (spot) => METRO.includes(spot.pref);

  function fit(code, spot, axes) {
    return axes.reduce((sum, ax, i) => sum + (code[i] === ax.first.code ? 1 : -1) * ((spot.axes && spot.axes[ax.id]) || 0), 0);
  }

  function hash(str) {
    let h = 2166136261;
    for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function recommend(code, spots, axes, n) {
    n = n || 3;
    const ranked = Object.entries(spots)
      .map(([id, spot]) => ({ id, spot, fit: fit(code, spot, axes), tie: hash(code + id) }))
      .sort((a, b) => b.fit - a.fit || a.tie - b.tie);
    if (!ranked.length) return [];
    const top = ranked[0].fit;
    const picked = [];
    const metroCap = Math.max(1, n - 1); // n=1 でも最良の首都圏施設を落とさない
    let metro = 0;
    const regionalGood = ranked.some((r) => !isMetro(r.spot) && r.fit >= top - 4); // 地方にも十分近い施設がある
    for (const r of ranked) {
      if (picked.length >= n) break;
      if (isMetro(r.spot) && metro >= metroCap && regionalGood) continue;
      picked.push(r);
      if (isMetro(r.spot)) metro++;
    }
    for (const r of ranked) { // 足りなければ残りから埋める
      if (picked.length >= n) break;
      if (!picked.includes(r)) picked.push(r);
    }
    return picked.map((r) => r.id);
  }

  const api = { scores, codeOf, order, recommend, isMetro };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Score = api;
})(typeof window !== "undefined" ? window : globalThis);
