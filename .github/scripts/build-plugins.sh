#!/usr/bin/env bash
# Builds every plugin under plugins/ and writes a plugin repository (index.json + pool/*.zip).
#
#   build-plugins.sh <out-dir> <public-url>
#
# <out-dir>    where index.json and pool/ are written, for example site/plugins
# <public-url> the URL <out-dir> is served from, for example https://user.github.io/repo/plugins
#
# Each zip holds manifest.json and the JS bundle (named by dist.script) at its root, the same
# layout the official plugin template packages. Only JS-only plugins are supported here.

set -euo pipefail

out="${1:?usage: build-plugins.sh <out-dir> <public-url>}"
url="${2:?usage: build-plugins.sh <out-dir> <public-url>}"
url="${url%/}"

root="$(pwd)"
out="$root/${out#"$root"/}"

bun install
bun --bun run build

rm -rf "$out"
mkdir -p "$out/pool"

count=0
for manifest in plugins/*/manifest.json; do
    [ -f "$manifest" ] || continue

    dir="$(dirname "$manifest")"
    id="$(jq -er '.id' "$manifest")"
    version="$(jq -er '.version' "$manifest")"
    script="$(jq -r '.dist.script // empty' "$manifest")"

    if [ -d "$dir/src/main" ] || [ "$(jq -r '.dist.android // empty' "$manifest")" != "" ]; then
        echo "::error::${dir} is a native plugin. This workflow only packages JS-only plugins."
        exit 1
    fi
    if [ -z "$script" ]; then
        echo "::error::${manifest} has no dist.script"
        exit 1
    fi
    if [ ! -s "$dir/build/js/index.js" ]; then
        echo "::error::${dir}/build/js/index.js is missing or empty. Did the build fail?"
        exit 1
    fi

    stage="$(mktemp -d)"
    cp "$manifest" "$stage/manifest.json"
    cp "$dir/build/js/index.js" "$stage/$script"
    if [ -d "$dir/assets" ]; then
        cp -r "$dir/assets" "$stage/assets"
    fi

    (cd "$stage" && zip -qrX "$out/pool/${id}@${version}.zip" .)
    rm -rf "$stage"

    echo "Packaged ${id}@${version}"
    count=$((count + 1))
done

if [ "$count" -eq 0 ]; then
    echo "::error::no plugins found under plugins/"
    exit 1
fi

bun --bun run generate-index \
    --dist "$out/pool" \
    --base-url "$url/pool" \
    --out "$out/index.json"
