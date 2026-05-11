#!/usr/bin/env bash
#
# post_install_fixes.sh — Mop-up after the brew/python/mysql/Vercel runs.
#
# Confirmed real issues from your last session:
#  • Local `npm run build` failed: `Module not found: 'react-is'`.
#    Cause: recharts 3.8.1 has react-is as a peer dep, not auto-installed.
#  • A stray `/Users/papa/package-lock.json` confuses Next.js Turbopack
#    workspace-root detection.
#  • `python3` in PATH still resolves to 3.9 because pyenv is set to "system"
#    and the system shim wins over the brew link.
#  • brew doctor reports broken symlinks (docker, ruby gems) — harmless but
#    noisy.
#  • Vercel deployment SUCCEEDED — the audit-log + tenant-isolation +
#    upload-limit fixes are LIVE on https://assistai-six.vercel.app.
#
# This script does ONLY the safe, scoped fixes. It does NOT try to muscle
# through the brew Tier 3 / Intel-Mac upgrade problem — that's a different
# conversation (see upgrades_report.md section 5).

set -u
cd "$(dirname "$0")"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else echo "▶ $*"; eval "$*"; fi; }

echo "═══════════════════════════════════════════════════════════════"
echo " Post-install fixes — Kamali / EDS Solar"
echo " mode: $([[ $DRY -eq 1 ]] && echo DRY-RUN || echo APPLY)"
echo "═══════════════════════════════════════════════════════════════"

# ── 1. Install missing recharts peer dep ────────────────────────
echo
echo "## 1) Installing missing 'react-is' (recharts peer dep)"
run "npm install react-is@^18.3.1 --save"

# ── 2. Remove stray /Users/papa/package-lock.json ──────────────
echo
echo "## 2) Stray lockfile in HOME confusing Turbopack"
if [[ -f /Users/papa/package-lock.json ]]; then
  echo "Found /Users/papa/package-lock.json"
  echo "Showing context (first 3 lines) so you can confirm it's not yours:"
  head -3 /Users/papa/package-lock.json
  echo
  read -p "Delete it? [y/N]: " a
  if [[ "$a" =~ ^[Yy]$ ]]; then
    run "rm /Users/papa/package-lock.json"
  else
    echo "Skipped. Alternative: add 'turbopack: { root: \"./\" }' to next.config.ts."
  fi
else
  echo "No stray lockfile in HOME. ✓"
fi

# ── 3. Fix python3 → 3.13 ──────────────────────────────────────
echo
echo "## 3) Make python3 default to 3.13"
echo "    Currently:"
which python3 && python3 --version
echo
echo "    Detected pyenv default = 'system' (your system python is 3.9)."
echo "    Two ways to fix; pick one:"
echo
echo "    Option A — make pyenv use brew's 3.13:"
echo "       pyenv install 3.13.13"
echo "       pyenv global 3.13.13"
echo
echo "    Option B — bypass pyenv when you want 3.13:"
echo "       alias py='/usr/local/opt/python@3.13/bin/python3.13'"
echo "       Add to ~/.zshrc"
echo
echo "    Option C — relink brew's python so pyenv 'system' picks 3.13"
echo "    (most invasive, can confuse pyenv users):"
echo "       brew unlink python@3.9 && brew link python@3.13"
echo
echo "    Recommended: Option A — pyenv global 3.13.13"
read -p "    Run Option A now? [y/N]: " a
if [[ "$a" =~ ^[Yy]$ ]]; then
  run "pyenv install -s 3.13.13"
  run "pyenv global 3.13.13"
  echo "Now open a NEW shell and run: python3 --version"
fi

# ── 4. Clear broken symlinks ────────────────────────────────────
echo
echo "## 4) Broken symlinks reported by brew doctor"
echo "    These are mostly leftovers from old gems and uninstalled formulae."
echo "    Safe to remove with brew cleanup."
run "brew cleanup 2>&1 | head -30"
# Specific known-broken Ruby gems
for path in \
  /usr/local/lib/ruby/gems/2.7.0/bin/bundle \
  /usr/local/lib/ruby/gems/2.7.0/bin/bundler \
  /usr/local/share/man/man1/brew-cask.1; do
  if [[ -L "$path" && ! -e "$path" ]]; then
    run "rm '$path'"
  fi
done

# ── 5. Fix docker cli-plugins permission ────────────────────────
echo
echo "## 5) Docker cli-plugins permissions"
if [[ -d /usr/local/lib/docker/cli-plugins ]]; then
  run "sudo chown -R \"\$(whoami)\":admin /usr/local/lib/docker"
fi

# ── 6. Re-run npm build to confirm fix ─────────────────────────
echo
echo "## 6) Confirm npm build now passes"
echo "    (Run from this directory.)"
run "npm run build 2>&1 | tail -15"

# ── 7. Reality check on brew Tier 3 ────────────────────────────
echo
echo "═══════════════════════════════════════════════════════════════"
echo " About 'brew upgrade' on this Mac"
echo "═══════════════════════════════════════════════════════════════"
echo
echo "Your brew prefix is /usr/local — that means Intel x86_64."
echo "Homebrew now considers this a Tier-3 (best-effort) configuration."
echo "Many recent bottles are Apple-Silicon-only, which is why your"
echo "'brew upgrade' downloaded only manifests, not actual binaries."
echo
echo "Realistic options:"
echo "  • Keep current versions of the 70 outdated formulae. They still"
echo "    work; they just don't get newer features."
echo "  • For specific tools you need fresh (e.g. curl, openssl, git),"
echo "    upgrade individually with --build-from-source:"
echo "       brew upgrade --build-from-source curl"
echo "  • If/when you move to Apple Silicon hardware, the new install"
echo "    at /opt/homebrew will Just Work."
echo
echo "What's actually critical for Kamali development *today*:"
echo "  ✅ node@20 (deprecated but works) — or upgrade to node@22"
echo "  ✅ git (current works)"
echo "  ✅ python@3.13 (just installed)"
echo "  ✅ mysql@8.4 (already installed; not used by Kamali anyway)"
echo "  ✅ postgresql@18 (only used to talk to Supabase; client tools fine)"
echo
echo "Done."
