import fs from 'node:fs';
import path from 'node:path';
import {
  AppSettings,
  BrowserId,
  CustomWebShortcut,
  ProfileCustomization,
} from '../shared/types.ts';
import {
  DEFAULT_GROUP_ICONS,
  DEFAULT_SETTINGS,
  getProfileGroups,
  getProfileKey,
} from '../shared/constants.ts';
export { DEFAULT_SETTINGS, getProfileKey, getProfileGroups };

export class SettingsManager {
  private settingsPath: string;
  private currentSettings: AppSettings;

  constructor(userDataDir: string) {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    this.settingsPath = path.join(userDataDir, 'app-settings.json');
    this.currentSettings = this.load();
  }

  public getSettingsPath(): string {
    return this.settingsPath;
  }

  public load(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        const loadedGroups = Array.isArray(parsed.customGroups)
          ? [...parsed.customGroups]
          : [...DEFAULT_SETTINGS.customGroups];

        // Ensure built-in "TikTok" group is added when upgrading from older settings
        let didMigrate = Boolean(parsed.migratedTikTokGroup);
        if (!didMigrate) {
          if (!loadedGroups.includes('TikTok')) {
            const fbIdx = loadedGroups.indexOf('Facebook');
            if (fbIdx !== -1) {
              loadedGroups.splice(fbIdx + 1, 0, 'TikTok');
            } else {
              loadedGroups.unshift('TikTok');
            }
          }
          didMigrate = true;
        }

        const mergedIcons: Record<string, string> = {
          ...DEFAULT_GROUP_ICONS,
          ...(parsed.groupIcons && typeof parsed.groupIcons === 'object'
            ? parsed.groupIcons
            : {}),
        };

        this.currentSettings = {
          startWithWindows: Boolean(
            parsed.startWithWindows ?? DEFAULT_SETTINGS.startWithWindows
          ),
          theme: parsed.theme || DEFAULT_SETTINGS.theme,
          language: parsed.language || DEFAULT_SETTINGS.language,
          customGroups: loadedGroups,
          groupIcons: mergedIcons,
          customShortcuts: Array.isArray(parsed.customShortcuts)
            ? parsed.customShortcuts
            : [],
          migratedTikTokGroup: didMigrate,
          profiles:
            parsed.profiles && typeof parsed.profiles === 'object'
              ? parsed.profiles
              : {},
        };
        return this.currentSettings;
      }
    } catch {
      // Fallback to default settings if corrupted or missing
    }
    this.currentSettings = {
      ...DEFAULT_SETTINGS,
      customGroups: [...DEFAULT_SETTINGS.customGroups],
      groupIcons: { ...DEFAULT_GROUP_ICONS },
      customShortcuts: [],
      migratedTikTokGroup: true,
      profiles: {},
    };
    this.save();
    return this.currentSettings;
  }

  public save(): AppSettings {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(this.currentSettings, null, 2),
        'utf8'
      );
    } catch {
      // Ignore write error if read-only
    }
    return this.currentSettings;
  }

  public getSettings(): AppSettings {
    return this.currentSettings;
  }

  public updateGeneralSettings(
    partial: Partial<
      Pick<
        AppSettings,
        | 'startWithWindows'
        | 'theme'
        | 'language'
        | 'customGroups'
        | 'groupIcons'
        | 'customShortcuts'
      >
    >
  ): AppSettings {
    if (typeof partial.startWithWindows === 'boolean') {
      this.currentSettings.startWithWindows = partial.startWithWindows;
    }
    if (partial.theme) {
      this.currentSettings.theme = partial.theme;
    }
    if (partial.language) {
      this.currentSettings.language = partial.language;
    }
    if (Array.isArray(partial.customGroups)) {
      this.currentSettings.customGroups = partial.customGroups;
    }
    if (partial.groupIcons && typeof partial.groupIcons === 'object') {
      this.currentSettings.groupIcons = {
        ...this.currentSettings.groupIcons,
        ...partial.groupIcons,
      };
    }
    if (Array.isArray(partial.customShortcuts)) {
      this.currentSettings.customShortcuts = partial.customShortcuts;
    }
    return this.save();
  }

  public renameGroup(
    oldName: string,
    newName: string,
    newIcon?: string
  ): AppSettings {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew) return this.currentSettings;

    // Update customGroups list preserving order
    this.currentSettings.customGroups = this.currentSettings.customGroups.map(
      (g) => (g === cleanOld ? cleanNew : g)
    );
    // Deduplicate in case renamed to an existing name
    this.currentSettings.customGroups = Array.from(
      new Set(this.currentSettings.customGroups)
    );

    // Update groupIcons
    const icons = { ...(this.currentSettings.groupIcons || DEFAULT_GROUP_ICONS) };
    const existingIcon = icons[cleanOld];
    if (cleanOld !== cleanNew) {
      delete icons[cleanOld];
    }
    if (newIcon !== undefined) {
      if (newIcon.trim()) {
        icons[cleanNew] = newIcon.trim();
      } else {
        delete icons[cleanNew];
      }
    } else if (existingIcon) {
      icons[cleanNew] = existingIcon;
    }
    this.currentSettings.groupIcons = icons;

    // Update all profiles assigned to oldName
    if (cleanOld !== cleanNew) {
      for (const key of Object.keys(this.currentSettings.profiles)) {
        const prof = this.currentSettings.profiles[key];
        const currentGroups = getProfileGroups(prof);
        if (currentGroups.includes(cleanOld)) {
          const updated = Array.from(
            new Set(currentGroups.map((g) => (g === cleanOld ? cleanNew : g)))
          );
          prof.groups = updated;
          prof.group = updated[0] || undefined;
        }
      }

      // Update customShortcuts assigned to oldName
      if (Array.isArray(this.currentSettings.customShortcuts)) {
        this.currentSettings.customShortcuts =
          this.currentSettings.customShortcuts.map((sc: CustomWebShortcut) => {
            if (Array.isArray(sc.groups) && sc.groups.includes(cleanOld)) {
              return {
                ...sc,
                groups: Array.from(
                  new Set(sc.groups.map((g) => (g === cleanOld ? cleanNew : g)))
                ),
              };
            }
            return sc;
          });
      }
    }

    return this.save();
  }

  public deleteGroup(groupName: string): AppSettings {
    const clean = groupName.trim();
    if (!clean) return this.currentSettings;

    this.currentSettings.customGroups =
      this.currentSettings.customGroups.filter((g) => g !== clean);

    if (this.currentSettings.groupIcons) {
      delete this.currentSettings.groupIcons[clean];
    }

    // Remove deleted group from profiles
    for (const key of Object.keys(this.currentSettings.profiles)) {
      const prof = this.currentSettings.profiles[key];
      const currentGroups = getProfileGroups(prof);
      if (currentGroups.includes(clean)) {
        const remaining = currentGroups.filter((g) => g !== clean);
        prof.groups = remaining.length > 0 ? remaining : undefined;
        prof.group = remaining[0] || undefined;
      }
    }

    // Remove deleted group from customShortcuts
    if (Array.isArray(this.currentSettings.customShortcuts)) {
      this.currentSettings.customShortcuts =
        this.currentSettings.customShortcuts.map((sc: CustomWebShortcut) => {
          if (Array.isArray(sc.groups) && sc.groups.includes(clean)) {
            return {
              ...sc,
              groups: sc.groups.filter((g) => g !== clean),
            };
          }
          return sc;
        });
    }

    return this.save();
  }

  public updateProfileCustomization(
    browserId: BrowserId,
    folderName: string,
    update: Partial<ProfileCustomization>
  ): AppSettings {
    const key = getProfileKey(browserId, folderName);
    const existing = this.currentSettings.profiles[key] || {};
    const merged: ProfileCustomization = {
      ...existing,
      ...update,
    };

    // Sync single `group` and multi `groups` fields cleanly
    if (update.groups !== undefined) {
      const cleanGroups = Array.from(
        new Set(update.groups.map((g) => g.trim()).filter(Boolean))
      );
      if (cleanGroups.length > 0) {
        merged.groups = cleanGroups;
        merged.group = cleanGroups[0];
      } else {
        delete merged.groups;
        delete merged.group;
      }
    } else if (update.group !== undefined) {
      const cleanGroup = update.group.trim();
      if (cleanGroup) {
        merged.group = cleanGroup;
        merged.groups = [cleanGroup];
      } else {
        delete merged.group;
        delete merged.groups;
      }
    }

    // Clean up empty strings
    if (merged.nickname !== undefined && !merged.nickname.trim()) {
      delete merged.nickname;
    }
    if (merged.color !== undefined && !merged.color.trim()) {
      delete merged.color;
    }
    if (merged.emoji !== undefined && !merged.emoji.trim()) {
      delete merged.emoji;
    }
    if (merged.startupUrl !== undefined && !merged.startupUrl.trim()) {
      delete merged.startupUrl;
    }

    this.currentSettings.profiles[key] = merged;
    return this.save();
  }
}
