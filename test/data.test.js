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

test("相性は全タイプが相互のペアで、理由文がある", () => {
  Object.entries(TYPES).forEach(([code, t]) => {
    assert.equal(TYPES[t.match].match, code, `${code} ⇄ ${t.match} は相互`);
    assert.ok(t.matchReason && t.matchReason.length >= 20, `${code}.matchReason`);
  });
});

test("match は自分以外の実在タイプを指す", () => {
  Object.entries(TYPES).forEach(([code, t]) => {
    assert.ok(TYPES[t.match], `${code}.match=${t.match}`);
    assert.notEqual(t.match, code);
  });
});

test("施設データ: 必須項目・親和度の範囲・都道府県・URL形式・確認日が正しい", () => {
  const SPOTS = window.SPOTS;
  const KINDS = ["サウナ専門", "銭湯", "スパ・健康ランド", "ホテル・カプセル", "宿泊・アウトドア", "温泉"];
  Object.entries(SPOTS).forEach(([id, sp]) => {
    ["name", "pref", "kind", "vibe", "note", "checked"].forEach((k) => assert.ok(sp[k], `${id}.${k}`));
    assert.ok(/(都|道|府|県)$/.test(sp.pref), `${id}.pref=${sp.pref}`);
    assert.ok(KINDS.includes(sp.kind), `${id}.kind=${sp.kind}`);
    assert.match(sp.checked, /^\d{4}-\d{2}$/, `${id}.checked`);
    AXES.forEach((ax) => {
      const v = sp.axes && sp.axes[ax.id];
      assert.ok(Number.isInteger(v) && v >= -2 && v <= 2, `${id}.axes.${ax.id}=${v}`);
    });
    if (sp.url) assert.match(sp.url, /^https:\/\/[^\s]+$/, `${id}.url`);
    if (sp.only) assert.match(sp.only, /専用$/, `${id}.only`);
  });
  assert.equal(Object.keys(SPOTS).length, new Set(Object.values(SPOTS).map((x) => x.name + x.pref)).size, "施設の重複");
});

test("types に手動の spots 紐づけが残っていない(施設は親和度から自動で選ぶ)", () => {
  Object.entries(TYPES).forEach(([code, t]) => assert.equal(t.spots, undefined, code));
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

test("グループの背景写真ファイルが存在する", () => {
  const fs = require("node:fs"), path = require("node:path");
  Object.entries(window.GROUPS).forEach(([k, g]) => {
    assert.ok(g.photo && fs.existsSync(path.join(__dirname, "..", g.photo)), `${k}.photo`);
  });
});

test("app.js / index.html が使うアイコンIDがスプライトに存在する", () => {
  const fs = require("node:fs"), path = require("node:path");
  const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");
  const sprite = new Set([...read("assets", "icons.svg").matchAll(/<symbol[^>]*\sid="([^"]+)"/g)].map((m) => m[1]));
  const app = read("js", "app.js"), html = read("index.html");
  const used = new Set([
    ...[...app.matchAll(/icon\("([a-z0-9-]+)"\)/g)].map((m) => m[1]),
    ...[...html.matchAll(/icons\.svg#([a-z0-9-]+)/g)].map((m) => m[1]),
  ]);
  assert.ok(used.size > 4, "アイコン参照を抽出できている");
  used.forEach((id) => assert.ok(sprite.has(id), `icons.svg に ${id} がない`));
});

test("グループ色: 結果ヒーロー(色を60%黒と混ぜた背景)上の白文字が WCAG AA(4.5:1)以上", () => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  Object.entries(window.GROUPS).forEach(([k, g]) => {
    const bg = [1, 3, 5].map((i) => parseInt(g.color.slice(i, i + 2), 16) * 0.6);
    assert.ok(1.05 / (lum(bg) + 0.05) >= 4.5, `${k} (${g.color})`);
  });
});

test("ため演出の段(RITUAL)が4段(水風呂→休憩→外気浴→整い)そろい、各段に name/line とゆったりした長さ(ms)がある", () => {
  assert.equal(window.RITUAL.length, 4);
  assert.equal(window.RITUAL[0].name, "水風呂");
  assert.ok(window.RITUAL_TITLE, "分析中を伝える見出し");
  window.RITUAL.forEach((r) => assert.ok(r.ms >= 2000, "慌ただしくならないよう各段は2秒以上"));
  window.RITUAL.forEach((r, i) => ["name", "line"].forEach((k) => assert.ok(r[k], `RITUAL[${i}].${k}`)));
});
