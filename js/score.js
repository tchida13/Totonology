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

  const api = { scores, codeOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Score = api;
})(typeof window !== "undefined" ? window : globalThis);
