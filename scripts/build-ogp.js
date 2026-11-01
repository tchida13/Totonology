#!/usr/bin/env node
// OGP 画像(トップ用 + タイプ別16枚、1200x630 JPEG)を生成する。外部依存なし。
//   node scripts/build-ogp.js           … assets/ogp/*.jpg と manifest.json を生成(macOS 専用。出力はコミットする)
//   node scripts/build-ogp.js --check   … コミット済みの画像が js/data.js・js/share.js・写真と一致するか確認(どの OS でも可。CI用)
// 仕組み: js/share.js の描画(draw/drawSite)を SVG 記録用コンテキスト(svg-canvas.js)で SVG にし、macOS 標準の
//   qlmanage(SVG→PNG)と sips(切り抜き・JPEG化)で画像にする。SNS のカードは SVG 非対応が多いため JPEG を配信する。
//   --check は「描画結果の SVG のハッシュ」を manifest.json と突き合わせるので、画像のレンダリングは不要。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { createSvgCanvas } = require("./svg-canvas.js");
const Share = require("../js/share.js");

const ROOT = path.join(__dirname, "..");
const OUT = "assets/ogp";
const { w: W, h: H } = Share.SIZES.landscape;
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function loadData() {
  const ctx = { console };
  ctx.window = ctx;
  vm.runInNewContext(read("js/data.js"), ctx, { filename: "js/data.js" });
  return ctx;
}
const SITE_URL = read("js/app.js").match(/const SITE_URL = "([^"]+)"/)[1];

// JPEG の寸法(SOF マーカー)を読む
function jpegSize(buf) {
  for (let i = 2; i + 9 < buf.length; ) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("JPEG の寸法を読めません");
}

// 画像ファイルを data URI にして埋め込む(SVG 単体で完結させ、ハッシュも写真の中身に追従させる)
const cache = {};
function image(rel) {
  if (cache[rel]) return cache[rel];
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const isJpg = /\.jpe?g$/.test(rel);
  const size = isJpg ? jpegSize(buf) : { width: 240, height: 240 };
  return (cache[rel] = { href: `data:${isJpg ? "image/jpeg" : "image/svg+xml"};base64,${buf.toString("base64")}`, ...size });
}

// 出力する画像の一覧 { 名前: SVG文字列 }。名前は "top" とタイプコード
function buildSvgs() {
  const { TYPES, GROUPS, AXES } = loadData();
  const siteLabel = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const out = {};
  const top = createSvgCanvas(W, H);
  const reps = Object.keys(GROUPS).map((g) => Object.keys(TYPES).find((c) => c[0] + c[2] === g)); // 各グループの代表キャラ
  Share.drawSite(top, {
    title: "サウナ16タイプ診断", tagline: "あなたの「ととのい方」は、どのタイプ？", siteLabel, color: "#8A6A44",
  }, { photo: image("assets/photos/sauna-room.jpg"), avatars: reps.map((c) => image(`assets/characters/${c}.svg`)) });
  out.top = top.toSvg();
  for (const code of Object.keys(TYPES)) {
    const t = TYPES[code], grp = GROUPS[code[0] + code[2]];
    const c = createSvgCanvas(W, H);
    Share.draw(c, {
      code, name: t.name, en: t.en, tagline: t.tagline, groupName: grp.name, color: grp.color, siteLabel,
      letters: AXES.map((ax, i) => (code[i] === ax.first.code ? ax.first : ax.second)),
    }, { avatar: image(`assets/characters/${code}.svg`), photo: image(grp.photo) }, "landscape");
    out[code] = c.toSvg();
  }
  return out;
}

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const manifestOf = (svgs) => JSON.stringify(Object.fromEntries(Object.entries(svgs).map(([k, v]) => [k, sha(v)])), null, 2) + "\n";
const fileOf = (name) => `${OUT}/${name === "top" ? "top" : name.toLowerCase()}.jpg`;

// コミット済みの状態との食い違いを返す
function stale(svgs) {
  const bad = [];
  const mf = path.join(ROOT, OUT, "manifest.json");
  if (!fs.existsSync(mf) || fs.readFileSync(mf, "utf8") !== manifestOf(svgs)) bad.push(`${OUT}/manifest.json`);
  for (const name of Object.keys(svgs)) {
    const f = path.join(ROOT, fileOf(name));
    if (!fs.existsSync(f)) { bad.push(fileOf(name) + " (なし)"); continue; }
    const s = jpegSize(fs.readFileSync(f));
    if (s.width !== W || s.height !== H) bad.push(`${fileOf(name)} (${s.width}x${s.height})`);
  }
  return bad;
}

// qlmanage は縦横比の違う SVG を正しい倍率で出せないため、W x W の正方形キャンバスの縦中央に描いて切り抜く
function renderJpeg(svg, dest) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "totonology-ogp-"));
  try {
    const src = path.join(tmp, "in.svg");
    // sips の切り抜きは中央基準になるため、絵を正方形の縦中央に置く
    const wrapped = svg.replace(/<svg [^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><g transform="translate(0 ${(W - H) / 2})">`).replace(/<\/svg>\s*$/, "</g></svg>");
    fs.writeFileSync(src, wrapped);
    execFileSync("qlmanage", ["-t", "-s", String(W), "-o", tmp, src], { stdio: "ignore" });
    const png = path.join(tmp, "in.svg.png");
    execFileSync("sips", ["--cropToHeightWidth", String(H), String(W), "-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", dest], { stdio: "ignore" });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

module.exports = { buildSvgs, manifestOf, stale, jpegSize, fileOf, OUT };

if (require.main === module) {
  const svgs = buildSvgs();
  if (process.argv.includes("--check")) {
    const bad = stale(svgs);
    if (bad.length) {
      console.error("OGP 画像が js/data.js・js/share.js・写真と一致しません。macOS で `node scripts/build-ogp.js` を実行してコミットしてください。");
      bad.forEach((f) => console.error("  " + f));
      process.exit(1);
    }
    console.log(`OK: ${Object.keys(svgs).length} images up to date`);
  } else {
    if (process.platform !== "darwin") { console.error("生成には macOS の qlmanage / sips が必要です(--check は全OSで可)"); process.exit(1); }
    fs.mkdirSync(path.join(ROOT, OUT), { recursive: true });
    for (const [name, svg] of Object.entries(svgs)) renderJpeg(svg, path.join(ROOT, fileOf(name)));
    fs.writeFileSync(path.join(ROOT, OUT, "manifest.json"), manifestOf(svgs));
    console.log(`wrote ${Object.keys(svgs).length} images to ${OUT}/`);
  }
}
