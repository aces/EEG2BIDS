#!/usr/bin/env bash
# Freeze the EEG2BIDS Python backend into a self-contained bundle that the
# Electron app can spawn without uv or a Python interpreter. See
# docs/linux-packaging-design.md (issue #170).
#
# Output: dist/eeg2bids-backend/  (contains the eeg2bids-backend launcher and
# its bundled interpreter + libraries). This directory is gitignored and is
# consumed by the Electron packaging step as an unpacked resource.
set -euo pipefail

# Run from the repository root regardless of where the script is invoked.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Materialize the exact backend deps plus the build-only packaging group
# (PyInstaller) from the authoritative lockfile.
uv sync --frozen --group packaging

# --noconfirm: overwrite any previous dist/ output without prompting.
# Output is pinned to dist/ so the COLLECT name yields dist/eeg2bids-backend/.
uv run --frozen --group packaging pyinstaller \
    --noconfirm \
    --distpath "$REPO_ROOT/dist" \
    --workpath "$REPO_ROOT/dist/.pyinstaller-work" \
    "$REPO_ROOT/tools/eeg2bids-backend.spec"

echo
echo "Frozen backend: $REPO_ROOT/dist/eeg2bids-backend/eeg2bids-backend"
