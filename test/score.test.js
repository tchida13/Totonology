const { test } = require("node:test");
const assert = require("node:assert/strict");

globalThis.window = globalThis;
require("../js/data.js");
const Score = require("../js/score.js");
const { scores, codeOf } = Score;

const Q = window.QUESTIONS, AXES = window.AXES, TYPES = window.TYPES;

// 「そう思う」側(first)に全振りした回答 / second に全振りした回答
const allFirst = Q.map((q) => 2 * q.dir);
const allSecond = Q.map((q) => -2 * q.dir);
const neutral = Q.map(() => 0);

test("first 側に全振りすると各軸 100% で first コードになる", () => {
  const sc = scores(allFirst, Q, AXES);
  sc.forEach((s) => assert.equal(s.pct, 100));
  assert.equal(codeOf(sc), "HWOR");
});

test("second 側に全振りすると各軸 0% で second コードになる", () => {
  const sc = scores(allSecond, Q, AXES);
  sc.forEach((s) => assert.equal(s.pct, 0));
  assert.equal(codeOf(sc), "SATF");
});

test("すべて「どちらでもない」なら 50% で同点、最終的に first 側になる", () => {
  const sc = scores(neutral, Q, AXES);
  sc.forEach((s) => { assert.equal(s.sum, 0); assert.equal(s.pct, 50); assert.equal(s.side, "first"); });
  assert.equal(codeOf(sc), "HWOR");
});

// 「first 側に v」を、その質問の dir を考慮した回答値に変換する
const toAns = (i, v) => v * Q[i].dir;
const axisIdx = (axisId) => Q.map((q, i) => (q.axis === axisId ? i : -1)).filter((i) => i >= 0);
const axisScore = (answers, axisId) => scores(answers, Q, AXES).find((s) => s.ax.id === axisId);

test("同点: 強い回答(±2)が多い側を採用する", () => {
  AXES.forEach((ax) => {
    const [i0, i1, i2] = axisIdx(ax.id);
    // first +2 / second +1, +1 → 合計0だが、強い回答は first 側のみ
    const a = neutral.slice();
    a[i0] = toAns(i0, 2); a[i1] = toAns(i1, -1); a[i2] = toAns(i2, -1);
    assert.equal(axisScore(a, ax.id).sum, 0, ax.id);
    assert.equal(axisScore(a, ax.id).side, "first", ax.id);
    // 逆向き: 強い回答は second 側のみ
    const b = neutral.slice();
    b[i0] = toAns(i0, -2); b[i1] = toAns(i1, 1); b[i2] = toAns(i2, 1);
    assert.equal(axisScore(b, ax.id).sum, 0, ax.id);
    assert.equal(axisScore(b, ax.id).side, "second", ax.id);
  });
});

test("同点で強い回答もない場合は決め手(decisive)の質問で決まる", () => {
  AXES.forEach((ax) => {
    const idx = axisIdx(ax.id);
    const d = idx.find((i) => Q[i].decisive);
    const other = idx.find((i) => i !== d);
    // 決め手が second 側に1、他の1問が first 側に1 → 合計0・強い回答なし
    const a = neutral.slice();
    a[d] = toAns(d, -1); a[other] = toAns(other, 1);
    assert.equal(axisScore(a, ax.id).sum, 0, ax.id);
    assert.equal(axisScore(a, ax.id).side, "second", ax.id);
    const b = neutral.slice();
    b[d] = toAns(d, 1); b[other] = toAns(other, -1);
    assert.equal(axisScore(b, ax.id).side, "first", ax.id);
  });
});

test("同点判定は決定的（同じ回答から常に同じ結果）", () => {
  for (let n = 0; n < 100; n++) {
    const answers = Q.map(() => Math.floor(Math.random() * 5) - 2);
    assert.equal(codeOf(scores(answers, Q, AXES)), codeOf(scores(answers.slice(), Q, AXES)));
  }
});

test("同点でない軸は合計の符号で決まる", () => {
  scores(allFirst, Q, AXES).forEach((s) => assert.equal(s.side, "first"));
  scores(allSecond, Q, AXES).forEach((s) => assert.equal(s.side, "second"));
});

test("dir が逆の質問は回答の符号が反転して集計される", () => {
  const i = Q.findIndex((q) => q.axis === "heat" && q.dir === -1);
  const answers = neutral.slice();
  answers[i] = 2; // 低温じっくり側に強く同意
  const heat = scores(answers, Q, AXES).find((s) => s.ax.id === "heat");
  assert.equal(heat.sum, -2);
});

test("生成されるコードは必ず定義済みの16タイプのいずれか", () => {
  for (let n = 0; n < 200; n++) {
    const answers = Q.map(() => Math.floor(Math.random() * 5) - 2);
    assert.ok(TYPES[codeOf(scores(answers, Q, AXES))]);
  }
});

test("データ整合性: 全軸に質問があり dir は ±1", () => {
  AXES.forEach((ax) => assert.ok(Q.some((q) => q.axis === ax.id), ax.id));
  Q.forEach((q) => {
    assert.ok(AXES.some((ax) => ax.id === q.axis));
    assert.ok(q.dir === 1 || q.dir === -1);
    assert.ok(q.text);
  });
});

test("データ整合性: 各軸で first 側・second 側の質問数が同数", () => {
  AXES.forEach((ax) => {
    const qs = Q.filter((q) => q.axis === ax.id);
    assert.equal(qs.filter((q) => q.dir === 1).length, qs.filter((q) => q.dir === -1).length, ax.id);
  });
});

