// app.js のスモークテスト。外部依存なしの最小スタブ DOM 上で画面遷移を検証する
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const SRC = ["data.js", "score.js", "app.js"].map(read);

// 新しいスタブ環境を作り、app.js を読み込んで返す。storage は引き継げる
function boot({ hash = "", search = "", reduce = false, ritual = false, share = false, storage = {}, storageBroken = false } = {}) {
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
    matchMedia: ritual ? () => ({ matches: reduce }) : undefined,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    setTimeout: (fn) => { const t = { fn: () => { if (!t.off) fn(); } }; env.timers.push(t); return t; },
    clearTimeout: (t) => { if (t) t.off = true; },
    scrollTo() {},
  };
  env.downloads = [];
  g.document.createElement = () => ({ click() { env.downloads.push(this); } });
  g.URL = { createObjectURL: () => "blob:test", revokeObjectURL() {} };
  g.window = { ...g, ShareImage: share ? { render: (spec) => (env.shareSpec = spec, share === "fail" ? Promise.reject(new Error("x")) : Promise.resolve(new Blob(["x"]))) } : undefined, QUESTIONS: undefined, addEventListener: (t, f) => (env.listeners[t] = f), scrollTo() {} };
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

test("質問画面の進捗は砂時計で、progressbar の値と札(1〜5)が付く", () => {
  const env = boot();
  env.el.go.click();
  assert.match(env.html, /role="progressbar"[^>]*aria-valuenow="0"[^>]*>\s*<svg class="hg"/);
  assert.equal((env.html.match(/class="opt/g) || []).length, 5);
  env.key("1");
  assert.match(env.html, /aria-valuenow="1"/);
  env.key("1");
  assert.match(env.html, /aria-valuenow="2"[^>]*>\s*<svg class="hg"[^>]*--p:0\.0416/); // 直前の進捗(1/24)から始め、描画後に更新して砂を落とす
});

// ため演出: matchMedia がある環境(=ブラウザ相当)でだけ流れる
function answerAll(env) { env.el.go.click(); for (let i = 0; i < 24; i++) env.key("1"); }
function tick(env) { env.timers.filter((t) => !t.done).slice(-1).forEach((t) => { t.done = true; t.fn(); }); }

test("ため演出: 最終回答後に演出が流れ、その間に結果URLは確定・保存は消えている", () => {
  const env = boot({ ritual: true });
  answerAll(env);
  assert.match(env.html, /class="ritual s0"/);
  assert.doesNotMatch(env.html, /強み/);
  assert.match(env.location.hash, /^#[HS][WA][OT][RF]-[0-4]{24}$/);
  assert.equal(env.storage["totonology:progress"], undefined);
  assert.match(env.html, /ロウリュ/);
});

test("ため演出: 4段を経て自動で結果が表示される", () => {
  const env = boot({ ritual: true });
  answerAll(env);
  for (let i = 0; i < 3; i++) { tick(env); assert.doesNotMatch(env.html, /強み/); }
  assert.equal(env.el["r-name"].textContent, "外気浴");
  tick(env);
  assert.match(env.html, /強み/);
});

test("ため演出: スキップ・Esc・タップで即結果になり、演出中の回答キーは無視される", () => {
  for (const skip of [(e) => e.el.skip.click(), (e) => e.key("Escape"), (e) => e.el.ritual.click()]) {
    const env = boot({ ritual: true });
    answerAll(env);
    env.key("1"); // 演出中の数字キーは何も起こさない
    assert.match(env.html, /class="ritual/);
    skip(env);
    assert.match(env.html, /強み/);
    // スキップ後にタイマーが残っていても二重描画しない
    env.timers.forEach((t) => t.fn());
    assert.match(env.html, /強み/);
  }
});

test("ため演出: 最後の回答クリックがバブリングしても即スキップされない", () => {
  const env = boot({ ritual: true });
  env.el.go.click();
  for (let i = 0; i < 23; i++) env.key("1");
  env.btns[0].click();
  env.listeners.click({ target: {} }); // 同じクリックが document まで届く
  assert.match(env.html, /class="ritual s0"/);
  assert.doesNotMatch(env.html, /強み/);
});

test("ため演出: 動きを減らす設定では演出なしで結果を出す", () => {
  const env = boot({ ritual: true, reduce: true });
  answerAll(env);
  assert.match(env.html, /強み/);
});

test("ため演出: 結果ハッシュからの復元では演出しない", () => {
  const done = boot();
  answerAll(done);
  const env = boot({ ritual: true, hash: done.location.hash });
  assert.match(env.html, /強み/);
  assert.doesNotMatch(env.html, /class="ritual/);
});

test("ため演出: 演出中にリロードしても結果が出る", () => {
  const first = boot({ ritual: true });
  answerAll(first);
  const second = boot({ ritual: true, hash: first.location.hash, storage: first.storage });
  assert.match(second.html, /強み/);
});

test("シェア画像: 結果に画像セクションが出て、生成後に保存できる(回答ハッシュは渡さない)", async () => {
  const env = boot({ share: true, hash: "#SAOR-" + "4".repeat(24) });
  assert.doesNotMatch(env.html, /id="share"[^>]*hidden/); // 領域は先に確保する(後から出てレイアウトがずれない)
  assert.match(env.html, /id="save-img" hidden/);
  await new Promise((r) => setImmediate(r));
  assert.equal(env.el["save-img"].hidden, false);
  assert.equal(env.el["share-img"].src, "blob:test");
  assert.equal(env.shareSpec.code, "SAOR");
  assert.ok(!JSON.stringify(env.shareSpec).includes("4444"));
  env.el["save-img"].click();
  assert.equal(env.downloads[0].download, "totonology-SAOR.png");
});

test("シェア画像: 生成に失敗しても結果表示は壊れず、セクションは隠れたまま", async () => {
  const env = boot({ share: "fail", hash: "#SAOR-" + "4".repeat(24) });
  await new Promise((r) => setImmediate(r));
  assert.match(env.html, /強み/);
  assert.equal(env.el.share.hidden, true);
});
