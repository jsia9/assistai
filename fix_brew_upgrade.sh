#!/usr/bin/env bash
#
# fix_brew_upgrade.sh — Unblocks the two formulas that broke `brew upgrade`
# on Jamal's machine (6 May 2026).
#
# Errors observed:
#   Error: six has been disabled because it does not meet homebrew/core's
#          requirements for Python library formulae! It was disabled on 2025-10-16.
#   Error: mysql@5.7: undefined method 'plist_options' for class Formulary::...
#
# Why these happen:
#   • `six` — Homebrew now refuses to ship Python libraries as standalone formulas.
#     Anything that needs `six` should pull it in via pip in its own venv. The
#     `six` formula is a dead leftover from when something pulled it in years ago.
#   • `mysql@5.7` — Homebrew dropped the old `plist_options` DSL. The mysql@5.7
#     formula was never updated because MySQL 5.7 reached End of Life in Oct 2023.
#     You already have `mysql 9.6.0_2` queued in the upgrade list, so the @5.7
#     leftover is unused.
#
# What this script does:
#   1. Show you everything before changing anything.
#   2. Stop any running mysql@5.7 service.
#   3. Uninstall `six` and `mysql@5.7` (with --ignore-dependencies to bypass
#      formulas that listed them but no longer need them).
#   4. Resume `brew upgrade`.
#   5. `brew cleanup` to free disk space.
#
# Run from anywhere:
#   bash "/Users/papa/Documents/Business - EDS Solar/Claude Mali/assistai/fix_brew_upgrade.sh"
#
# Or step-by-step (recommended first time):
#   bash fix_brew_upgrade.sh --dry-run

set -u

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; fi

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    echo "▶ $*"
    eval "$*"
  fi
}

echo "═══════════════════════════════════════════════════════════════"
echo " Kamali / EDS Solar — brew upgrade fix"
echo " mode: $([[ $DRY_RUN -eq 1 ]] && echo DRY-RUN || echo APPLY)"
echo "═══════════════════════════════════════════════════════════════"
echo

# ─── 0. Diagnostic before changing anything ─────────────────────
echo "## Current state of problem packages"
brew list --versions six 2>/dev/null   || echo "  six: not installed (good)"
brew list --versions mysql@5.7 2>/dev/null || echo "  mysql@5.7: not installed"
echo
echo "Other mysql versions installed:"
brew list --versions | grep -i '^mysql' || echo "  (none)"
echo

# ─── 1. Anyone depending on `six`? ──────────────────────────────
echo "## Reverse dependencies for 'six' (will be orphaned, but fine)"
brew uses --installed six 2>/dev/null || true
echo
echo "## Reverse dependencies for 'mysql@5.7'"
brew uses --installed mysql@5.7 2>/dev/null || true
echo

# ─── 2. Stop mysql@5.7 service if it's running ──────────────────
if brew services list 2>/dev/null | grep -E '^mysql@5\.7\s+started' >/dev/null; then
  echo "⚠ mysql@5.7 service is running — stopping it first."
  run "brew services stop mysql@5.7"
else
  echo "✓ mysql@5.7 service is not running."
fi
echo

# ─── 3. Uninstall the broken/disabled formulas ──────────────────
if brew list --versions six >/dev/null 2>&1; then
  echo "## Uninstalling 'six' (disabled formula, replaced by pip)"
  run "brew uninstall --ignore-dependencies six"
fi

if brew list --versions mysql@5.7 >/dev/null 2>&1; then
  echo "## Uninstalling 'mysql@5.7' (broken formula, EOL October 2023)"
  echo "   ⚠  IF YOU STILL USE A LEGACY MYSQL 5.7 DATABASE,"
  echo "      back it up FIRST with:"
  echo "        mysqldump -u root -p --all-databases > ~/mysql57-backup-\$(date +%F).sql"
  echo "   The data files at /opt/homebrew/var/mysql@5.7/ are NOT deleted by uninstall."
  echo
  read -p "Press Return to continue, Ctrl-C to abort..."
  run "brew uninstall --ignore-dependencies --force mysql@5.7"
fi
echo

# ─── 4. Optional: silence the python@3.9 deprecation warning ────
echo "## (Info only) python@3.9 is deprecated upstream — will be disabled 15 Oct 2026."
echo "   You don't have to do anything today, but plan to migrate scripts pinned"
echo "   to python@3.9 → python@3.12 (or @3.13) before that date."
echo "   See what depends on it:"
brew uses --installed python@3.9 2>/dev/null || true
echo

# ─── 5. Resume the upgrade ─────────────────────────────────────
echo "## Resuming 'brew upgrade'"
run "brew update"
run "brew upgrade"
echo

# ─── 6. Cleanup ────────────────────────────────────────────────
echo "## Cleaning up old versions and download cache"
run "brew cleanup -s"
run "brew autoremove"
echo

echo "═══════════════════════════════════════════════════════════════"
echo " Done. Recommended sanity check:"
echo "   brew doctor"
echo "═══════════════════════════════════════════════════════════════"
