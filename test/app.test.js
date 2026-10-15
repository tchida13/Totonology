// app.js のスモークテスト。外部依存なしの最小スタブ DOM 上で画面遷移を検証する
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const SRC = ["data.js", "score.js", "app.js"].map(read);

// 新しいスタブ環境を作り、app.js を読み込んで返す。storage は引き継げる
function boot({ hash = "", search = "", storage = {}, storageBroken = false } = {}) {
  const env = { html: "", storage, listeners: {}, urls: [], timers: [] };
  const btns = [2, 1, 0, -1, -2].map((v) => ({ dataset: { v: String(v) }, click() { this.onclick(); } }));
  const el = {}; // id -> 要素スタブ
  const app = {
    set innerHTML(v) { env.html = v; for (const k of Object.keys(el)) delete el[k]; },
    querySelectorAll: (s) => (s === ".opt" && /class="opt/.test(env.html) ? btns : []),
    querySelector: () => null,
  };
  env.location = { hash, pathname: "/", search };
  const g = {
    window: null,
    location: env.location,
    history: { replaceState: (_s, _t, url) => { env.urls.push(url); if (typeof url === "string") env.location.hash = url.startsWith("#") ? url : ""; } },
    sessionStorage: storageBroken
      ? { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } }
      : { getItem: (k) => storage[k] ?? null, setItem: (k, v) => (storage[k] = v), removeItem: (k) => delete storage[k] },
    document: {
      getElementById: (id) => (id === "app" ? app : (el[id] = el[id] || { innerHTML: "ORIG", click() { this.onclick(); } })),
      addEventListener: (t, f) => (env.listeners[t] = f),
    },
    confirm: () => env.confirmAnswer,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    setTimeout: (fn) => { const t = { fn: () => { if (!t.off) fn(); } }; env.timers.push(t); return t; },
    clearTimeout: (t) => { if (t) t.off = true; },
    scrollTo() {},
  };
  g.window = { ...g, QUESTIONS: undefined, addEventListener: (t, f) => (env.listeners[t] = f), scrollTo() {} };
  // data.js/score.js は window / globalThis に定義するため、関数内で window を差し替えて評価する
  const run = new Function(...Object.keys(g), SRC.join("\n"));
  run(...Object.values(g));
  env.btns = btns;
  env.el = el;
  env.key = (key, extra = {}) => env.listeners.keydown({ key, ...extra });
  return env;
}

test("開始 → キー回答 → 全問回答で結果が表示される", () => {
  const env = boot();
  assert.match(env.html, /診断をはじめる/);
  env.el.go.click();
  assert.match(env.html, /Q1 \//);
  for (let i = 0; i < 24; i++) env.key("1");
  assert.match(env.html, /強み/);
  assert.match(env.location.hash, /^#[HS][WA][OT][RF]-[0-4]{24}$/);
});

test("キーの長押し(repeat)と修飾キー付きは無視される", () => {
  const env = boot();
  env.el.go.click();
  env.key("1", { repeat: true });
  env.key("1", { metaKey: true });
  assert.match(env.html, /Q1 \//);
  env.key("1");
  assert.match(env.html, /Q2 \//);
});

test("リロードすると途中から再開し、完了で保存が消える", () => {
  const first = boot();
  first.el.go.click();
  first.key("1");
  first.key("2");
  const second = boot({ storage: first.storage });
  assert.match(second.html, /Q3 \//);
  for (let i = 2; i < 24; i++) second.key("1");
  assert.match(second.html, /強み/);
  assert.equal(second.storage["totonology:progress"], undefined);
});

test("壊れた保存データは無視してトップから始める", () => {
  const env = boot({ storage: { "totonology:progress": '{"a":[1,2],"p":1}' } });
  assert.match(env.html, /診断をはじめる/);
});

test("sessionStorage が使えなくても回答できる", () => {
  const env = boot({ storageBroken: true });
  env.el.go.click();
  env.key("3");
  assert.match(env.html, /Q2 \//);
});

test("結果ハッシュから結果を復元し、hashchange に追従する", () => {
  const done = boot();
  done.el.go.click();
  for (let i = 0; i < 24; i++) done.key("1");
  const hash = done.location.hash;

  const env = boot({ hash });
  assert.match(env.html, /強み/);

  env.location.hash = "#invalid";
  env.listeners.hashchange();
  assert.match(env.html, /診断をはじめる/);

  env.location.hash = hash;
  env.listeners.hashchange();
  assert.match(env.html, /強み/);
});

test("戻る操作の位置が保存され、リロードで戻った位置から再開する", () => {
  const first = boot();
  first.el.go.click();
  first.key("1");
  first.key("1");
  first.el.back.click();
  assert.match(first.html, /Q2 \//);
  const second = boot({ storage: first.storage });
  assert.match(second.html, /Q2 \//);
});

test("もう一度診断するでクエリ文字列を保持する", () => {
  const env = boot({ search: "?utm_source=x" });
  env.el.go.click();
  for (let i = 0; i < 24; i++) env.key("1");
  assert.match(env.urls.at(-1), /^#/); // 結果表示でハッシュが付く
  env.el.again.click();
  assert.equal(env.urls.at(-1), "/?utm_source=x");
});

test("コピーボタンは連打しても元の表示に戻る", async () => {
  const env = boot();
  env.el.go.click();
  for (let i = 0; i < 24; i++) env.key("1");
  const settle = () => new Promise((r) => setImmediate(r)); // clipboard の Promise を解決させる
  env.el.copy.click();
  await settle();
  env.el.copy.click(); // 「コピーしました」表示中に再度押す
  await settle();
  assert.match(env.el.copy.innerHTML, /コピーしました/);
  env.timers.forEach((t) => t.fn()); // 残っているタイマーを全部発火
  assert.equal(env.el.copy.innerHTML, "ORIG");
});

test("回答中のロゴは確認してからトップへ戻る", () => {
  const env = boot();
  env.el.go.click();
  env.key("1");
  let prevented = 0;
  const click = () => env.listeners.click({ target: { closest: () => ({}) }, preventDefault: () => prevented++ });
  env.confirmAnswer = false;
  click();
  assert.match(env.html, /Q2 \//);
  assert.ok(env.storage["totonology:progress"]);
  env.confirmAnswer = true;
  click();
  assert.match(env.html, /診断をはじめる/);
  assert.equal(env.storage["totonology:progress"], undefined);
  assert.equal(prevented, 2);
});

test("16タイプすべてで結果ハッシュから該当キャラ付きの結果を復元できる", () => {
  const Score = require("../js/score.js");
  globalThis.window = globalThis;
  require("../js/data.js");
  const { QUESTIONS: Q, AXES } = window;
  const codes = AXES.reduce((cs, ax) => cs.flatMap((c) => [c + ax.first.code, c + ax.second.code]), [""]);
  assert.equal(codes.length, 16);
  codes.forEach((code) => {
    // 各軸で目的の側に +2 / -2 を振る (first 側が正)
    const ans = Q.map((q) => {
      const ax = AXES.find((a) => a.id === q.axis), idx = AXES.indexOf(ax);
      return (code[idx] === ax.first.code ? 2 : -2) * q.dir;
    });
    assert.equal(Score.codeOf(Score.scores(ans, Q, AXES)), code);
    const env = boot({ hash: "#" + code + "-" + ans.map((v) => v + 2).join("") });
    assert.match(env.html, new RegExp(`characters/${code}\\.svg`), code);
    assert.match(env.html, /強み/, code);
  });
});
