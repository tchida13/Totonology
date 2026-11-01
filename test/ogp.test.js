// OGP 画像(scripts/build-ogp.js の生成物)と SVG 記録用コンテキストの検証
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildSvgs, stale, jpegSize, fileOf } = require("../scripts/build-ogp.js");
const { createSvgCanvas, textWidth } = require("../scripts/svg-canvas.js");
const { ogImage, SITE_URL } = require("../scripts/build-types.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const svgs = buildSvgs();

test("トップ + 16タイプ分のSVGが作られ、g の開閉が対応している", () => {
  assert.equal(Object.keys(svgs).length, 17);
  for (const [name, svg] of Object.entries(svgs)) {
    assert.match(svg, /^<svg [^>]*width="1200" height="630"/, name);
    assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length, name);
  }
  assert.ok(svgs.HAOF.includes("風来坊") && svgs.top.includes("Totonology"));
});

test("コミット済みの画像・manifest が js/data.js・share.js と一致する(再生成: node scripts/build-ogp.js)", () => {
  assert.deepEqual(stale(svgs), []);
});

test("全画像が 1200x630 の JPEG で、ogImage() / index.html の参照先が存在する", () => {
  for (const name of Object.keys(svgs)) {
    const size = jpegSize(fs.readFileSync(path.join(ROOT, fileOf(name))));
    assert.deepEqual([size.width, size.height], [1200, 630], name);
  }
  for (const code of Object.keys(svgs).filter((k) => k !== "top")) {
    const img = ogImage(code);
    assert.ok(img.url.startsWith(SITE_URL + "assets/ogp/"), code);
    assert.ok(fs.existsSync(path.join(ROOT, img.url.slice(SITE_URL.length))), code);
  }
  const html = read("index.html");
  const top = html.match(/<meta property="og:image" content="([^"]+)"/)[1];
  assert.ok(fs.existsSync(path.join(ROOT, top.slice(SITE_URL.length))));
  assert.equal(html.match(/<meta name="twitter:image" content="([^"]+)"/)[1], top);
  assert.equal(html.match(/<meta name="twitter:card" content="([^"]+)"/)[1], "summary_large_image");
});

test("svg-canvas: 図形・テキスト・グラデーション・クリップ・変形を SVG にする", () => {
  const c = createSvgCanvas(100, 50);
  c.fillStyle = "#fff"; c.fillRect(0, 0, 100, 50);
  c.save(); c.translate(10, 10); c.rotate(Math.PI / 2);
  c.beginPath(); c.arc(5, 5, 4, 0, Math.PI * 2); c.clip();
  c.globalAlpha = 0.5; c.fillStyle = "#000"; c.fillRect(0, 0, 9, 9);
  c.restore();
  const g = c.createLinearGradient(0, 0, 100, 0); g.addColorStop(0, "red"); c.fillStyle = g; c.fillRect(0, 0, 1, 1);
  c.textAlign = "center"; c.letterSpacing = "2px"; c.fillText("a<b", 50, 25);
  const svg = c.toSvg();
  assert.match(svg, /transform="translate\(10 10\) rotate\(90\)"/);
  assert.match(svg, /clip-path="url\(#c\d+\)"/);
  assert.match(svg, /opacity="0.5"/);
  assert.match(svg, /fill:url\(#g\d+\)/);
  assert.match(svg, /text-anchor="middle"[^>]*letter-spacing:2px[^>]*>a&lt;b</);
  assert.ok("letterSpacing" in c);
  assert.ok(textWidth("あ", "10px x", 0) > textWidth("a", "10px x", 0));
});
