#!/bin/bash
# 打包上架用的 zip，只放擴充功能執行需要的檔案
# 用法：./package.sh  →  dist/url-query-editor-<version>.zip
set -euo pipefail

cd "$(dirname "$0")"

# 白名單：新增擴充功能會用到的檔案時記得加進來
FILES=(
  manifest.json
  popup.html
  popup.css
  popup.js
  rules.js
  background.js
  icon-16.png
  icon-48.png
  icon-128.png
)

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Missing file: $file" >&2
    exit 1
  fi
done

VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"
OUT="dist/header-override-$VERSION.zip"

mkdir -p dist
rm -f "$OUT"
# -X 不寫入 macOS 的額外屬性，避免 zip 裡出現 __MACOSX 之類的檔案
zip -q -X "$OUT" "${FILES[@]}"

echo "Created $OUT"
unzip -l "$OUT"
