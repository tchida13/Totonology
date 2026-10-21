# Totonology

サウナ愛好者向けの16タイプ性格診断アプリ（16Personalities風）。

## 4つの軸

| 軸 | 一方 | 他方 |
|---|---|---|
| 熱の好み | H: 高温ガッツリ | S: 低温じっくり |
| クールダウン | W: 水風呂派 | A: 外気浴派 |
| 過ごし方 | O: ひとり | T: みんなで |
| スタイル | R: 計画・ルーティン | F: 気まま・直感 |

24問（5段階）の回答から4文字のコードを算出し、16タイプのいずれかを表示します。

## 使い方

ビルド不要。`index.html` をブラウザで開くか、`python3 -m http.server` で配信してください。
結果はURLハッシュに保存されるため、そのまま共有できます。

## 構成

- `js/data.js` … 軸・質問・16タイプの定義（文言の編集はここ）
- `js/score.js` … スコア計算・タイプ判定・おすすめ施設の選定（4軸の親和度から選ぶ）
- `js/share.js` … 結果のシェア用画像（canvas）の描画
- `js/app.js` … 画面遷移・描画
- `robots.txt` / `sitemap.xml` … 検索エンジン向け。URL は `js/app.js` の `SITE_URL` と揃える（`test/seo.test.js` が整合を検査）
- `test/` … テスト（`node --test`）
- `style.css` … スタイル（北欧テイストのライトテーマ）

## SEO / Search Console 登録（オーナー作業）

1. [Google Search Console](https://search.google.com/search-console) で「URLプレフィックス」として公開URLを追加する（独自ドメイン取得後は「ドメイン」で追加）。
2. 所有権を確認する（HTMLタグ方式なら `index.html` の `<head>` に meta を追加、または DNS TXT）。
3. 「サイトマップ」から `sitemap.xml` を送信する。
4. 「URL検査」でトップURLのインデックス登録をリクエストする。
5. 独自ドメインへ移行する際は `index.html`（canonical / og / JSON-LD）、`js/app.js` の `SITE_URL`、`robots.txt`、`sitemap.xml` のURLを置き換える。
