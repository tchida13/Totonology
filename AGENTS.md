# AGENTS.md

Totonology 開発における AI エージェント・人間共通の作業ルール。

## プロジェクト概要

サウナ愛好者向けの16タイプ性格診断アプリ。ビルド不要の静的サイト（HTML / CSS / 素の JavaScript）。
詳細は [README.md](README.md) を参照。

| ファイル | 役割 |
|---|---|
| `js/data.js` | 軸・質問・16タイプの定義（文言の編集はここ） |
| `js/score.js` | スコア計算・タイプ判定（DOM非依存。ブラウザ/Node両対応） |
| `js/app.js` | 画面遷移・描画 |
| `test/` | `node --test` で実行するテスト（外部依存なし） |
| `style.css` | スタイル（ライトテーマ。演出は prefers-reduced-motion で停止） |
| `index.html` | エントリポイント |

## 開発の進め方（ISSUE駆動開発）

**すべての変更は Issue から始める。** Issue のない変更はマージしない。

1. Issue を作成する（`.github/ISSUE_TEMPLATE` のテンプレートを使用）
2. Issue 番号を含むブランチを `main` から切る
3. 実装し、Conventional Commits でコミットする
4. PR を作成し、本文に `Closes #<Issue番号>` を書く
5. CI が通ったら `main` に **Squash merge** する（Issue は自動クローズ）

小さな修正でも、まず Issue を立てる。Issue が曖昧なときは実装前に確認する。

## ブランチ戦略（GitFlow Light）

- `main` … 常にデプロイ可能な状態。push は GitHub Pages へ自動デプロイされる。**直接 push 禁止**
- `<type>/<issue番号>-<短い説明>` … 作業ブランチ。必ず `main` から切り、`main` へ PR する
- `develop` / `release/*` / `hotfix/*` は使わない

ブランチ名の `<type>` は下記 Conventional Commits の type と同じものを使う。

```
feature/12-add-result-share
fix/15-score-calculation
docs/20-update-readme
```

## コミット規約（Conventional Commits）

形式: `<type>(<scope>): <概要>`  ※ scope は省略可、概要は日本語可

| type | 用途 |
|---|---|
| `feat` | 機能追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | 動作に影響しない整形（空白・CSS の見た目調整は除く） |
| `refactor` | 振る舞いを変えないコード整理 |
| `perf` | パフォーマンス改善 |
| `test` | テストの追加・修正 |
| `ci` | CI/CD 設定の変更 |
| `chore` | 上記以外（依存・設定など） |

- 破壊的変更は `feat!:` のように `!` を付け、本文に `BREAKING CHANGE:` を書く
- 関連 Issue はフッターに `Refs #12` と書く（クローズは PR 側の `Closes #N` で行う）
- Squash merge 時の PR タイトルも Conventional Commits 形式にする

例:

```
feat(result): 結果をURLハッシュで共有できるようにする
fix(score): 同点時にタイプ判定が偏る問題を修正
```

## CI/CD

- `.github/workflows/ci.yml` … PR と `main` への push で実行。JS の構文チェック、`node --test`、`index.html` が参照するファイルの存在確認
- `.github/workflows/deploy.yml` … `main` への push で GitHub Pages にデプロイ

PR は CI が成功してからマージする。

## ローカルでの確認

```sh
python3 -m http.server   # http://localhost:8000
for f in js/*.js; do node --check "$f"; done
node --test   # テスト
```

## エージェント向け注意事項

- 変更は依頼された Issue の範囲に収める。範囲外の改善は新しい Issue として提案する
- `git push`、PR 作成、Issue 操作など外部に影響する操作は、依頼の範囲内で行う
- 依存パッケージやビルド工程を安易に追加しない（静的サイトのまま保つ。テストも Node 標準の `node --test` を使う）
- ロジックを変えたら `test/` にテストを追加・更新する
- 質問・タイプの文言は `js/data.js` のみで編集できる構造を維持する
