import {
  AppSettings,
  BrowserId,
  BrowserProfile,
  DetectionResult,
  ProfileCustomization,
} from '../shared/types.ts';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getState: () => Promise<{
        detection: DetectionResult;
        settings: AppSettings;
      }>;
      onProfilesUpdated: (
        callback: (data: { detection: DetectionResult }) => void
      ) => () => void;
      launchProfile: (
        browserId: BrowserId,
        folderName: string,
        displayName?: string
      ) => Promise<{ success: boolean; command: string; message: string }>;
      updateProfileSettings: (
        browserId: BrowserId,
        folderName: string,
        customization: Partial<ProfileCustomization>
      ) => Promise<AppSettings>;
      updateGeneralSettings: (
        settings: Partial<AppSettings>
      ) => Promise<AppSettings>;
      toggleStartup: (enable: boolean) => Promise<boolean>;
      createShortcut: (
        browserId: BrowserId,
        folderName: string,
        displayName: string
      ) => Promise<{ success: boolean; message: string }>;
      createSandboxProfile: (
        browserId: BrowserId,
        profileName: string,
        email?: string
      ) => Promise<{ ok: boolean; message: string }>;
      deleteSandboxProfile: (
        browserId: BrowserId,
        folderName: string
      ) => Promise<{ ok: boolean; message: string }>;
      hideWindow: () => Promise<void>;
      quitApp: () => Promise<void>;
    };
  }
}

export const isElectron = Boolean(
  typeof window !== 'undefined' && window.electronAPI?.isElectron
);

export async function fetchAppState(): Promise<{
  detection: DetectionResult;
  settings: AppSettings;
}> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.getState();
  }

  const res = await fetch('/api/state');
  if (!res.ok) {
    throw new Error('Failed to load application state');
  }
  return res.json();
}

export async function launchProfile(
  profile: BrowserProfile,
  displayName: string
): Promise<{ success: boolean; command: string; message: string }> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.launchProfile(
      profile.browserId,
      profile.folderName,
      displayName
    );
  }

  const res = await fetch('/api/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      browserId: profile.browserId,
      folderName: profile.folderName,
      displayName,
    }),
  });
  return res.json();
}

export async function saveProfileSettings(
  browserId: BrowserId,
  folderName: string,
  customization: Partial<ProfileCustomization>
): Promise<AppSettings> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.updateProfileSettings(
      browserId,
      folderName,
      customization
    );
  }

  const res = await fetch('/api/settings/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browserId, folderName, customization }),
  });
  const data = await res.json();
  return data.settings;
}

export async function saveGeneralSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.updateGeneralSettings(partial);
  }

  const res = await fetch('/api/settings/general', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  });
  const data = await res.json();
  return data.settings;
}

export async function createShortcut(
  profile: BrowserProfile,
  displayName: string
): Promise<{ success: boolean; message: string }> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.createShortcut(
      profile.browserId,
      profile.folderName,
      displayName
    );
  }

  const res = await fetch('/api/shortcut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      browserId: profile.browserId,
      folderName: profile.folderName,
      displayName,
    }),
  });
  const data = await res.json();
  return data.shortcutResult;
}

export function subscribeToProfileUpdates(
  callback: (detection: DetectionResult) => void
): () => void {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.onProfilesUpdated((payload) => {
      callback(payload.detection);
    });
  }

  // Web environment fallback: Server-Sent Events
  const eventSource = new EventSource('/api/events');
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.detection) {
        callback(data.detection);
      }
    } catch {
      // Ignore parse error
    }
  };

  return () => {
    eventSource.close();
  };
}

export async function createSandboxTestProfile(
  browserId: BrowserId,
  profileName: string,
  email: string
): Promise<{ ok: boolean; message: string }> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.createSandboxProfile(
      browserId,
      profileName,
      email
    );
  }

  const res = await fetch('/api/disk-simulate/add-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browserId, profileName, email }),
  });
  return res.json();
}

export async function deleteSandboxTestProfile(
  browserId: BrowserId,
  folderName: string
): Promise<{ ok: boolean; message: string }> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.deleteSandboxProfile(browserId, folderName);
  }

  const res = await fetch('/api/disk-simulate/delete-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browserId, folderName }),
  });
  return res.json();
}
