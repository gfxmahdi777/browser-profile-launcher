import fs from 'node:fs';
import path from 'node:path';
import { AppSettings, BrowserId, ProfileCustomization } from '../shared/types.ts';
import { DEFAULT_SETTINGS, getProfileKey } from '../shared/constants.ts';
export { DEFAULT_SETTINGS, getProfileKey };

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
        this.currentSettings = {
          startWithWindows: Boolean(parsed.startWithWindows ?? DEFAULT_SETTINGS.startWithWindows),
          theme: parsed.theme || DEFAULT_SETTINGS.theme,
          language: parsed.language || DEFAULT_SETTINGS.language,
          customGroups: Array.isArray(parsed.customGroups)
            ? parsed.customGroups
            : [...DEFAULT_SETTINGS.customGroups],
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
    partial: Partial<Pick<AppSettings, 'startWithWindows' | 'theme' | 'language' | 'customGroups'>>
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

    // Clean up empty strings
    if (merged.nickname !== undefined && !merged.nickname.trim()) {
      delete merged.nickname;
    }
    if (merged.group !== undefined && !merged.group.trim()) {
      delete merged.group;
    }
    if (merged.color !== undefined && !merged.color.trim()) {
      delete merged.color;
    }
    if (merged.emoji !== undefined && !merged.emoji.trim()) {
      delete merged.emoji;
    }

    this.currentSettings.profiles[key] = merged;
    return this.save();
  }
}
