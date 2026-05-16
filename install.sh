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

if [ "$GNOME_VERSION" -lt 45 ]; then
    echo "Error: GNOME Shell $GNOME_VERSION is not supported (need 45 or newer)."
    exit 1
fi

# ── Install extension files ────────────────────────────────────────────────
mkdir -p "$EXT_DIR"

cp "$SCRIPT_DIR/extension.js" "$EXT_DIR/extension.js"
cp "$SCRIPT_DIR/prefs.js"     "$EXT_DIR/prefs.js"
cp "$SCRIPT_DIR/metadata.json" "$EXT_DIR/metadata.json"

# ── Compile GSettings schema ───────────────────────────────────────────────
if [ -d "$SCRIPT_DIR/schemas" ]; then
    mkdir -p "$EXT_DIR/schemas"
    cp "$SCRIPT_DIR/schemas/"*.gschema.xml "$EXT_DIR/schemas/"
    if command -v glib-compile-schemas &>/dev/null; then
        glib-compile-schemas "$EXT_DIR/schemas/"
    else
        echo "Warning: glib-compile-schemas not found; preferences UI will fail."
    fi
fi

# Patch shell-version to declare compatibility from 45 through the detected
# GNOME version. jq is preferred; fall back to a regex rewrite if absent.
versions_json=$(seq 45 "$GNOME_VERSION" | awk 'BEGIN{ORS=""} {printf "%s\"%s\"", (NR>1?",":""), $0}')
if command -v jq &>/dev/null; then
    tmp=$(mktemp)
    jq --argjson v "[$versions_json]" '."shell-version" = $v' \
        "$EXT_DIR/metadata.json" > "$tmp" && mv "$tmp" "$EXT_DIR/metadata.json"
else
    # Last-resort: rewrite the shell-version line. Brittle but jq-free.
    python3 -c "
import json, sys
p = sys.argv[1]
versions = sys.argv[2].split(',')
with open(p) as f: m = json.load(f)
m['shell-version'] = [v.strip().strip('\"') for v in versions]
with open(p,'w') as f: json.dump(m, f, indent=4); f.write('\n')
" "$EXT_DIR/metadata.json" "$versions_json"
fi

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
