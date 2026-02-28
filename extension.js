// Window Snapper — GNOME Shell Extension (GNOME 45+, ESM style)
//
// Drag a window to any screen edge to snap it:
//
//   LEFT edge  (vertical position controls width):
//     Top third    → left ⅓
//     Middle third → left ½
//     Bottom third → left ⅔
//
//   RIGHT edge  (mirror of left):
//     Top third    → right ⅓
//     Middle third → right ½
//     Bottom third → right ⅔
//
//   TOP edge  (horizontal position controls which quarter/half):
//     Left third   → top-left quarter
//     Center third → top half  (full width)
//     Right third  → top-right quarter
//
//   BOTTOM edge  (same logic):
//     Left third   → bottom-left quarter
//     Center third → bottom half  (full width)
//     Right third  → bottom-right quarter
//
// Coloured indicator panels appear on all four edges during any window drag.
// A blue preview overlay shows exactly where the window will land.

import Meta from 'gi://Meta';
import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const EDGE_WIDTH       = 60;  // px from left/right screen edges
const TOP_BOT_HEIGHT   = 30;  // px from top/bottom work-area edges
const POLL_INTERVAL_MS = 50;

// Panel colours
const COL_THIRD       = 'rgba( 74, 144, 255, 0.85)';   // blue
const COL_HALF        = 'rgba(255, 112,  67, 0.85)';   // orange
const COL_TWO_THIRDS  = 'rgba(102, 187, 106, 0.85)';   // green
const COL_TOP         = 'rgba(171,  71, 188, 0.85)';   // purple
const COL_BOTTOM      = 'rgba(  0, 188, 212, 0.85)';   // teal
const COL_PREVIEW_BG  = 'rgba( 74, 144, 255, 0.18)';
const COL_PREVIEW_BD  = 'rgba( 74, 144, 255, 0.90)';

export default class WindowSnapperExtension extends Extension {
    enable() {
        this._edgePanelActors = [];
        this._previewActors   = [];
        this._activeZoneId    = null;
        this._pollTimer       = null;
        this._draggingWindow  = null;

        this._grabBeginId = global.display.connect(
            'grab-op-begin', this._onGrabBegin.bind(this));
        this._grabEndId = global.display.connect(
            'grab-op-end', this._onGrabEnd.bind(this));
    }

    disable() {
        if (this._grabBeginId) { global.display.disconnect(this._grabBeginId); this._grabBeginId = null; }
        if (this._grabEndId)   { global.display.disconnect(this._grabEndId);   this._grabEndId   = null; }
        this._stopPolling();
        this._clearAll();
    }

    // ─── Drag events ──────────────────────────────────────────────────────

    _onGrabBegin(_display, window, grabOp) {
        if (grabOp !== Meta.GrabOp.MOVING || !window) return;
        this._draggingWindow = window;
        this._showEdgePanels();
        this._startPolling();
    }

