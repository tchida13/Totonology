#!/usr/bin/env node
// タイプ別の静的ページ(types/<code>.html)と sitemap.xml を js/data.js から生成する。Node 標準のみ。
//   node scripts/build-types.js           … 生成して書き込む(出力はコミットする)
//   node scripts/build-types.js --check   … コミット済みの出力が data.js と一致するか確認(食い違いなら exit 1。CI用)
// 文言は js/data.js が唯一の情報源。生成物は手で編集しない。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

// js/data.js をブラウザ同様に window へ読み込む(グローバルを汚さない)
function loadData() {
  const ctx = { console };
  ctx.window = ctx;
  vm.runInNewContext(read("js/data.js"), ctx, { filename: "js/data.js" });
  return ctx;
}
const Score = require("../js/score.js");
const SITE_URL = read("js/app.js").match(/const SITE_URL = "([^"]+)"/)[1];

// og:image / twitter:image の URL。タイプ別OGP画像(scripts/build-ogp.js の生成物 assets/ogp/<code>.jpg)
const ogImage = (code) => ({ url: SITE_URL + "assets/ogp/" + code.toLowerCase() + ".jpg", width: 1200, height: 630 });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const typeUrl = (code) => SITE_URL + Score.typePagePath(code);
const fileOf = (code) => path.basename(Score.typePagePath(code)); // types/ 内の相対リンク用

function renderPage(code, d) {
  const { TYPES, GROUPS, AXES, SPOTS } = d;
  const t = TYPES[code], m = TYPES[t.match];
  const grp = GROUPS[code[0] + code[2]], mGrp = GROUPS[t.match[0] + t.match[2]];
  const url = typeUrl(code);
  const title = `${t.name}（${code}）｜サウナ性格診断 Totonology`;
  const desc = `サウナ性格診断の「${t.name}」（${t.en}）タイプ。${t.tagline}。強み・相性のいいタイプ・おすすめのサウナを紹介します。`;
  const img = ogImage(code);
  const letters = AXES.map((ax, i) => (code[i] === ax.first.code ? ax.first : ax.second));
  const avatar = (c, name, size) => `<img class="avatar" src="../assets/characters/${c}.svg" alt="${esc(name)}のキャラクター" width="${size}" height="${size}">`;
  const spots = Score.recommend(code, SPOTS, AXES, 3).map((id) => {
    const sp = SPOTS[id];
    const where = [sp.pref, sp.area].filter(Boolean).join(" ");
    const map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(sp.name + " " + where);
    return `<li class="spot"><strong>${esc(sp.name)}</strong> <span class="sub">${esc(where)}</span> <span class="kind">${esc(sp.kind)}</span>${sp.only ? ` <span class="kind only">${esc(sp.only)}</span>` : ""}<br><span class="vibe">${esc(sp.vibe)}</span><span class="note">${esc(sp.note)}</span>
        <span class="links">${sp.url ? `<a href="${esc(sp.url)}" target="_blank" rel="noopener">公式サイト</a>` : ""}<a href="${map}" target="_blank" rel="noopener">地図で見る</a></span></li>`;
  }).join("\n      ");
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url, url, name: title, description: desc, inLanguage: "ja", isPartOf: { "@type": "WebSite", name: "Totonology", url: SITE_URL }, primaryImageOfPage: img.url },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Totonology", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: `${t.name}（${code}）`, item: url },
      ] },
    ],
  };
  return `<!doctype html>
<!-- このファイルは scripts/build-types.js で js/data.js から生成されています。直接編集しないでください -->
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:site_name" content="Totonology">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${img.url}">
<meta property="og:image:width" content="${img.width}">
<meta property="og:image:height" content="${img.height}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${img.url}">
<link rel="canonical" href="${url}">
<link rel="icon" href="../favicon.svg?v=2" type="image/svg+xml">
<link rel="icon" href="../favicon.ico?v=2" sizes="48x48">
<link rel="apple-touch-icon" href="../apple-touch-icon.png?v=2">
<meta name="theme-color" content="#F3F1EC">
<meta name="color-scheme" content="light">
<link rel="stylesheet" href="../style.css">
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body class="type-page">
<header class="top"><a class="brand" href="../"><span class="brand-mark"><svg class="icon" aria-hidden="true" focusable="false"><use href="../assets/icons.svg#flame"/></svg></span>Totonology</a></header>
<main>
<article class="result" style="--group:${grp.color}">
  <header class="pass" style="--photo:url(../${grp.photo})">
    <div class="pass-band" aria-hidden="true"><span>SAUNA PASS</span><span>入館証</span></div>
    ${avatar(code, t.name, 200)}
    <ul class="code" aria-label="タイプコード ${code}">${letters.map((l, i) => `<li style="--i:${i}"><b>${l.code}</b><small>${esc(l.label)}</small></li>`).join("")}</ul>
    <h1>${esc(t.name)}</h1>
    <p class="en">${esc(t.en)}</p>
    <p class="tagline">${esc(t.tagline)}</p>
    <p class="group">${esc(grp.desc)}</p>
    <span class="stamp">${esc(grp.name)}タイプ</span>
  </header>
  <p class="lead">${esc(t.desc)}</p>
  <div class="grid2">
    <section class="panel"><h2>強み</h2><ul class="list">${t.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
    <section class="panel"><h2>気をつけたいこと</h2><ul class="list">${t.cautions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
  </div>
  <section class="panel pair" style="--you:${mGrp.color}"><h2>相性のいいタイプ</h2>
    <div class="pair-row">
      <figure class="pair-me">${avatar(code, t.name, 96)}<figcaption><small>${code}</small>${esc(t.name)}</figcaption></figure>
      <span class="pair-link" aria-hidden="true"><i></i><b>相性</b><i></i></span>
      <figure class="pair-you"><a href="${fileOf(t.match)}">${avatar(t.match, m.name, 128)}</a><figcaption><small>${t.match}</small><strong><a href="${fileOf(t.match)}">${esc(m.name)}</a></strong></figcaption></figure>
    </div>
    <p class="pair-tag">${esc(m.tagline)}</p>
    <p class="pair-reason">${esc(t.matchReason)}</p></section>
  <section class="panel"><h2>おすすめのサウナ</h2><p>${esc(t.sauna)}</p><ul class="spots" style="margin-top:14px">
      ${spots}
  </ul>
    <p class="note-small">※ 営業状況・料金・利用条件は変わることがあります。訪問前に公式情報をご確認ください。</p></section>
  <section class="panel"><h2>あなたのタイプは？</h2>
    <p>${esc(t.name)}は、サウナの好みで分かれる16タイプのひとつです。質問に答えるだけで、あなたの「ととのい方」がわかります（無料・登録不要・約3分）。</p>
    <div class="actions"><a class="btn lg" href="../">診断をはじめる</a></div></section>
  <section class="panel"><h2>ほかのタイプ</h2>
    <ul class="type-links">${Object.keys(TYPES).filter((c) => c !== code).map((c) => `<li><a href="${fileOf(c)}">${esc(TYPES[c].name)}（${c}）</a></li>`).join("")}</ul></section>
  <p class="disclaimer">※ 娯楽目的の診断です。サウナは体調に合わせて無理せず、水分補給をしてお楽しみください。</p>
</article>
</main>
<footer class="foot">
  <p>娯楽目的のサウナ性格診断 ／ Totonology</p>
  <p>写真: Kateryna Petrova / <a href="https://pixnio.com/" target="_blank" rel="noopener">Pixnio</a>（CC0）。その他の写真・イラストはAIを含む自作です。</p>
</footer>
</body>
</html>
`;
}

