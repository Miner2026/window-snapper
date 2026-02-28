# Window Snapper

A GNOME Shell extension that adds **12 snap zones** to your Ubuntu desktop — drag any window to a screen edge to snap it to thirds, halves, or quarters.

---

## Snap zones

```
┌──────────────────────────────────────────────────────────────┐
│  [↖ top-left ¼]    [▲ top ½ — full width]    [↗ top-right ¼]│  ← TOP edge
├──┬───────────────────────────────────────────────────────┬───┤
│⅓ │                                                       │ ⅓ │  ← cursor top third
│  │                                                       │   │
├──┤                                                       ├───┤
│½ │                   drag a window here                  │ ½ │  ← cursor middle third
│  │                                                       │   │
├──┤                                                       ├───┤
│⅔ │                                                       │ ⅔ │  ← cursor bottom third
│  │                                                       │   │
├──┴───────────────────────────────────────────────────────┴───┤
│  [↙ bot-left ¼]    [▼ bottom ½ — full width]  [↘ bot-right ¼│  ← BOTTOM edge
└──────────────────────────────────────────────────────────────┘
  ↑ LEFT edge                                    RIGHT edge ↑
```

### Left edge — drag cursor to left side, release at vertical position:
| Cursor position | Result |
|---|---|
| Top third of screen | Left ⅓ (33% width, full height) |
| Middle third | Left ½ (50% width, full height) |
| Bottom third | Left ⅔ (66% width, full height) |

### Right edge — mirror of left:
| Cursor position | Result |
|---|---|
| Top third | Right ⅓ |
| Middle third | Right ½ |
| Bottom third | Right ⅔ |

### Top edge — drag cursor to top, release at horizontal position:
| Cursor position | Result |
|---|---|
| Left third | Top-left quarter (50% × 50%) |
| Center third | Top half (full width, 50% height) |
| Right third | Top-right quarter (50% × 50%) |

### Bottom edge — mirror of top:
| Cursor position | Result |
|---|---|
| Left third | Bottom-left quarter |
| Center third | Bottom half (full width) |
| Right third | Bottom-right quarter |

---

## Requirements

- **Ubuntu** (or any distro running GNOME Shell)
- **GNOME Shell 42 or newer**
  - Ubuntu 22.04 → GNOME 42
  - Ubuntu 23.10 → GNOME 45
  - Ubuntu 24.04 → GNOME 46

Check your version:
```bash
gnome-shell --version
```

---

## Installation

```bash
cd ~/window-snapper
bash install.sh
```

The script will:
1. Detect your GNOME Shell version and pick the right extension format
2. Copy the files to `~/.local/share/gnome-shell/extensions/window-snapper@local/`
3. Enable the extension

### Restart GNOME Shell to activate

**X11** (no logout needed):
> Press **Alt + F2**, type **`r`**, press **Enter**

**Wayland:**
> Log out and log back in

---

## Usage

1. **Click and hold** any window's title bar to start dragging
2. **Indicator panels** appear on all four screen edges showing available snap zones
3. **Drag toward an edge** — a blue preview overlay highlights where the window will land
4. **Release the mouse** — the window snaps into place

The vertical position on left/right edges controls the width.
The horizontal position on top/bottom edges controls the height.

---

## Snapping 3 windows side by side

To fill the screen with 3 equal columns:

1. Drag **window A** → left edge, **top third** → snaps to left ⅓
2. Drag **window B** → right edge, **top third** → snaps to right ⅓
3. Drag **window C** → left edge, **bottom third** → snaps to left ⅔, then manually resize from the right to fill the center

> **Tip:** A cleaner approach for the center window — snap it to left ⅔, then snap another to right ⅓. The center gap fills naturally if all three are sized to ⅓.

---

## Uninstall

```bash
gnome-extensions disable window-snapper@local
rm -rf ~/.local/share/gnome-shell/extensions/window-snapper@local
```

Then restart GNOME Shell (see above).

---

## Troubleshooting

**Extension doesn't appear after install**
> Make sure you restarted GNOME Shell. On Wayland this requires a full log out/in.

**Windows don't snap**
> Some windows (dialogs, system windows) have fixed sizes and can't be resized by extensions.

**Snap zones not showing up during drag**
> Verify the extension is enabled: `gnome-extensions list --enabled | grep window-snapper`

**Wrong GNOME version picked**
> Run `gnome-shell --version` and check the output. If it says 45 or higher, `extension.js` is used. If 42–44, `extension-legacy.js` is used.

**Re-run install after a GNOME update**
> Major GNOME updates may require reinstalling: `bash ~/window-snapper/install.sh`
