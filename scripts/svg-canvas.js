// canvas 2D コンテキストの「使う分だけ」を SVG 文字列に書き出す記録用コンテキスト。Node 標準のみ。
// js/share.js の draw / drawSite をそのまま呼び、ブラウザ無しで同じレイアウトを SVG にするために使う(OGP 生成用)。
// 対応: fillRect/strokeRect/rect/beginPath/moveTo/lineTo/arc(全円)/fill/stroke/clip/save/restore/translate/rotate/
//       createLinearGradient/createRadialGradient/drawImage/fillText/measureText と、色・線幅・font・textAlign・letterSpacing 等のプロパティ
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = (n) => +n.toFixed(2);

// フォントを持たない環境での概算の文字幅(折り返し・縮小の判定用。全角=1em、英大文字0.68em、小文字・数字0.56em)
function textWidth(text, font, spacing) {
  const size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(font) || [0, 16])[1]);
  let w = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    w += (c >= 0x2e80 ? 1 : /[A-Z]/.test(ch) ? 0.68 : ch === " " ? 0.3 : 0.56) * size + spacing;
  }
  return w;
}

// drawImage に渡す画像は { href, width, height }
function createSvgCanvas(W, H) {
  const defs = [];
  let gid = 0, path = "";
  const root = { attrs: {}, kids: [] };
  const stack = [root];
  const saved = [];
  const props = { fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, font: "10px sans-serif", textAlign: "start", textBaseline: "alphabetic", globalAlpha: 1, letterSpacing: "0px" };
  const cur = () => stack[stack.length - 1];
  const paint = (v) => (v && v.id ? `url(#${v.id})` : v);
  const alpha = () => (props.globalAlpha === 1 ? "" : ` opacity="${props.globalAlpha}"`);
  const emit = (s) => cur().kids.push(s);
  const attrs = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
  const render = (n) => (n === root ? n.kids.join("\n") : `<g${attrs(n.attrs)}>\n${n.kids.join("\n")}\n</g>`);

  function gradient(tag, geom) {
    const id = "g" + ++gid;
    const g = { id, stops: [] };
    g.addColorStop = (o, c) => g.stops.push([o, c]);
    g.toSvg = () => `<${tag} id="${id}" gradientUnits="userSpaceOnUse"${geom()}>${g.stops.map(([o, c]) => `<stop offset="${num(o)}" style="stop-color:${c}"/>`).join("")}</${tag}>`;
    defs.push(g);
    return g;
  }

  const ctx = {
    canvas: { width: W, height: H },
    createLinearGradient: (x0, y0, x1, y1) => gradient("linearGradient", () => ` x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"`),
    // 同心円のみ対応(開始半径 r0 の内側は最初の色)。r0..r1 の区間に stops を写す
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      const g = gradient("radialGradient", () => ` cx="${x1}" cy="${y1}" r="${r1}"`);
      const base = r1 ? r0 / r1 : 0;
      g.addColorStop = (o, c) => g.stops.push([base + o * (1 - base), c]);
      return g;
    },
    measureText: (t) => ({ width: textWidth(t, props.font, parseFloat(props.letterSpacing) || 0) }),
    save() { saved.push({ ...props }); stack.push({ attrs: {}, kids: [] }); },
    restore() { Object.assign(props, saved.pop()); const n = stack.pop(); emit(render(n)); },
    translate(x, y) { const a = cur().attrs; a.transform = ((a.transform || "") + ` translate(${num(x)} ${num(y)})`).trim(); },
    rotate(r) { const a = cur().attrs; a.transform = ((a.transform || "") + ` rotate(${num((r * 180) / Math.PI)})`).trim(); },
    beginPath() { path = ""; },
    moveTo(x, y) { path += `M${num(x)} ${num(y)}`; },
    lineTo(x, y) { path += `L${num(x)} ${num(y)}`; },
    rect(x, y, w, h) { path += `M${x} ${y}h${w}v${h}h${-w}z`; },
    arc(cx, cy, r, a0, a1) {
      if (Math.abs(a1 - a0 - Math.PI * 2) > 1e-6) throw new Error("svg-canvas: 全円のみ対応");
      path += `M${num(cx + r)} ${num(cy)}A${r} ${r} 0 1 1 ${num(cx - r)} ${num(cy)}A${r} ${r} 0 1 1 ${num(cx + r)} ${num(cy)}z`;
    },
    clip() { const id = "c" + ++gid, d = path; defs.push({ toSvg: () => `<clipPath id="${id}"><path d="${d}"/></clipPath>` }); cur().attrs["clip-path"] = `url(#${id})`; },
    fill() { emit(`<path d="${path}" style="fill:${paint(props.fillStyle)}"${alpha()}/>`); },
    stroke() { emit(`<path d="${path}" style="fill:none;stroke:${paint(props.strokeStyle)};stroke-width:${props.lineWidth}"${alpha()}/>`); },
    fillRect(x, y, w, h) { emit(`<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" style="fill:${paint(props.fillStyle)}"${alpha()}/>`); },
    strokeRect(x, y, w, h) { emit(`<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" style="fill:none;stroke:${paint(props.strokeStyle)};stroke-width:${props.lineWidth}"${alpha()}/>`); },
    drawImage(img, x, y, w, h) { emit(`<image href="${esc(img.href)}" x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" preserveAspectRatio="none"${alpha()}/>`); },
    fillText(text, x, y) {
      const anchor = { center: "middle", right: "end", end: "end" }[props.textAlign] || "start";
      const base = props.textBaseline === "middle" ? ' dominant-baseline="central"' : "";
      const ls = parseFloat(props.letterSpacing) ? `;letter-spacing:${props.letterSpacing}` : "";
      emit(`<text x="${num(x)}" y="${num(y)}" text-anchor="${anchor}"${base} style="font:${esc(props.font)};fill:${paint(props.fillStyle)}${ls}"${alpha()}>${esc(text)}</text>`);
    },
    toSvg() {
      if (stack.length !== 1) throw new Error("svg-canvas: save/restore が対応していません");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<defs>${defs.map((d) => d.toSvg()).join("")}</defs>\n${render(root)}\n</svg>\n`;
    },
  };
  // プロパティ代入(ctx.fillStyle = ...)を props に保存する
  return new Proxy(ctx, {
    get: (t, k) => (k in t ? t[k] : props[k]),
    set: (t, k, v) => { if (k in props) { props[k] = v; return true; } return false; },
    has: (t, k) => k in t || k in props, // share.js の "letterSpacing" in ctx 判定用
  });
}

module.exports = { createSvgCanvas, textWidth };
