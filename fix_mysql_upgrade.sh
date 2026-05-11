#!/usr/bin/env bash
#
# fix_mysql_upgrade.sh — Resolve the stale `mysql@5.7` reference that's
# halting `brew upgrade`, and decide what to do with mysql 8.0 → 9.6.
#
# Recap of the failure:
#   Error: No available formula with the name "mysql@5.7".
#          Did you mean mysql@8.4 or mysql@8.0?
# This happens AFTER we uninstalled mysql@5.7, which means a stale reference
# is sitting in: brew's pinned list, a Brewfile, leftover Cellar dir, or
# a `brew services` descriptor. Once cleared, `brew upgrade` proceeds.
#
# Kamali itself uses PostgreSQL (Supabase), not MySQL — so the safest path
# for *this machine* is probably to remove MySQL entirely if it's not used
# by another project. The script gives you both options.
#
# Run: bash fix_mysql_upgrade.sh
#      bash fix_mysql_upgrade.sh --dry-run

set -u
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else echo "▶ $*"; eval "$*"; fi; }
ask() { read -p "$1 [y/N]: " a; [[ "$a" =~ ^[Yy]$ ]]; }

echo "═══════════════════════════════════════════════════════════════"
echo " MySQL cleanup + upgrade"
echo " mode: $([[ $DRY -eq 1 ]] && echo DRY-RUN || echo APPLY)"
echo "═══════════════════════════════════════════════════════════════"

# ── 1. Hunt down stale mysql@5.7 references ────────────────────
echo "## Step 1 — Hunt stale mysql@5.7 references"
echo
echo "Cellar leftover directory:"
ls -la /usr/local/Cellar/mysql@5.7/ 2>/dev/null || ls -la /opt/homebrew/Cellar/mysql@5.7/ 2>/dev/null || echo "  (none) ✓"
echo
echo "Pinned formulas:"
brew list --pinned 2>/dev/null
echo
echo "brew services pointing at mysql@5.7:"
brew services list 2>/dev/null | grep mysql || echo "  (none)"
echo
echo "Brewfiles in HOME and current dir:"
[[ -f ~/Brewfile ]]    && grep -n "mysql" ~/Brewfile    || echo "  ~/Brewfile: not found / no mysql ref"
[[ -f ./Brewfile ]]    && grep -n "mysql" ./Brewfile    || echo "  ./Brewfile: not found / no mysql ref"
[[ -f ~/.Brewfile ]]   && grep -n "mysql" ~/.Brewfile   || echo "  ~/.Brewfile: not found"
echo
echo "Cache files referencing mysql@5.7:"
ls -la "$(brew --cache)" 2>/dev/null | grep -i 'mysql@5.7' || echo "  (none) ✓"
echo

# Force-remove any leftover Cellar dir
for prefix in /usr/local /opt/homebrew; do
  if [[ -d "$prefix/Cellar/mysql@5.7" ]]; then
    echo "## Removing leftover Cellar dir: $prefix/Cellar/mysql@5.7"
    run "sudo rm -rf $prefix/Cellar/mysql@5.7"
  fi
done

# Clean Homebrew's locks/caches
echo "## Refreshing brew state"
run "brew update --quiet"
run "brew cleanup -s 2>/dev/null || true"

# ── 2. Backup current mysql 8.0 data BEFORE doing anything ─────
DATA_PATH="/usr/local/var/mysql"
[[ ! -d "$DATA_PATH" ]] && DATA_PATH="/opt/homebrew/var/mysql"
echo
echo "## Step 2 — Backup mysql 8.0 data"
echo "Data dir: $DATA_PATH"
if [[ -d "$DATA_PATH" ]]; then
  TS=$(date +%Y%m%d_%H%M%S)
  BACKUP_DIR="$HOME/mysql-backup-${TS}"
  echo "Will copy data to: $BACKUP_DIR"
  if ask "Run mysqldump backup of all databases now (recommended)?"; then
    if pgrep -x mysqld >/dev/null; then
      mkdir -p "$BACKUP_DIR"
      run "mysqldump -u root -p --all-databases --routines --triggers > $BACKUP_DIR/all-databases.sql"
      run "cp $DATA_PATH/my.cnf $BACKUP_DIR/ 2>/dev/null || true"
      echo "✓ Backup at $BACKUP_DIR"
    else
      echo "mysqld not running — starting briefly for dump"
      run "brew services start mysql && sleep 5"
      mkdir -p "$BACKUP_DIR"
      run "mysqldump -u root -p --all-databases --routines --triggers > $BACKUP_DIR/all-databases.sql"
      run "brew services stop mysql"
    fi
  else
    echo "⏭  Skipping backup (you said no)."
  fi
