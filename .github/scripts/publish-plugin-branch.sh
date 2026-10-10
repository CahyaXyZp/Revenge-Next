#!/usr/bin/env bash
# Publishes built plugin zips to the plugin-dist branch and regenerates index.json there.
#
#   publish-plugin-branch.sh <build-dir> <base-url>
#
# <build-dir>  output of build-plugins.sh (contains pool/*.zip)
# <base-url>   where the branch is served from, no trailing slash, for example
#              https://raw.githubusercontent.com/<owner>/<repo>/plugin-dist
#
# Environment:
#   PLUGIN_REMOTE  git remote to push to (required)
#   PLUGIN_BRANCH  branch holding the plugin repository (default: plugin-dist)
#
# The branch is the only record of what is published. A version already on the branch is never
# overwritten, so an installed plugin always matches the hash in index.json. Raise the version in
# manifest.json to release a change. The index is regenerated from every zip on the branch.

set -euo pipefail

build="${1:?usage: publish-plugin-branch.sh <build-dir> <base-url>}"
base="${2:?usage: publish-plugin-branch.sh <build-dir> <base-url>}"
base="${base%/}"
branch="${PLUGIN_BRANCH:-plugin-dist}"
remote="${PLUGIN_REMOTE:?set PLUGIN_REMOTE}"

work="$(mktemp -d)"

if git ls-remote --exit-code --heads "$remote" "$branch" > /dev/null 2>&1; then
    git clone --quiet --depth 1 --branch "$branch" "$remote" "$work"
else
    echo "Branch ${branch} does not exist yet. Creating it."
    git init --quiet "$work"
    git -C "$work" checkout --quiet --orphan "$branch"
    git -C "$work" remote add origin "$remote"
fi

mkdir -p "$work/pool"

added=0
shopt -s nullglob
for zip in "$build"/pool/*.zip; do
    name="$(basename "$zip")"
    if [ -e "$work/pool/$name" ]; then
        echo "Already published: ${name}. Raise the version in manifest.json to release changes."
        continue
    fi
    cp "$zip" "$work/pool/$name"
    echo "Adding ${name}"
    added=$((added + 1))
done

# generate-index reads repo.config.json from the working directory, so run this from the repo root.
bun --bun run generate-index \
    --dist "$work/pool" \
    --base-url "$base/pool" \
    --out "$work/index.json"

git -C "$work" add -A
if git -C "$work" diff --cached --quiet; then
    echo "Nothing to publish."
    exit 0
fi

git -C "$work" \
    -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet -m "Publish ${added} plugin release(s)"
git -C "$work" push --quiet origin "$branch"
echo "Published ${added} plugin release(s) to ${branch}."
