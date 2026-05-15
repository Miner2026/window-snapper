#!/usr/bin/env bash
# install.sh — Window Snapper GNOME Extension installer
set -euo pipefail

EXT_UUID="window-snapper@local"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Window Snapper Installer ==="
echo ""

# ── Detect GNOME Shell version ─────────────────────────────────────────────
if ! command -v gnome-shell &>/dev/null; then
    echo "Error: gnome-shell not found. Is GNOME installed?"
    exit 1
fi

GNOME_VERSION=$(gnome-shell --version 2>/dev/null | grep -oP '\d+' | head -1 || echo "0")
echo "Detected GNOME Shell version: $GNOME_VERSION"

if [ "$GNOME_VERSION" -lt 42 ]; then
    echo "Error: GNOME Shell $GNOME_VERSION is not supported (need 42 or newer)."
    exit 1
fi

# ── Install extension files ────────────────────────────────────────────────
mkdir -p "$EXT_DIR"

if [ "$GNOME_VERSION" -ge 45 ]; then
    echo "Using ESM extension format (GNOME 45+)"
    cp "$SCRIPT_DIR/extension.js" "$EXT_DIR/extension.js"
    # Declare compatibility from 45 through the current detected version.
    versions=()
    for v in $(seq 45 "$GNOME_VERSION"); do versions+=("\"$v\""); done
    SHELL_VERSIONS=$(IFS=,; echo "${versions[*]}")
else
    echo "Using legacy extension format (GNOME 42–44)"
    cp "$SCRIPT_DIR/extension-legacy.js" "$EXT_DIR/extension.js"
    SHELL_VERSIONS='"42", "43", "44"'
fi

# ── Write metadata.json ────────────────────────────────────────────────────
cat > "$EXT_DIR/metadata.json" << EOF
{
    "name": "Window Snapper",
    "description": "Snap windows to thirds, halves, and two-thirds by dragging to screen edges",
    "uuid": "$EXT_UUID",
    "version": 1,
    "shell-version": [$SHELL_VERSIONS],
    "url": ""
}
EOF

echo "Extension files installed to: $EXT_DIR"
echo ""

# ── Enable the extension ───────────────────────────────────────────────────
if gnome-extensions enable "$EXT_UUID" 2>/dev/null; then
    echo "Extension enabled successfully."
else
    echo "Note: Could not auto-enable (this is normal before restarting GNOME Shell)."
    echo "Run this after restarting: gnome-extensions enable $EXT_UUID"
fi

# ── Detect display server ──────────────────────────────────────────────────
SESSION_TYPE="${XDG_SESSION_TYPE:-unknown}"
echo ""
echo "=== Next step: restart GNOME Shell ==="
echo ""
if [ "$SESSION_TYPE" = "x11" ]; then
    echo "  You are on X11."
    echo "  Press Alt+F2, type  r  and press Enter to restart GNOME Shell."
    echo "  (No need to log out!)"
else
    echo "  You are on Wayland (or session type is unknown)."
    echo "  Log out and log back in to activate the extension."
fi

echo ""
echo "=== How to use Window Snapper ==="
echo ""
echo "  Drag any window to the LEFT edge of the screen:"
echo "    Cursor in top third    → snap to LEFT ⅓  of screen"
echo "    Cursor in middle third → snap to LEFT ½  of screen"
echo "    Cursor in bottom third → snap to LEFT ⅔  of screen"
echo ""
echo "  Drag any window to the RIGHT edge of the screen:"
echo "    Cursor in top third    → snap to RIGHT ⅓  of screen"
echo "    Cursor in middle third → snap to RIGHT ½  of screen"
echo "    Cursor in bottom third → snap to RIGHT ⅔  of screen"
echo ""
echo "  Drag any window to the TOP edge:"
echo "    Left third   → top-left quarter"
echo "    Center third → center column (⅓ width, full height)"
echo "    Right third  → top-right quarter"
echo ""
echo "  Drag any window to the BOTTOM edge:"
echo "    Left third   → bottom-left quarter"
echo "    Center third → bottom half (full width)"
echo "    Right third  → bottom-right quarter"
echo ""
echo "  Hold SHIFT during the drag for a 2×3 grid (panels turn gold)."
echo ""
echo "  While dragging, coloured indicator panels appear on all four edges."
echo "  A blue preview shows exactly where the window will land."
echo ""
echo "=== To uninstall ==="
echo ""
echo "  gnome-extensions disable $EXT_UUID"
echo "  rm -rf \"$EXT_DIR\""
