#!/usr/bin/env bash
# pre-push check for the public mirror. Git runs it with the remote name and URL as
# arguments and one "<local ref> <local sha> <remote ref> <remote sha>" line per ref on stdin.
# Pushes to any other remote pass straight through.
#
# Blocks commits that would publish:
#   - an author or committer address that is not a GitHub noreply address
#   - a line or commit message matching a deny pattern (built-in, plus the private
#     list in .git/info/public-push-deny, which is never tracked)
#   - env files, private keys or databases
set -euo pipefail

remote_name="${1:-}"
public_remote="$(git config --get guitarflow.publicRemote || echo public)"
[ "$remote_name" = "$public_remote" ] || exit 0

repo_root="$(git rev-parse --show-toplevel)"
# This script lists the patterns itself, so its own diff is not scanned.
self_path='scripts/check-public-push.sh'
private_list="$(git rev-parse --git-path info/public-push-deny)"
zero="0000000000000000000000000000000000000000"
# Personal noreply addresses, and GitHub itself for commits made in the web UI.
allowed_email='@users\.noreply\.github\.com$|^noreply@github\.com$'

# Credentials that must never be public, whatever the private list says.
builtin_patterns='GOCSPX-
-----BEGIN [A-Z ]*PRIVATE KEY-----
AIza[0-9A-Za-z_-]{35}
ghp_[0-9A-Za-z]{36}
github_pat_[0-9A-Za-z_]{40,}
django-insecure-'
# The development fallback key in settings.py and .env.example is public on purpose.
allowed_lines='django-insecure-dev-only-key-change-me-in-production'
forbidden_paths='(^|/)\.env($|\.)|\.pem$|\.key$|\.sqlite3$'
allowed_paths='\.example$'

patterns_file="$(mktemp)"
trap 'rm -f "$patterns_file"' EXIT
printf '%s\n' "$builtin_patterns" > "$patterns_file"
if [ -f "$private_list" ]; then
  grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' "$private_list" >> "$patterns_file" || true
else
  echo "check-public-push: $private_list not found; only the built-in patterns are checked." >&2
fi

problems=0
report() {
  echo "  $1" >&2
  problems=$((problems + 1))
}

while read -r local_ref local_sha remote_ref remote_sha; do
  [ "$local_sha" = "$zero" ] && continue  # deleting a branch publishes nothing
  if [ "$remote_sha" = "$zero" ]; then
    if [ -z "$(git for-each-ref --count=1 "refs/remotes/$remote_name")" ]; then
      echo "check-public-push: no refs for $remote_name yet; run 'git fetch $remote_name' so only new commits are checked." >&2
    fi
    range="$local_sha --not --remotes=$remote_name"
  else
    range="$remote_sha..$local_sha"
  fi

  # shellcheck disable=SC2086
  for commit in $(git rev-list $range); do
    short="$(git rev-parse --short "$commit")"

    for field in ae:author ce:committer; do
      email="$(git show -s --format="%${field%%:*}" "$commit")"
      if ! printf '%s' "$email" | grep -Eq "$allowed_email"; then
        report "$short: ${field#*:} address $email is not a GitHub noreply address"
      fi
    done

    added="$( { git show -s --format=%B "$commit"; git show --format= -p --no-color "$commit" -- . ":(exclude)$self_path" | grep '^+' | grep -v '^+++' || true; } \
      | grep -v -F "$allowed_lines" || true )"
    while IFS= read -r pattern; do
      [ -n "$pattern" ] || continue
      if printf '%s\n' "$added" | grep -Eiq -- "$pattern"; then
        report "$short: matches deny pattern \"$pattern\""
      fi
    done < "$patterns_file"

    while IFS= read -r path; do
      if printf '%s' "$path" | grep -Eq "$forbidden_paths" && ! printf '%s' "$path" | grep -Eq "$allowed_paths"; then
        report "$short: adds $path"
      fi
    done < <(git show --format= --name-only --diff-filter=AR "$commit")
  done

  if command -v gitleaks >/dev/null 2>&1; then
    # shellcheck disable=SC2086
    if ! (cd "$repo_root" && gitleaks git --no-banner --redact --log-opts="$range" >&2); then
      report "gitleaks found a possible secret in $local_ref"
    fi
  fi
done

if [ "$problems" -gt 0 ]; then
  echo "check-public-push: blocked the push to $remote_name ($problems problem(s) above). See docs/RELEASING.md." >&2
  exit 1
fi
