// スコア計算・タイプ判定（DOM非依存。ブラウザと Node の両方から読める）
(function (root) {
  // 各軸のスコア: sum は first 側が正。pct は first 側の割合(0-100)
  function scores(answers, questions, axes) {
    return axes.map((ax) => {
      let sum = 0, max = 0;
      questions.forEach((q, i) => { if (q.axis === ax.id) { sum += answers[i] * q.dir; max += 2; } });
      return { ax, sum, pct: Math.round(((sum + max) / (2 * max)) * 100) };
    });
  }

  function codeOf(sc) {
    // 同点(0)は second 側に倒す
    return sc.map((s) => (s.sum > 0 ? s.ax.first.code : s.ax.second.code)).join("");
  }

  const api = { scores, codeOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Score = api;
})(typeof window !== "undefined" ? window : globalThis);