// sitemap.xml: トップ + 16タイプ。lastmod は既存のトップの値を引き継ぐ(生成を決定的に保つため日付は自動更新しない)
function renderSitemap(codes, existing) {
  const root = (existing.match(/<loc>[^<]+<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/) || [])[1];
  const entry = (loc) => `  <url>\n    <loc>${loc}</loc>${root ? `\n    <lastmod>${root}</lastmod>` : ""}\n  </url>\n`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entry(SITE_URL)}${codes.map((c) => entry(typeUrl(c))).join("")}</urlset>\n`;
}

// 出力すべきファイル一式 { 相対パス: 内容 }
function build() {
  const d = loadData();
  const codes = Object.keys(d.TYPES);
  const out = {};
  codes.forEach((c) => { out[Score.typePagePath(c)] = renderPage(c, d); });
  out["sitemap.xml"] = renderSitemap(codes, read("sitemap.xml"));
  return out;
}

// 生成物とコミット済みファイルの差分(食い違い・不要ファイル)を返す
function stale(files) {
  const diff = Object.keys(files).filter((f) => !fs.existsSync(path.join(ROOT, f)) || read(f) !== files[f]);
  const dir = path.join(ROOT, "types");
  const extra = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => "types/" + f).filter((f) => !(f in files)) : [];
  return [...diff, ...extra.map((f) => f + " (不要)")];
}

module.exports = { build, stale, renderPage, typeUrl, ogImage, SITE_URL };

if (require.main === module) {
  const files = build();
  if (process.argv.includes("--check")) {
    const bad = stale(files);
    if (bad.length) {
      console.error("生成物が js/data.js と一致しません。`node scripts/build-types.js` を実行してコミットしてください。");
      bad.forEach((f) => console.error("  " + f));
      process.exit(1);
    }
    console.log(`OK: ${Object.keys(files).length} files up to date`);
  } else {
    fs.mkdirSync(path.join(ROOT, "types"), { recursive: true });
    for (const [f, body] of Object.entries(files)) fs.writeFileSync(path.join(ROOT, f), body);
    console.log(`wrote ${Object.keys(files).length} files`);
  }
}
