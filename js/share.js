// 結果のシェア用画像を canvas に描く。横長(1200x630)と縦長(1080x1350)の2サイズ。
// 質問画面と同じ世界観: ウォームブラック・金・欧文セリフの数字。回答の生データ(結果URLのハッシュ)は含めない
(function (root) {
  const SIZES = { landscape: { w: 1200, h: 630 }, portrait: { w: 1080, h: 1350 } };
  const SANS = '"Hiragino Sans","Noto Sans JP","Yu Gothic",system-ui,sans-serif';
  const SERIF = '"Iowan Old Style",Palatino,Georgia,"Noto Serif",serif';
  const BG = "#161210", GOLD = "#C9A96E", TEXT = "#EFE6DA", SUB = "#A89C90";

  // 色(#RRGGBB)を黒と混ぜて暗くする
  function darken(hex, k) {
    const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  // 字間(未対応の環境では無視される)
  const spacing = (ctx, px) => { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; };

  // 日本語向けに文字単位で折り返す
  function wrap(ctx, text, maxW) {
    const lines = [];
    let cur = "";
    for (const ch of text) {
      if (cur && ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // maxW に収まるようフォントサイズを下げて文字を描く
  function fitText(ctx, text, x, y, maxW, size, weight, min, family) {
    let s = size;
    for (; s > min; s -= 2) { ctx.font = `${weight} ${s}px ${family || SANS}`; if (ctx.measureText(text).width <= maxW) break; }
    ctx.font = `${weight} ${s}px ${family || SANS}`;
    ctx.fillText(text, x, y);
  }

  function hairline(ctx, x1, y1, x2, y2, alpha) {
    ctx.strokeStyle = `rgba(201,169,110,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // 背景: ウォームブラックに、ごく薄い板目と周辺の暗がり
  function backdrop(ctx, W, H) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.022)";
    ctx.lineWidth = 2;
    for (let x = 27; x < W; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // 写真(グループ色で暗くする)を矩形に敷き、bg へ溶け込ませる
  function photoBand(ctx, d, imgs, x, y, w, h, fade) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (imgs.photo) {
      const r = Math.max(w / imgs.photo.width, h / imgs.photo.height);
      ctx.drawImage(imgs.photo, x + (w - imgs.photo.width * r) / 2, y + (h - imgs.photo.height * r) / 2, imgs.photo.width * r, imgs.photo.height * r);
    }
    ctx.globalAlpha = imgs.photo ? 0.82 : 1;
    ctx.fillStyle = darken(d.color, 0.32);
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    const g = fade === "right" ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0.55, "rgba(22,18,16,0)"); g.addColorStop(1, "rgba(22,18,16,1)");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // 円形のアバターに、金の二重リング
  function avatarRing(ctx, avatar, cx, cy, R) {
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.fillStyle = BG; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(201,169,110,.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(avatar, cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  }

  // タイプコード: 金の欧文セリフの大きな文字と、下の細線・軸ラベル
  function codeRow(ctx, d, x0, width, baseline, letterSize, labelSize, align) {
    const gap = 16, cw = (width - gap * 3) / 4;
    d.letters.forEach((l, i) => {
      const cx = x0 + i * (cw + gap) + cw / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = GOLD;
      ctx.font = `400 ${letterSize}px ${SERIF}`;
      ctx.fillText(l.code, cx, baseline);
      hairline(ctx, cx - cw / 2 + 8, baseline + letterSize * 0.2, cx + cw / 2 - 8, baseline + letterSize * 0.2, 0.55);
      ctx.fillStyle = SUB;
      fitText(ctx, l.label, cx, baseline + letterSize * 0.2 + labelSize + 12, cw - 8, labelSize, 400, 12);
    });
    ctx.textAlign = align || "left";
  }

  // グループのスタンプ: 金の細い枠(回転)
  function stamp(ctx, d, x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = `500 ${size}px ${SANS}`;
    spacing(ctx, 3);
    const label = d.groupName + "タイプ", w = ctx.measureText(label).width + size * 1.6, h = size * 1.9;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(201,169,110,.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
    ctx.fillStyle = GOLD; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 2);
    spacing(ctx, 0);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  // d: { code, letters:[{code,label}], name, en, tagline, groupName, color, siteLabel }
  // imgs: { avatar, photo }（photo は無くても描ける）。layout: "landscape" | "portrait"
  function draw(ctx, d, imgs, layout) {
    const L = layout === "portrait" ? "portrait" : "landscape";
    const { w: W, h: H } = SIZES[L];
    backdrop(ctx, W, H);
    ctx.textBaseline = "alphabetic";

    if (L === "landscape") {
      photoBand(ctx, d, imgs, 0, 0, 440, H, "right");
      avatarRing(ctx, imgs.avatar, 220, 315, 124);
      ctx.fillStyle = GOLD; ctx.textAlign = "left"; ctx.font = `500 18px ${SANS}`; spacing(ctx, 6);
      ctx.fillText("SAUNA PASS", 52, 66);
      const X = 500, RW = 640;
      ctx.fillText("TOTONOLOGY", X, 66);
      spacing(ctx, 0);
      codeRow(ctx, d, X, RW, 190, 80, 18, "left");
      ctx.textAlign = "left"; ctx.fillStyle = TEXT;
      fitText(ctx, d.name, X, 348, RW, 88, 400, 44);
      ctx.fillStyle = GOLD; ctx.font = `italic 400 28px ${SERIF}`; spacing(ctx, 2);
      ctx.fillText(d.en, X, 394);
      spacing(ctx, 0);
      ctx.fillStyle = "#BDB1A6"; ctx.font = `400 26px ${SANS}`;
      wrap(ctx, d.tagline, RW).slice(0, 2).forEach((line, i) => ctx.fillText(line, X, 446 + i * 42));
      stamp(ctx, d, 1000, 536, 24, -0.06);
      ctx.fillStyle = SUB; ctx.textAlign = "left"; ctx.font = `500 18px ${SANS}`; spacing(ctx, 3);
      ctx.fillText(d.siteLabel, X, 580);
      spacing(ctx, 0);
    } else {
      photoBand(ctx, d, imgs, 0, 0, W, 560, "bottom");
      ctx.fillStyle = GOLD; ctx.font = `500 22px ${SANS}`; spacing(ctx, 8);
      ctx.textAlign = "left"; ctx.fillText("SAUNA PASS", 72, 92);
      ctx.textAlign = "right"; ctx.fillText("TOTONOLOGY", W - 72, 92);
      spacing(ctx, 0);
      avatarRing(ctx, imgs.avatar, W / 2, 400, 176);
      codeRow(ctx, d, 72, W - 144, 780, 112, 24, "center");
      ctx.textAlign = "center"; ctx.fillStyle = TEXT;
      fitText(ctx, d.name, W / 2, 992, W - 144, 120, 400, 56);
      ctx.fillStyle = GOLD; ctx.font = `italic 400 36px ${SERIF}`; spacing(ctx, 3);
      ctx.fillText(d.en, W / 2, 1052);
      spacing(ctx, 0);
      ctx.fillStyle = "#BDB1A6"; ctx.font = `400 34px ${SANS}`;
      wrap(ctx, d.tagline, W - 200).slice(0, 3).forEach((line, i) => ctx.fillText(line, W / 2, 1116 + i * 48));
      stamp(ctx, d, W / 2, 1250, 28, -0.04);
      ctx.fillStyle = SUB; ctx.font = `500 22px ${SANS}`; spacing(ctx, 4);
      ctx.fillText(d.siteLabel, W / 2, 1304);
      spacing(ctx, 0);
    }
    // 外枠: 金の細い二重線
    ctx.strokeStyle = "rgba(201,169,110,.6)"; ctx.lineWidth = 1.5; ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = "rgba(201,169,110,.25)"; ctx.lineWidth = 1; ctx.strokeRect(30, 30, W - 60, H - 60);
  }

  // トップ用 OGP(1200x630)。同じ世界観で、ブランド名・サービス名と4グループの代表キャラを並べる
  // d: { title, tagline, siteLabel, color }  imgs: { photo, avatars: [4枚] }
  function drawSite(ctx, d, imgs) {
    const { w: W, h: H } = SIZES.landscape;
    backdrop(ctx, W, H);
    ctx.textBaseline = "alphabetic";
    photoBand(ctx, d, imgs, 0, 0, W, H, "right");
    const X = 84;
    ctx.fillStyle = GOLD; ctx.textAlign = "left"; ctx.font = `500 20px ${SANS}`; spacing(ctx, 8);
    ctx.fillText("SAUNA PERSONALITY TEST", X, 112);
    spacing(ctx, 1);
    ctx.font = `400 128px ${SERIF}`;
    ctx.fillText("Totonology", X, 258);
    spacing(ctx, 0);
    hairline(ctx, X, 296, X + 120, 296, 0.8);
    ctx.fillStyle = TEXT; ctx.font = `500 62px ${SANS}`; spacing(ctx, 2);
    ctx.fillText(d.title, X, 380);
    spacing(ctx, 0);
    ctx.fillStyle = "#BDB1A6"; ctx.font = `400 28px ${SANS}`;
    ctx.fillText(d.tagline, X, 440);
    ctx.fillStyle = SUB; ctx.font = `500 18px ${SANS}`; spacing(ctx, 3);
    ctx.fillText(d.siteLabel, X, 556);
    spacing(ctx, 0);
    const pos = [[840, 190], [1030, 190], [840, 440], [1030, 440]];
    imgs.avatars.slice(0, 4).forEach((a, i) => avatarRing(ctx, a, pos[i][0], pos[i][1], 72));
    ctx.strokeStyle = "rgba(201,169,110,.6)"; ctx.lineWidth = 1.5; ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = "rgba(201,169,110,.25)"; ctx.lineWidth = 1; ctx.strokeRect(30, 30, W - 60, H - 60);
  }

  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  // PNG の Blob を返す。d.avatarSrc / d.photoSrc は同一オリジンの画像
  async function render(d, layout) {
    const L = layout === "portrait" ? "portrait" : "landscape";
    const [avatar, photo] = await Promise.all([load(d.avatarSrc), load(d.photoSrc).catch(() => null)]);
    const canvas = document.createElement("canvas");
    canvas.width = SIZES[L].w; canvas.height = SIZES[L].h;
    draw(canvas.getContext("2d"), d, { avatar, photo }, L);
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
  }

  const api = { SIZES, draw, drawSite, render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ShareImage = api;
})(typeof window !== "undefined" ? window : globalThis);
