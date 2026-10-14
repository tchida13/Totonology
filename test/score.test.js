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

test("すべて「どちらでもない」なら 50% で同点（現状は second 側に倒れる）", () => {
  const sc = scores(neutral, Q, AXES);
  sc.forEach((s) => { assert.equal(s.sum, 0); assert.equal(s.pct, 50); });
  assert.equal(codeOf(sc), "SATF");
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
