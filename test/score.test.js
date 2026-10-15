const { test } = require("node:test");
const assert = require("node:assert/strict");

globalThis.window = globalThis;
require("../js/data.js");
const { scores, codeOf } = require("../js/score.js");

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
