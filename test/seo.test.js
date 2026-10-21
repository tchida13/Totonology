// SEO 関連ファイルの整合性テスト。URL は js/app.js の SITE_URL を唯一の基準にする
// (独自ドメイン移行時は SITE_URL と下記ファイルのURLを同時に置き換える。ズレればここで検知する)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const SITE_URL = read("js/app.js").match(/const SITE_URL = "([^"]+)"/)[1];
const html = read("index.html");

test("canonical と og:url が SITE_URL と一致する", () => {
  assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)[1], SITE_URL);
  assert.equal(html.match(/<meta property="og:url" content="([^"]+)"/)[1], SITE_URL);
});

test("title と description が設定され、description は適切な長さ", () => {
  assert.match(html, /<title>[^<]*サウナ[^<]*診断[^<]*<\/title>/);
  const d = html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok(d.length >= 50 && d.length <= 120, `description length ${d.length}`);
  assert.ok(d.includes("16タイプ"));
});

test("JSON-LD が妥当な WebApplication で URL が SITE_URL と一致する", () => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const ld = JSON.parse(m[1]);
  assert.equal(ld["@type"], "WebApplication");
  assert.equal(ld.url, SITE_URL);
  assert.equal(ld.inLanguage, "ja");
});

test("sitemap.xml が SITE_URL を含み、robots.txt が sitemap を指す", () => {
  assert.ok(read("sitemap.xml").includes(`<loc>${SITE_URL}</loc>`));
  const robots = read("robots.txt");
  assert.ok(robots.includes(`Sitemap: ${SITE_URL}sitemap.xml`));
  assert.ok(!/^Disallow:\s*\/\s*$/m.test(robots), "全体を Disallow していない");
});

test("collect-site.sh が sitemap.xml / robots.txt を公開対象に含める", () => {
  const sh = read("scripts/collect-site.sh");
  assert.ok(sh.includes("robots.txt") && sh.includes("sitemap.xml"));
});
