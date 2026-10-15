const { test } = require("node:test");
const assert = require("node:assert/strict");

globalThis.window = globalThis;
require("../js/data.js");

const Q = window.QUESTIONS, AXES = window.AXES, TYPES = window.TYPES;

test("各軸の質問数は同数で、decisive はちょうど1問", () => {
  const sizes = AXES.map((ax) => Q.filter((q) => q.axis === ax.id).length);
  assert.ok(sizes[0] > 0);
  sizes.forEach((n) => assert.equal(n, sizes[0]));
  AXES.forEach((ax) => {
    const n = Q.filter((q) => q.axis === ax.id && q.decisive).length;
    assert.equal(n, 1, `${ax.id} の decisive は1問のみ`);
  });
});

test("質問は既知の軸を参照し、dir は +1/-1 で、各軸に両方向がある", () => {
  Q.forEach((q) => {
    assert.ok(AXES.some((ax) => ax.id === q.axis), q.text);
    assert.ok(q.dir === 1 || q.dir === -1, q.text);
  });
  AXES.forEach((ax) => {
    const dirs = new Set(Q.filter((q) => q.axis === ax.id).map((q) => q.dir));
    assert.equal(dirs.size, 2, `${ax.id} は両方向の質問を持つ`);
  });
});

test("軸コードの全組み合わせ(16タイプ)が定義されている", () => {
  let codes = [""];
  AXES.forEach((ax) => { codes = codes.flatMap((c) => [c + ax.first.code, c + ax.second.code]); });
  assert.equal(codes.length, 16);
  assert.deepEqual(Object.keys(TYPES).sort(), codes.sort());
});

test("各タイプの必須項目が埋まっている", () => {
  Object.entries(TYPES).forEach(([code, t]) => {
    ["name", "en", "tagline", "desc", "sauna"].forEach((k) => assert.ok(t[k], `${code}.${k}`));
    ["strengths", "cautions"].forEach((k) => assert.ok(Array.isArray(t[k]) && t[k].length > 0, `${code}.${k}`));
  });
});

test("match は自分以外の実在タイプを指す", () => {
  Object.entries(TYPES).forEach(([code, t]) => {
    assert.ok(TYPES[t.match], `${code}.match=${t.match}`);
    assert.notEqual(t.match, code);
  });
});

test("おすすめ施設: 各タイプに1〜2件の実在IDが紐づき、必須項目がある", () => {
  const SPOTS = window.SPOTS;
  Object.entries(TYPES).forEach(([code, t]) => {
    assert.ok(Array.isArray(t.spots) && t.spots.length >= 1 && t.spots.length <= 2, `${code}.spots`);
    t.spots.forEach((id) => assert.ok(SPOTS[id], `${code}: ${id}`));
    assert.equal(new Set(t.spots).size, t.spots.length, `${code} の施設が重複`);
  });
  Object.entries(SPOTS).forEach(([id, sp]) => {
    ["name", "area", "vibe", "note"].forEach((k) => assert.ok(sp[k], `${id}.${k}`));
  });
});

test("すべての施設がいずれかのタイプから参照されている", () => {
  const used = new Set(Object.values(TYPES).flatMap((t) => t.spots));
  Object.keys(window.SPOTS).forEach((id) => assert.ok(used.has(id), id));
});

test("各タイプのキャラクター画像があり、所属グループが定義されている", () => {
  const fs = require("node:fs"), path = require("node:path");
  Object.keys(TYPES).forEach((code) => {
    const f = path.join(__dirname, "..", "assets", "characters", code + ".svg");
    assert.ok(fs.existsSync(f), `${code}.svg`);
    const g = window.GROUPS[code[0] + code[2]];
    assert.ok(g && g.name && g.desc && /^#[0-9A-Fa-f]{6}$/.test(g.color), `${code} のグループ`);
  });
});
