#!/usr/bin/env bash
#
# fix_python_upgrade.sh — Migrate from python@3.9 (deprecated, disabled 2026-10-15)
# to python@3.13 (current stable Homebrew default).
#
# Strategy:
#   • Install python@3.13 alongside 3.9. Don't remove 3.9 yet — ansible /
#     ansible-lint / llvm currently depend on it. Once Homebrew rebuilds those
#     against 3.13 (it will, automatically, on next `brew upgrade`), 3.9
#     becomes safely removable.
#   • Make python3 → python@3.13 in your PATH for new shells.
#   • Reinstall pyenv shims so `pyenv install 3.13.x` works going forward.
#
# Run: bash fix_python_upgrade.sh           (apply)
#      bash fix_python_upgrade.sh --dry-run

set -u
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else echo "▶ $*"; eval "$*"; fi; }

echo "═══════════════════════════════════════════════════════════════"
echo " Python upgrade — python@3.9 → python@3.13"
echo " mode: $([[ $DRY -eq 1 ]] && echo DRY-RUN || echo APPLY)"
echo "═══════════════════════════════════════════════════════════════"

# 0. Inventory
echo "## Currently installed Pythons"
brew list --versions | grep -E '^python' || echo "  (none from brew)"
echo
echo "## Current python3 in PATH:"
which python3 && python3 --version
echo
echo "## What depends on python@3.9 (we won't remove until they migrate):"
brew uses --installed python@3.9 2>/dev/null || true
echo

# 1. Install python@3.13
echo "## Installing python@3.13"
run "brew install python@3.13"
echo

# 2. Link it as the default python3 (Intel Mac path; adjust if Apple Silicon: /opt/homebrew)
PYTHON_PREFIX=$(brew --prefix python@3.13 2>/dev/null || echo "/usr/local/opt/python@3.13")
echo "## Linking python@3.13 binaries"
run "brew link --overwrite python@3.13"
echo

# 3. Verify
echo "## After-install verification"
run "/usr/local/opt/python@3.13/bin/python3.13 --version"
run "python3 --version"
echo

# 4. Pyenv: refresh shims so existing pyenv users see 3.13
if command -v pyenv >/dev/null 2>&1; then
  echo "## Refreshing pyenv shims"
  run "pyenv rehash"
  echo "Available pyenv versions:"
  pyenv versions || true
  echo
  echo "If you want pyenv to manage 3.13 too, run:"
  echo "  pyenv install 3.13.0"
  echo "  pyenv global 3.13.0"
fi
echo

# 5. Pip-using packages — relink so they use 3.13 going forward
echo "## (Optional) Reinstall packages currently bound to 3.9"
echo "   ansible / ansible-lint will be re-linked automatically on the next"
echo "   'brew upgrade'. To force it now:"
echo "     brew reinstall ansible ansible-lint"
echo

# 6. Don't remove 3.9 yet — Homebrew will until 2026-10-15
echo "## Note on python@3.9"
echo "   It's deprecated but NOT disabled. Leave it installed until October 2026"
echo "   so existing virtualenvs and scripts pinned to 3.9 keep working."
echo "   When you're ready to remove it (e.g. after migrating any pinned scripts):"
echo "     brew uninstall --ignore-dependencies python@3.9"
echo

echo "═══════════════════════════════════════════════════════════════"
echo " Python migration complete."
echo " Recommended next:"
echo "   1. Open a NEW shell (PATH refresh)."
echo "   2. python3 --version  # should show 3.13.x"
echo "   3. Migrate any pinned-to-3.9 scripts: header #!/usr/bin/env python3.13"
echo "═══════════════════════════════════════════════════════════════"