test("データ整合性: 各軸の質問数が揃っている", () => {
  const counts = AXES.map((ax) => Q.filter((q) => q.axis === ax.id).length);
  assert.ok(counts.every((n) => n === counts[0]), counts.join(","));
});

test("データ整合性: 質問文が重複していない", () => {
  assert.equal(new Set(Q.map((q) => q.text)).size, Q.length);
});

test("データ整合性: 各軸に決め手(decisive)の質問がちょうど1問ある", () => {
  AXES.forEach((ax) => assert.equal(Q.filter((q) => q.axis === ax.id && q.decisive).length, 1, ax.id));
});

test("データ整合性: 16タイプが揃い match が実在する", () => {
  const codes = [];
  for (const a of [AXES[0].first.code, AXES[0].second.code])
    for (const b of [AXES[1].first.code, AXES[1].second.code])
      for (const c of [AXES[2].first.code, AXES[2].second.code])
        for (const d of [AXES[3].first.code, AXES[3].second.code]) codes.push(a + b + c + d);
  assert.equal(codes.length, 16);
  codes.forEach((code) => {
    const t = TYPES[code];
    assert.ok(t, `${code} が未定義`);
    assert.ok(TYPES[t.match], `${code} の match ${t.match} が未定義`);
  });
});

test("order: 全質問を1回ずつ含み、同じ軸が連続しない", () => {
  const { order } = require("../js/score.js");
  const o = order(Q, AXES);
  assert.deepEqual([...o].sort((a, b) => a - b), Q.map((_, i) => i));
  o.slice(1).forEach((qi, k) => assert.notEqual(Q[qi].axis, Q[o[k]].axis));
  assert.deepEqual(o.slice(0, AXES.length).map((qi) => Q[qi].axis), AXES.map((ax) => ax.id));
});

// ---- おすすめ施設の選定 ----
const AX = [
  { id: "heat", first: { code: "H" }, second: { code: "S" } }, { id: "cool", first: { code: "W" }, second: { code: "A" } },
  { id: "mate", first: { code: "O" }, second: { code: "T" } }, { id: "style", first: { code: "R" }, second: { code: "F" } },
];
const sp = (pref, heat, cool, mate, style) => ({ pref, axes: { heat, cool, mate, style } });

test("recommend: 4軸の親和度がタイプに近い施設を上位から選ぶ", () => {
  const spots = { a: sp("東京都", 2, 2, 2, 2), b: sp("東京都", -2, -2, -2, -2), c: sp("東京都", 0, 0, 0, 0) };
  assert.equal(Score.recommend("HWOR", spots, AX, 1)[0], "a"); // 高温・水風呂・ひとり・計画に最も近い
  assert.equal(Score.recommend("SATF", spots, AX, 1)[0], "b"); // 逆側の4軸に最も近い
  assert.deepEqual(Score.recommend("HWOR", spots, AX, 3), ["a", "c", "b"]);
});

test("recommend: 首都圏はn-1件までにして、近い地方の施設を入れる。地方が遠すぎるなら入れない", () => {
  const near = { m1: sp("東京都", 2, 2, 2, 2), m2: sp("神奈川県", 2, 2, 2, 1), m3: sp("埼玉県", 2, 2, 1, 1), r1: sp("長野県", 2, 1, 1, 1) };
  const got = Score.recommend("HWOR", near, AX, 3);
  assert.equal(got.length, 3);
  assert.ok(got.includes("r1"), "近い地方の施設が入る");
  assert.equal(got.filter((id) => Score.isMetro(near[id])).length, 2);
  const far = { m1: sp("東京都", 2, 2, 2, 2), m2: sp("神奈川県", 2, 2, 2, 1), m3: sp("埼玉県", 2, 2, 1, 1), r1: sp("長野県", -2, -2, -2, -2) };
  assert.deepEqual(Score.recommend("HWOR", far, AX, 3).sort(), ["m1", "m2", "m3"]); // 遠い地方は入れない
  assert.deepEqual(Score.recommend("HWOR", near, AX, 1), ["m1"]); // n=1 でも最良の施設は首都圏だからと落とさない
});

test("recommend: 施設が少なくても件数ぶんだけ返し、空の施設群は空配列。結果は毎回同じ(決定的)", () => {
  assert.deepEqual(Score.recommend("HWOR", {}, AX, 3), []);
  const two = { a: sp("東京都", 1, 1, 1, 1), b: sp("大阪府", 0, 0, 0, 0) };
  assert.equal(Score.recommend("HWOR", two, AX, 3).length, 2);
  assert.deepEqual(Score.recommend("HWOR", two, AX, 3), Score.recommend("HWOR", two, AX, 3));
});

test("recommend: 実データで全16タイプに3件ずつ、重複なく選ばれ、施設が一部に偏らない", () => {
  const { SPOTS, AXES, TYPES } = window;
  const used = new Set();
  Object.keys(TYPES).forEach((code) => {
    const got = Score.recommend(code, SPOTS, AXES, 3);
    assert.equal(got.length, 3, code);
    assert.equal(new Set(got).size, 3, `${code} の重複`);
    got.forEach((id) => { assert.ok(SPOTS[id], id); used.add(id); });
  });
  assert.ok(used.size >= Math.ceil(Object.keys(SPOTS).length * 0.6), `使われた施設 ${used.size}/${Object.keys(SPOTS).length}`);
});
