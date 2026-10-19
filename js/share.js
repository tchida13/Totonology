// 結果のシェア用画像(1200x630, 入館証風)を canvas に描く。回答の生データ(結果URLのハッシュ)は含めない
(function (root) {
  const W = 1200, H = 630;
  const FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic",system-ui,sans-serif';
  const INK = "#25292C", SUB = "#5F6668", BG = "#F3F1EC", LINE = "#D6D1C5";

  // 色(#RRGGBB)を黒と混ぜて暗くする。結果ヒーローの配色(グループ色を55%黒に混ぜる)に合わせる
  function darken(hex, k) {
    const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

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
  function fitText(ctx, text, x, y, maxW, size, weight, min) {
    let s = size;
    for (; s > min; s -= 2) { ctx.font = `${weight} ${s}px ${FONT}`; if (ctx.measureText(text).width <= maxW) break; }
    ctx.font = `${weight} ${s}px ${FONT}`;
    ctx.fillText(text, x, y);
  }

  // d: { code, letters:[{code,label}], name, en, tagline, groupName, color, siteLabel }
  // imgs: { avatar, photo }（photo は無くても描ける）
  function draw(ctx, d, imgs) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // 左: 写真の帯(グループ色で暗くする)とアバター
    const LW = 420;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, LW, H); ctx.clip();
    if (imgs.photo) {
      const r = Math.max(LW / imgs.photo.width, H / imgs.photo.height);
      ctx.drawImage(imgs.photo, (LW - imgs.photo.width * r) / 2, (H - imgs.photo.height * r) / 2, imgs.photo.width * r, imgs.photo.height * r);
    }
    ctx.fillStyle = darken(d.color, 0.55);
    ctx.globalAlpha = imgs.photo ? 0.88 : 1;
    ctx.fillRect(0, 0, LW, H);
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText("SAUNA PASS", 36, 52);
    const cx = LW / 2, cy = H / 2 + 6, R = 150;
    ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fillStyle = BG; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(imgs.avatar, cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // 右: タイプコードの札4枚
    const X = 480, RW = 660, gap = 14, tw = (RW - gap * 3) / 4;
    ctx.textAlign = "center";
    d.letters.forEach((l, i) => {
      const x = X + i * (tw + gap), y = 96;
      ctx.fillStyle = "#fff"; ctx.fillRect(x, y, tw, 132);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, y, tw, 132);
      ctx.fillStyle = INK;
      ctx.font = `600 72px ${FONT}`;
      ctx.fillText(l.code, x + tw / 2, y + 74);
      ctx.fillStyle = SUB;
      fitText(ctx, l.label, x + tw / 2, y + 112, tw - 16, 22, 500, 12);
    });

    // 名前・英名・キャッチコピー
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    fitText(ctx, d.name, X, 330, RW, 96, 600, 48);
    ctx.fillStyle = SUB;
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(d.en, X, 382);
    ctx.fillStyle = INK;
    ctx.font = `400 30px ${FONT}`;
    wrap(ctx, d.tagline, RW).slice(0, 2).forEach((line, i) => ctx.fillText(line, X, 440 + i * 44));

    // グループのスタンプ
    ctx.save();
    ctx.translate(1010, 560); ctx.rotate(-0.15);
    ctx.font = `600 30px ${FONT}`;
    const label = d.groupName + "タイプ", sw = ctx.measureText(label).width + 32;
    ctx.fillStyle = "#fff"; ctx.fillRect(-sw / 2, -30, sw, 52);
    ctx.strokeStyle = d.color; ctx.lineWidth = 4; ctx.strokeRect(-sw / 2, -30, sw, 52);
    ctx.fillStyle = INK; ctx.textAlign = "center";
    ctx.fillText(label, 0, 8);
    ctx.restore();

    // フッター
    ctx.textAlign = "left";
    ctx.fillStyle = SUB;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(d.siteLabel, X, 590);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
  }

  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  // PNG の Blob を返す。d.avatarSrc / d.photoSrc は同一オリジンの画像
  async function render(d) {
    const [avatar, photo] = await Promise.all([load(d.avatarSrc), load(d.photoSrc).catch(() => null)]);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    draw(canvas.getContext("2d"), d, { avatar, photo });
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
  }

  const api = { W, H, draw, render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ShareImage = api;
})(typeof window !== "undefined" ? window : globalThis);
