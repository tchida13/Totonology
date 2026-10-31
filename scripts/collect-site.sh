#!/bin/sh
# GitHub Pages に公開するファイルを $1 (省略時 _site) に集める。deploy.yml と ci.yml が共用する。
set -eu
out="${1:-_site}"
rm -rf "$out"
mkdir -p "$out"
cp index.html style.css robots.txt sitemap.xml favicon.svg favicon.ico apple-touch-icon.png "$out/"
cp -r js "$out/"
# タイプ別ページ(scripts/build-types.js の生成物)
cp -r types "$out/types"
# assets は丸ごと含める（新しい素材の追加漏れを防ぐ）。assets/images は元画像(管理対象外)なので除く
cp -r assets "$out/assets"
rm -rf "$out/assets/images"
