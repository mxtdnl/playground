#!/usr/bin/env bash
# Enforces the isolation rules in CLAUDE.md. Run from anywhere.
set -u
cd "$(git rev-parse --show-toplevel)"
fail=0
err() { echo "FAIL: $*"; fail=1; }

allowed_root=" CLAUDE.md README.md .gitignore .github scripts _template "
projects=()

for entry in $(git ls-files -z | tr '\0' '\n' | cut -d/ -f1 | sort -u); do
  case "$allowed_root" in *" $entry "*) continue ;; esac
  if [ -d "$entry" ]; then
    projects+=("$entry")
    [[ "$entry" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || err "project folder '$entry' is not kebab-case"
    [ -f "$entry/README.md" ] || err "project '$entry' has no README.md"
    grep -q "(\s*$entry/\?\s*)" README.md || err "project '$entry' missing from root README index"
  else
    err "unexpected root file '$entry'"
  fi
done

for banned in shared common utils lib; do
  [ -e "$banned" ] && err "root folder '$banned/' is banned"
done

for f in package.json package-lock.json pnpm-workspace.yaml requirements.txt pyproject.toml Makefile; do
  [ -e "$f" ] && err "root-level manifest '$f' is not allowed"
done

for p in "${projects[@]}"; do
  for q in "${projects[@]}"; do
    [ "$p" = "$q" ] && continue
    hits=$(git grep -nI -e "\.\./$q\b" -- "$p" ':!*.md' ':!*.lock' 2>/dev/null)
    [ -n "$hits" ] && err "'$p' references '$q':"$'\n'"$hits"
  done
  find "$p" -type l -not -path '*/node_modules/*' | grep -q . && err "'$p' contains symlinks"
done

[ $fail -eq 0 ] && echo "OK: ${#projects[@]} project(s) pass boundary checks"
exit $fail
