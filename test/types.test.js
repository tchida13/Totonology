// タイプ別ページ(scripts/build-types.js の生成物)が js/data.js と一致し、SEO 要件を満たすことの検証
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { build, stale, SITE_URL, ogImage } = require("../scripts/build-types.js");
const Score = require("../js/score.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
globalThis.window = globalThis;
require("../js/data.js");
const CODES = Object.keys(globalThis.TYPES);
const files = build();

test("生成物がコミット済みファイルと一致する(data.js を変えたら node scripts/build-types.js を再実行)", () => {
  assert.deepEqual(stale(files), []);
});

test("16タイプ分のページがあり、sitemap.xml に全て含まれる", () => {
  assert.equal(CODES.length, 16);
  const sitemap = read("sitemap.xml");
  assert.ok(sitemap.includes(`<loc>${SITE_URL}</loc>`));
  for (const code of CODES) {
    assert.ok(fs.existsSync(path.join(ROOT, Score.typePagePath(code))), code);
    assert.ok(sitemap.includes(`<loc>${SITE_URL}${Score.typePagePath(code)}</loc>`), code);
  }
});

test("各ページの title/description/canonical/og/JSON-LD がタイプ固有で一意", () => {
  const titles = new Set(), descs = new Set();
  for (const code of CODES) {
    const t = globalThis.TYPES[code];
    const html = read(Score.typePagePath(code));
    const url = SITE_URL + Score.typePagePath(code);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(title.includes(t.name) && title.includes(code));
    assert.ok(desc.length >= 50 && desc.length <= 140, `${code} description length ${desc.length}`);
    titles.add(title); descs.add(desc);
    assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)[1], url);
    assert.equal(html.match(/<meta property="og:url" content="([^"]+)"/)[1], url);
    assert.equal(html.match(/<meta property="og:image" content="([^"]+)"/)[1], ogImage(code).url);
    assert.equal(html.match(/<meta name="twitter:image" content="([^"]+)"/)[1], ogImage(code).url);
    assert.ok(!/noindex/.test(html));
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld["@graph"][0].url, url);
    assert.equal(ld["@graph"][1].itemListElement[1].item, url);
  }
  assert.equal(titles.size, 16);
  assert.equal(descs.size, 16);
});

test("ページ本文に data.js の文言(説明・強み・相性・おすすめ施設)が含まれ、診断への導線がある", () => {
  for (const code of CODES) {
    const t = globalThis.TYPES[code];
    const html = read(Score.typePagePath(code));
    assert.ok(html.includes(t.desc) && html.includes(t.tagline) && html.includes(t.matchReason));
    t.strengths.forEach((s) => assert.ok(html.includes(s)));
    assert.ok(html.includes(`href="${Score.typePagePath(t.match).replace("types/", "")}"`), "相性タイプへのリンク");
    assert.ok(html.includes('href="../"'), "診断への導線");
    const ids = Score.recommend(code, globalThis.SPOTS, globalThis.AXES, 3);
    ids.forEach((id) => assert.ok(html.includes(globalThis.SPOTS[id].name.replace(/&/g, "&amp;"))));
  }
});

test("ページ内の相対参照(css/画像/他タイプ)が実在する", () => {
  for (const code of CODES) {
    const file = Score.typePagePath(code);
    const html = read(file);
    const refs = [...html.matchAll(/(?:src|href)="(\.\.?\/[^"#?]*|[a-z]+\.html)(?:\?[^"]*)?"/g)].map((m) => m[1])
      .concat([...html.matchAll(/url\((\.\.\/[^)]+)\)/g)].map((m) => m[1]));
    assert.ok(refs.length > 5);
    for (const r of refs) {
      const p = path.join(ROOT, path.dirname(file), r);
      assert.ok(fs.existsSync(p), `${file}: ${r}`);
    }
  }
});

test("typePagePath は小文字のコードで types/ 配下を指す", () => {
  assert.equal(Score.typePagePath("SAOR"), "types/saor.html");
});

test("結果画面のシェアはタイプ別ページへ向く(app.js)", () => {
  const app = read("js/app.js");
  assert.ok(app.includes("window.Score.typePagePath(code)"));
  assert.ok(/encodeURIComponent\(typeUrl\)/.test(app));
  assert.ok(!/encodeURIComponent\(SITE_URL\)/.test(app));
});

test("collect-site.sh が types/ を公開対象に含める", () => {
  assert.ok(read("scripts/collect-site.sh").includes("types"));
});
