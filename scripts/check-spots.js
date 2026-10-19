#!/usr/bin/env node
// 施設データ(js/data.js の SPOTS)の公式サイトURLが開けるかを確認する。手動実行用(外部依存なし・CI には入れない)
//   node scripts/check-spots.js            … 全URLを確認
//   node scripts/check-spots.js --stale 12 … 最終確認日が12か月より古い施設も一覧する
// URLが開けても「その施設のサイトか」までは分からないので、新規追加時は目視でも確認すること
globalThis.window = globalThis;
require("../js/data.js");

const args = process.argv.slice(2);
const staleMonths = args.includes("--stale") ? Number(args[args.indexOf("--stale") + 1]) || 12 : 0;
const now = new Date();

async function check(url) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 (spot-checker)" } });
    return { ok: res.ok, status: res.status, final: res.url };
  } catch (e) {
    return { ok: false, status: String(e.cause?.code || e.name) };
  }
}

(async () => {
  let ng = 0;
  const entries = Object.entries(window.SPOTS);
  for (const [id, sp] of entries) {
    if (sp.url) {
      const r = await check(sp.url);
      if (!r.ok) ng++;
      console.log(`${r.ok ? "OK " : "NG "} ${String(r.status).padEnd(8)} ${id}  ${sp.url}${r.ok && r.final !== sp.url && r.final !== sp.url + "/" ? "  -> " + r.final : ""}`);
    }
    if (staleMonths) {
      const [y, m] = sp.checked.split("-").map(Number);
      const age = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
      if (age >= staleMonths) console.log(`古い ${age}か月 ${id} (最終確認 ${sp.checked})`);
    }
  }
  const withUrl = entries.filter(([, s]) => s.url).length;
  console.log(`\n施設 ${entries.length} 件 / 公式URLあり ${withUrl} 件 / 開けない ${ng} 件`);
  process.exit(ng ? 1 : 0);
})();
