import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WindowSnapperPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });

        const edges = new Adw.PreferencesGroup({
            title: 'Edge sensitivity',
            description: 'How close to a monitor edge a window must be dragged before a snap zone activates.',
        });
        edges.add(this._spinRow(settings, 'edge-width',
            'Left/right edge width', 'pixels', 10, 300, 5));
        edges.add(this._spinRow(settings, 'top-bot-height',
            'Top/bottom edge height', 'pixels', 5, 200, 5));
        page.add(edges);

        const behaviour = new Adw.PreferencesGroup({
            title: 'Behaviour',
        });
        behaviour.add(this._spinRow(settings, 'snap-delay-ms',
            'Snap delay after drop', 'milliseconds', 0, 500, 5));
        behaviour.add(this._switchRow(settings, 'enable-grid-mode',
            'Hold Shift for 2×3 grid mode',
            'Disable if Shift+drag conflicts with another action.'));
        page.add(behaviour);

        window.add(page);
    }

    _spinRow(settings, key, title, suffix, min, max, step) {
        const row = new Adw.SpinRow({
            title,
            subtitle: suffix,
            adjustment: new Gtk.Adjustment({
                lower: min, upper: max, step_increment: step,
            }),
        });
        settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _switchRow(settings, key, title, subtitle) {
        const row = new Adw.SwitchRow({ title, subtitle });
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
}
