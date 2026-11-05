export type BrowserId = 'chrome' | 'brave' | 'edge' | 'vivaldi';

export interface BrowserDefinition {
  id: BrowserId;
  name: string;
  processExe: string;
  localStateSubpath: string;
  userDataSubpath: string;
  standardExePaths: string[];
  registryAppPathKey: string;
  brandColor: string;
}

export interface RawProfileInfo {
  name?: string;
  user_name?: string;
  gaia_name?: string;
  gaia_given_name?: string;
  gaia_id?: string;
  avatar_icon?: string;
  is_using_default_avatar?: boolean;
  active_time?: number;
  [key: string]: unknown;
}

export interface RawLocalState {
  profile?: {
    info_cache?: Record<string, RawProfileInfo>;
    profiles_order?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface BrowserProfile {
  browserId: BrowserId;
  browserName: string;
  folderName: string; // e.g. "Default", "Profile 1"
  displayName: string;
  initials: string;
  avatarPath: string | null;
  avatarIcon: string | null;
  gaiaId: string | null;
  isDefault: boolean;
  launchArgument: string; // e.g. '--profile-directory="Profile 1"'
}

export interface DetectedBrowser {
  id: BrowserId;
  name: string;
  isInstalled: boolean;
  executablePath: string | null;
  localStatePath: string | null;
  userDataDir: string | null;
  profiles: BrowserProfile[];
  error?: string | null;
}

export interface DetectionResult {
  platform: string;
  timestamp: string;
  browsers: DetectedBrowser[];
  totalProfilesCount: number;
  installedBrowsersCount: number;
  watchedFiles?: string[];
  isSandboxDisk?: boolean;
}

export interface ProfileCustomization {
  nickname?: string;
  color?: string;
  emoji?: string;
  favorite?: boolean;
  group?: string;
}

export interface AppSettings {
  startWithWindows: boolean;
  theme: 'system' | 'light' | 'dark';
  language: 'en' | 'bn';
  customGroups: string[];
  profiles: Record<string, ProfileCustomization>; // Keyed by `${browserId}:${folderName}`
}

export interface LaunchedInstance {
  id: string;
  browserId: BrowserId;
  browserName: string;
  folderName: string;
  displayName: string;
  command: string;
  timestamp: string;
  detached: boolean;
}

export interface WatcherEventLog {
  id: string;
  timestamp: string;
  browserId: BrowserId;
  browserName: string;
  filePath: string;
  eventType: string;
  profilesCount: number;
}
