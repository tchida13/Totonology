// app.js のスモークテスト。外部依存なしの最小スタブ DOM 上で画面遷移を検証する
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const SRC = ["data.js", "score.js", "app.js"].map(read);

// 新しいスタブ環境を作り、app.js を読み込んで返す。storage は引き継げる
function boot({ hash = "", storage = {}, storageBroken = false } = {}) {
  const env = { html: "", storage, listeners: {} };
  const btns = [2, 1, 0, -1, -2].map((v) => ({ dataset: { v: String(v) }, click() { this.onclick(); } }));
  const el = {}; // id -> 要素スタブ
  const app = {
    set innerHTML(v) { env.html = v; for (const k of Object.keys(el)) delete el[k]; },
    querySelectorAll: (s) => (s === ".opt" && /class="opt/.test(env.html) ? btns : []),
    querySelector: () => null,
  };
  env.location = { hash, pathname: "/" };
  const g = {
    window: null,
    location: env.location,
    history: { replaceState: (_s, _t, url) => { if (typeof url === "string") env.location.hash = url.startsWith("#") ? url : ""; } },
    sessionStorage: storageBroken
      ? { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } }
      : { getItem: (k) => storage[k] ?? null, setItem: (k, v) => (storage[k] = v), removeItem: (k) => delete storage[k] },
    document: {
      getElementById: (id) => (id === "app" ? app : (el[id] = el[id] || { click() { this.onclick(); } })),
      addEventListener: (t, f) => (env.listeners[t] = f),
    },
    navigator: {},
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