else
  echo "No existing mysql data dir — nothing to back up."
fi

# ── 3. Decide: keep MySQL or remove it ─────────────────────────
echo
echo "## Step 3 — Choose path"
echo
echo "  A) UPGRADE  to mysql@8.4 (LTS, supported until April 2032)"
echo "             Safer than 9.x, only minor breaking changes from 8.0."
echo "  B) UPGRADE  to mysql 9.6 (current default)"
echo "             More features, but breaking changes (auth plugin, syntax)."
echo "  C) REMOVE   MySQL entirely"
echo "             Kamali uses PostgreSQL/Supabase — only pick this if no"
echo "             other project on this Mac needs MySQL."
echo "  D) SKIP     Leave MySQL untouched, just unblock brew upgrade"
echo
read -p "Choose A, B, C, or D: " CHOICE
CHOICE=$(echo "$CHOICE" | tr '[:lower:]' '[:upper:]')

case "$CHOICE" in
  A)
    echo "## Path A — Migrate to mysql@8.4 (LTS)"
    run "brew services stop mysql 2>/dev/null || true"
    run "brew uninstall --ignore-dependencies mysql"
    run "brew install mysql@8.4"
    run "brew link --force mysql@8.4"
    echo
    echo "Start the service:"
    echo "  brew services start mysql@8.4"
    echo "Then verify:"
    echo "  mysql --version    # should show 8.4.x"
    ;;
  B)
    echo "## Path B — Upgrade to mysql 9.6"
    run "brew services stop mysql 2>/dev/null || true"
    run "brew upgrade mysql"
    echo
    echo "⚠  9.x changed default auth plugin to caching_sha2_password."
    echo "   App connection strings may need updating."
    echo "   Start the service:"
    echo "     brew services start mysql"
    ;;
  C)
    echo "## Path C — Remove MySQL"
    if ask "ABSOLUTELY SURE? This deletes mysql 8.0 and 9.6 binaries."; then
      run "brew services stop mysql 2>/dev/null || true"
      run "brew uninstall --ignore-dependencies --force mysql"
      run "brew uninstall --ignore-dependencies --force mysql@8.0 2>/dev/null || true"
      echo
      echo "Data dir at $DATA_PATH is NOT deleted. Manual rm if you want:"
      echo "  rm -rf $DATA_PATH"
    fi
    ;;
  D)
    echo "## Path D — Skipping MySQL changes"
    ;;
  *)
    echo "Unknown choice. Skipping."
    ;;
esac

# ── 4. Resume the rest of brew upgrade ─────────────────────────
echo
echo "## Step 4 — Resume brew upgrade (without mysql blocker)"
run "brew upgrade --ignore-pinned"
echo

# ── 5. Fix the docker cli-plugins permission issue we saw ──────
echo "## Step 5 — Fix /usr/local/lib/docker/cli-plugins permissions"
if [[ -d /usr/local/lib/docker/cli-plugins ]]; then
  echo "Setting ownership so brew cleanup can manage it"
  run "sudo chown -R \"\$(whoami)\":admin /usr/local/lib/docker"
fi
echo

# ── 6. Final cleanup ───────────────────────────────────────────
echo "## Step 6 — Cleanup"
run "brew cleanup -s"
run "brew autoremove"
echo

echo "═══════════════════════════════════════════════════════════════"
echo " Done. Verify everything:"
echo "   brew doctor"
echo "   brew outdated     # should be empty or only show casks"
echo "═══════════════════════════════════════════════════════════════"
