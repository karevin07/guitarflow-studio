#!/usr/bin/env bash
# Publish a version: push main to the public mirror, tag it, push the tag to both
# remotes and create the GitHub Release from docs/releases/<version>.md.
#
#   scripts/release.sh v0.2.0            # or: make release VERSION=v0.2.0
#   DRY_RUN=1 scripts/release.sh v0.2.0  # run every check, change nothing
set -euo pipefail

version="${1:-}"
dry_run="${DRY_RUN:-}"
private_remote=origin
public_remote="$(git config --get guitarflow.publicRemote || echo public)"
notes="docs/releases/$version.md"

fail() {
  echo "release: $*" >&2
  exit 1
}
step() {
  echo "==> $*"
}
run() {
  if [ -n "$dry_run" ]; then
    echo "    (dry run) $*"
  else
    "$@"
  fi
}

[[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "usage: make release VERSION=v1.2.3"
cd "$(git rev-parse --show-toplevel)"

step "Checking the working tree"
[ "$(git symbolic-ref --short HEAD 2>/dev/null)" = main ] || fail "check out main first"
[ -z "$(git status --porcelain --untracked-files=no)" ] || fail "commit or stash your changes first"
git ls-files --error-unmatch "$notes" >/dev/null 2>&1 || fail "write and commit $notes first"

step "Fetching $private_remote and $public_remote"
git fetch --quiet --tags "$private_remote"
git fetch --quiet "$public_remote"
[ "$(git rev-parse main)" = "$(git rev-parse "$private_remote/main")" ] \
  || fail "main and $private_remote/main differ; push or pull first"
git merge-base --is-ancestor "$public_remote/main" main \
  || fail "$public_remote/main has commits main lacks; pull them in first (docs/RELEASING.md)"
if git rev-parse -q --verify "refs/tags/$version" >/dev/null \
  || [ -n "$(git ls-remote --tags "$public_remote" "refs/tags/$version")" ]; then
  fail "$version already exists"
fi

public_url="$(git remote get-url "$public_remote")"
public_repo="$(printf '%s' "$public_url" | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##')"
command -v gh >/dev/null || fail "install the GitHub CLI (gh) first"
gh auth status >/dev/null 2>&1 || fail "run 'gh auth login' first"

echo "    $(git rev-list --count "$public_remote/main..main") new commit(s) for $public_repo"

# Push main first: the pre-push check runs here, before anything is tagged.
step "Pushing main to $public_remote"
run git push "$public_remote" main

step "Tagging $version"
run git tag -a "$version" -m "$version" main
run git push "$public_remote" "$version"
run git push "$private_remote" "$version"

step "Creating the GitHub Release on $public_repo"
run gh release create "$version" -R "$public_repo" --title "$version" --notes-file "$notes" --verify-tag

echo "Done: https://github.com/$public_repo/releases/tag/$version"
