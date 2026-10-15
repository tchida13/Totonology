const { test } = require("node:test");
const assert = require("node:assert/strict");
const Share = require("../js/share.js");

// 呼ばれた描画命令を記録するだけの canvas 2D コンテキスト
function recorder() {
  const calls = [], props = {};
  const ctx = new Proxy(props, {
    get: (t, k) => (k in t ? t[k] : k === "measureText" ? (s) => ({ width: String(s).length * 20 }) : (...a) => calls.push([k, ...a])),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { ctx, calls };
}
const img = (w, h) => ({ width: w, height: h });
const spec = {
  code: "SAOR", name: "瞑想家", en: "The Meditator", tagline: "穏やかな熱と風の中で、心を整える",
  groupName: "静寂派", color: "#4C86A8", siteLabel: "tchida13.github.io/Totonology",
  letters: [{ code: "S", label: "低温じっくり" }, { code: "A", label: "外気浴派" }, { code: "O", label: "ひとりサウナ" }, { code: "R", label: "計画・ルーティン" }],
};
const texts = (calls) => calls.filter((c) => c[0] === "fillText").map((c) => c[1]);

test("シェア画像: タイプ名・コード4文字・英名・グループ・サイトURLを描く", () => {
  const { ctx, calls } = recorder();
  Share.draw(ctx, spec, { avatar: img(240, 240), photo: img(1600, 900) });
  const t = texts(calls);
  ["瞑想家", "The Meditator", "S", "A", "O", "R", "静寂派タイプ", "tchida13.github.io/Totonology"].forEach((x) => assert.ok(t.includes(x), x));
  assert.ok(t.some((x) => x.startsWith("穏やかな")), "キャッチコピー");
  assert.equal(calls.filter((c) => c[0] === "drawImage").length, 2); // 写真とアバター
});

test("シェア画像: 写真がなくても描ける。回答のハッシュ(結果URL)は含めない", () => {
  const { ctx, calls } = recorder();
  Share.draw(ctx, spec, { avatar: img(240, 240), photo: null });
  assert.equal(calls.filter((c) => c[0] === "drawImage").length, 1);
  assert.ok(texts(calls).every((x) => !x.includes("#") && !/[0-4]{24}/.test(x)));
});

test("シェア画像: 長いキャッチコピーは折り返して2行まで、キャンバスは1200x630", () => {
  const { ctx, calls } = recorder();
  Share.draw(ctx, { ...spec, tagline: "あ".repeat(80) }, { avatar: img(1, 1), photo: null });
  assert.equal(texts(calls).filter((x) => x.startsWith("あ")).length, 2);
  assert.deepEqual([Share.W, Share.H], [1200, 630]);
});