    _onGrabEnd(_display, _window, grabOp) {
        if (grabOp !== Meta.GrabOp.MOVING) return;

        this._stopPolling();
        const zoneId = this._activeZoneId;
        const win    = this._draggingWindow;

        this._clearAll();
        this._activeZoneId   = null;
        this._draggingWindow = null;

        if (zoneId && win) {
            // Short delay so Mutter finishes its own drag handling first
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                this._applySnap(win, zoneId);
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    // ─── Cursor polling ───────────────────────────────────────────────────

    _startPolling() {
        this._pollTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_INTERVAL_MS, () => {
            this._pollCursor();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopPolling() {
        if (this._pollTimer !== null) {
            GLib.Source.remove(this._pollTimer);
            this._pollTimer = null;
        }
    }

    _pollCursor() {
        const [cx, cy] = global.get_pointer();
        const zoneId   = this._detectZone(cx, cy);

        if (zoneId !== this._activeZoneId) {
            this._activeZoneId = zoneId;
            this._clearPreview();
            if (zoneId) this._showPreview(zoneId, cx, cy);
        }
    }

    // ─── Zone detection ───────────────────────────────────────────────────

    _getMonitorForCursor(cx, cy) {
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const mon = Main.layoutManager.monitors[i];
            if (cx >= mon.x && cx < mon.x + mon.width &&
                cy >= mon.y && cy < mon.y + mon.height)
                return { monitor: mon, index: i };
        }
        return { monitor: Main.layoutManager.primaryMonitor, index: Main.layoutManager.primaryIndex };
    }

    _detectZone(cx, cy) {
        const { monitor, index } = this._getMonitorForCursor(cx, cy);
        const work = Main.layoutManager.getWorkAreaForMonitor(index);

        const distLeft   = cx - monitor.x;
        const distRight  = (monitor.x + monitor.width)  - cx;
        const distTop    = cy - work.y;
        const distBottom = (work.y + work.height) - cy;

        const inLeft   = distLeft   < EDGE_WIDTH;
        const inRight  = distRight  < EDGE_WIDTH;
        const inTop    = distTop    >= 0 && distTop    < TOP_BOT_HEIGHT;
        const inBottom = distBottom >= 0 && distBottom < TOP_BOT_HEIGHT;

        if (!inLeft && !inRight && !inTop && !inBottom) return null;

        // Snap to the nearest activated edge
        const candidates = [];
        if (inLeft)   candidates.push({ edge: 'left',   dist: distLeft   });
        if (inRight)  candidates.push({ edge: 'right',  dist: distRight  });
        if (inTop)    candidates.push({ edge: 'top',    dist: distTop    });
        if (inBottom) candidates.push({ edge: 'bottom', dist: distBottom });
        candidates.sort((a, b) => a.dist - b.dist);
        const edge = candidates[0].edge;

        const yFrac = (cy - work.y) / work.height;
        const xFrac = (cx - work.x) / work.width;

        switch (edge) {
            case 'left':
                if (yFrac < 0 || yFrac > 1) return null;
                if (yFrac < 1 / 3) return 'left-third';
                if (yFrac < 2 / 3) return 'left-half';
                return 'left-two-thirds';

            case 'right':
                if (yFrac < 0 || yFrac > 1) return null;
                if (yFrac < 1 / 3) return 'right-third';
                if (yFrac < 2 / 3) return 'right-half';
                return 'right-two-thirds';

            case 'top':
                if (xFrac < 0 || xFrac > 1) return null;
                if (xFrac < 1 / 3) return 'top-left';
                if (xFrac < 2 / 3) return 'top-center';
                return 'top-right';

            case 'bottom':
                if (xFrac < 0 || xFrac > 1) return null;
                if (xFrac < 1 / 3) return 'bottom-left';
                if (xFrac < 2 / 3) return 'bottom-center';
                return 'bottom-right';
        }
        return null;
    }

    _getZoneRect(zoneId, cx, cy) {
        const { index } = this._getMonitorForCursor(cx ?? 0, cy ?? 0);
        const work = Main.layoutManager.getWorkAreaForMonitor(
            index ?? Main.layoutManager.primaryIndex);
        const x = work.x, y = work.y, w = work.width, h = work.height;
        const hw = Math.round(w / 2), hh = Math.round(h / 2);

        switch (zoneId) {
            // Left edge
            case 'left-third':       return { x, y, w: Math.round(w / 3), h };
            case 'left-half':        return { x, y, w: hw, h };
            case 'left-two-thirds':  return { x, y, w: Math.round(w * 2 / 3), h };
            // Right edge
            case 'right-third':      return { x: x + Math.round(w * 2 / 3), y, w: Math.round(w / 3), h };
            case 'right-half':       return { x: x + hw, y, w: hw, h };
            case 'right-two-thirds': return { x: x + Math.round(w / 3), y, w: Math.round(w * 2 / 3), h };
            // Top edge
            case 'top-left':         return { x, y, w: hw, h: hh };
            case 'top-center':       return { x, y, w, h: hh };
            case 'top-right':        return { x: x + hw, y, w: hw, h: hh };
            // Bottom edge
            case 'bottom-left':      return { x, y: y + hh, w: hw, h: hh };
            case 'bottom-center':    return { x, y: y + hh, w, h: hh };
            case 'bottom-right':     return { x: x + hw, y: y + hh, w: hw, h: hh };
            default:                 return null;
        }
    }

    // ─── Edge panel indicators ────────────────────────────────────────────

    _showEdgePanels() {
        const monitor = Main.layoutManager.primaryMonitor;
        const work    = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);

        this._buildLeftRightPanels(monitor, work);
        this._buildTopBottomPanels(work);
    }

    _buildLeftRightPanels(monitor, work) {
        const panelW  = 52;
        const thirdH  = Math.floor(work.height / 3);
        const labels  = ['⅓', '½', '⅔'];
        const colors  = [COL_THIRD, COL_HALF, COL_TWO_THIRDS];

        for (const side of ['left', 'right']) {
            const isLeft = side === 'left';
            const panelX = isLeft ? monitor.x : monitor.x + monitor.width - panelW;
            const radius = isLeft ? '0 10px 10px 0' : '10px 0 0 10px';

            for (let i = 0; i < 3; i++) {
                const cellY = work.y + i * thirdH;
                const cellH = i === 2 ? work.height - 2 * thirdH : thirdH;
                const gap   = 3;

                const bg = new St.Widget({
                    style: `background-color: rgba(15,15,25,0.82);
                            border-radius: ${radius};
                            border: 1px solid ${colors[i]};`,
                    reactive: false,
                });
                bg.set_position(panelX, cellY + gap);
                bg.set_size(panelW, cellH - gap * 2);

                const lbl = new St.Label({
                    text: labels[i],
                    style: `color: ${colors[i]}; font-size: 20px; font-weight: bold;`,
                    reactive: false,
                });
                lbl.set_position(
                    panelX + Math.floor((panelW - 22) / 2),
                    cellY + gap + Math.floor((cellH - gap * 2) / 2) - 13
                );

                Main.layoutManager.uiGroup.add_child(bg);
                Main.layoutManager.uiGroup.add_child(lbl);
                this._edgePanelActors.push(bg, lbl);
            }
        }
    }

    _buildTopBottomPanels(work) {
        const panelH = 44;
        const thirdW = Math.floor(work.width / 3);

        const rows = [
            {
                edge:   'top',
                panelY: work.y,
                radius: '0 0 10px 10px',
                color:  COL_TOP,
                labels: ['↖', '▲', '↗'],
            },
            {
                edge:   'bottom',
                panelY: work.y + work.height - panelH,
                radius: '10px 10px 0 0',
                color:  COL_BOTTOM,
                labels: ['↙', '▼', '↘'],
            },
        ];

        for (const row of rows) {
            for (let i = 0; i < 3; i++) {
                const cellX = work.x + i * thirdW;
                const cellW = i === 2 ? work.width - 2 * thirdW : thirdW;
                const gap   = 3;

                const bg = new St.Widget({
                    style: `background-color: rgba(15,15,25,0.82);
                            border-radius: ${row.radius};
                            border: 1px solid ${row.color};`,
                    reactive: false,
                });
                bg.set_position(cellX + gap, row.panelY);
                bg.set_size(cellW - gap * 2, panelH);

                const lbl = new St.Label({
                    text:  row.labels[i],
                    style: `color: ${row.color}; font-size: 20px; font-weight: bold;`,
                    reactive: false,
                });
                lbl.set_position(
                    cellX + gap + Math.floor((cellW - gap * 2) / 2) - 11,
                    row.panelY + Math.floor(panelH / 2) - 13
                );

                Main.layoutManager.uiGroup.add_child(bg);
                Main.layoutManager.uiGroup.add_child(lbl);
                this._edgePanelActors.push(bg, lbl);
            }
        }
    }

    // ─── Snap preview ─────────────────────────────────────────────────────

    _showPreview(zoneId, cx, cy) {
        const rect = this._getZoneRect(zoneId, cx, cy);
        if (!rect) return;

        const PAD     = 6;
        const preview = new St.Widget({
            style: `background-color: ${COL_PREVIEW_BG};
                    border: 2px solid ${COL_PREVIEW_BD};
                    border-radius: 10px;`,
            reactive: false,
        });
        preview.set_position(rect.x + PAD, rect.y + PAD);
        preview.set_size(rect.w - PAD * 2, rect.h - PAD * 2);

        Main.layoutManager.uiGroup.add_child(preview);
        this._previewActors.push(preview);
    }

    _clearPreview() {
        for (const a of this._previewActors) a.destroy();
        this._previewActors = [];
    }

    _clearAll() {
        for (const a of this._edgePanelActors) a.destroy();
        this._edgePanelActors = [];
        this._clearPreview();
    }

    // ─── Apply snap ───────────────────────────────────────────────────────

    _applySnap(window, zoneId) {
        if (!window || !window.get_compositor_private()) return;

        if (window.get_maximized())
            window.unmaximize(Meta.MaximizeFlags.BOTH);

        const [cx, cy] = global.get_pointer();
        const rect = this._getZoneRect(zoneId, cx, cy);
        if (!rect) return;

        window.move_resize_frame(false, rect.x, rect.y, rect.w, rect.h);
    }
}
