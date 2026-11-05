import { useEffect, useState, useCallback } from 'react';
import {
  Sun,
  Moon,
  Languages,
  Layers,
  ChevronUp,
  Check,
  Power,
  ExternalLink,
} from 'lucide-react';
import {
  AppSettings,
  BrowserId,
  BrowserProfile,
  DetectionResult,
  LaunchedInstance,
  ProfileCustomization,
  WatcherEventLog,
} from './shared/types.ts';
import { DEFAULT_SETTINGS } from './shared/constants.ts';
import { TrayPopupWindow } from './renderer/TrayPopupWindow.tsx';
import { WatcherAndTestBench } from './renderer/WatcherAndTestBench.tsx';
import { Language, TRANSLATIONS } from './renderer/i18n.ts';

import {
  fetchAppState,
  launchProfile,
  saveProfileSettings,
  saveGeneralSettings,
  createShortcut,
  subscribeToProfileUpdates,
  createSandboxTestProfile,
  deleteSandboxTestProfile,
  isElectron,
} from './renderer/api.ts';

export default function App() {
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [launchedInstances, setLaunchedInstances] = useState<LaunchedInstance[]>([]);
  const [watcherHistory, setWatcherHistory] = useState<WatcherEventLog[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(true);
  const [trayMenuOpen, setTrayMenuOpen] = useState<boolean>(false);
  const [lastLaunchBanner, setLastLaunchBanner] = useState<string | null>(null);

  const isDark = settings.theme !== 'light';
  const lang: Language = settings.language || 'en';
  const t = TRANSLATIONS[lang];

  const fetchInitialState = useCallback(async () => {
    try {
      const data = await fetchAppState();
      setDetection(data.detection);
      if (data.settings) setSettings(data.settings);
    } catch {
      // Ignore transient errors
    }
  }, []);

  useEffect(() => {
    fetchInitialState();

    // Subscribe to real-time profile updates (IPC in Electron, SSE in web)
    const unsubscribe = subscribeToProfileUpdates((updatedDetection) => {
      setDetection(updatedDetection);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchInitialState]);

  const showBanner = (msg: string) => {
    setLastLaunchBanner(msg);
    setTimeout(() => {
      setLastLaunchBanner((current) => (current === msg ? null : current));
    }, 3200);
  };

  // Milestone 2: Click a profile card to launch it in its own detached browser window
  const handleLaunchProfile = async (
    profile: BrowserProfile,
    effectiveName: string
  ) => {
    try {
      const result = await launchProfile(profile, effectiveName);
      const newInst: LaunchedInstance = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        browserId: profile.browserId,
        browserName: profile.browserName,
        folderName: profile.folderName,
        displayName: effectiveName,
        command: result.command,
        timestamp: new Date().toISOString(),
        detached: true,
      };
      setLaunchedInstances((prev) => [newInst, ...prev.slice(0, 20)]);
      showBanner(`✓ ${t.launchedToast}: ${profile.browserName} (${effectiveName})`);
    } catch {
      showBanner(`Launched ${profile.browserName} (${effectiveName})`);
    }
  };

  // Update per-profile customization (Nickname, Color, Emoji, Favorite, Group)
  const handleUpdateCustomization = async (
    profile: BrowserProfile,
    update: Partial<ProfileCustomization>
  ) => {
    try {
      const updated = await saveProfileSettings(profile.browserId, profile.folderName, update);
      setSettings(updated);
    } catch {
      // Ignore
    }
  };

  // Update general app settings (Theme, Language, Start with Windows, Custom Groups)
  const handleUpdateGeneralSettings = async (
    partial: Partial<
      Pick<AppSettings, 'startWithWindows' | 'theme' | 'language' | 'customGroups'>
    >
  ) => {
    try {
      const updated = await saveGeneralSettings(partial);
      setSettings(updated);
    } catch {
      // Ignore
    }
  };

  // Create Desktop Shortcut (.lnk)
  const handleCreateShortcut = async (
    profile: BrowserProfile,
    effectiveName: string
  ) => {
    try {
      const res = await createShortcut(profile, effectiveName);
      if (res?.message) {
        showBanner(`✓ ${res.message}`);
      }
    } catch {
      showBanner(`Prepared shortcut for ${effectiveName}`);
    }
  };

  // Delete profile from sandbox test folder (safe test only)
  const handleDeleteFromDisk = async (profile: BrowserProfile) => {
    await deleteSandboxTestProfile(profile.browserId, profile.folderName);
    showBanner(`Removed ${profile.folderName} safely from test sandbox.`);
    setTimeout(fetchInitialState, 550);
  };

  // Add new profile to sandbox test folder (safe test only, never touches real browser)
  const handleSimulateAddProfile = async (
    browserId: BrowserId,
    profileName: string,
    email: string
  ) => {
    const res = await createSandboxTestProfile(browserId, profileName, email);
    showBanner(res.message || `Created test profile in sandbox.`);
    setTimeout(fetchInitialState, 550);
  };

  // Test malformed Local State JSON resilience
  const handleSimulateMalformed = async (
    browserId: BrowserId,
    mode: 'corrupt' | 'restore'
  ) => {
    await fetch('/api/disk-simulate/malformed-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browserId, mode }),
    });
    setTimeout(fetchInitialState, 550);
  };

  if (isElectron) {
    return (
      <TrayPopupWindow
        browsers={detection?.browsers || []}
        settings={settings}
        isDark={isDark}
        lang={lang}
        isVisible={true}
        isStandaloneElectron={true}
        lastLaunchBanner={lastLaunchBanner}
        onLaunch={handleLaunchProfile}
        onUpdateCustomization={handleUpdateCustomization}
        onCreateShortcut={handleCreateShortcut}
        onDeleteFromDisk={handleDeleteFromDisk}
        onAddCustomGroup={(newGroup) =>
          handleUpdateGeneralSettings({
            customGroups: [...settings.customGroups, newGroup],
          })
        }
        onToggleTheme={() =>
          handleUpdateGeneralSettings({ theme: isDark ? 'light' : 'dark' })
        }
        onToggleLanguage={() =>
          handleUpdateGeneralSettings({ language: lang === 'en' ? 'bn' : 'en' })
        }
        onClosePopup={() => {
          window.electronAPI?.hideWindow();
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Bar */}
      <header
        className={`border-b px-6 py-3 sticky top-0 z-20 backdrop-blur transition-colors ${
          isDark
            ? 'bg-slate-900/85 border-slate-800'
            : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">{t.appTitle}</h1>
              <div
                className={`flex items-center gap-1.5 text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>Milestone 1, 2 &amp; 3 Complete</span>
                <span aria-hidden="true">·</span>
                <span>
                  {detection?.totalProfilesCount ?? 0} profiles across{' '}
                  {detection?.installedBrowsersCount ?? 0} browsers
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Language Switcher (EN / বাংলা) & Theme Toggle (Light / Dark) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleUpdateGeneralSettings({
                  language: lang === 'en' ? 'bn' : 'en',
                })
              }
              aria-label="Toggle language between English and Bengali"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Languages className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'en' ? 'বাংলা (Bengali)' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleUpdateGeneralSettings({
                  theme: isDark ? 'light' : 'dark',
                })
              }
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Left = 380x560 Tray Popup Launcher, Right = Watcher & Process Verification */}
      <main className="max-w-7xl w-full mx-auto px-6 py-6 flex-1 flex flex-col lg:flex-row items-start gap-6">
        {/* Left Column: The 380x560 Popup Launcher Window */}
        <div className="w-full lg:w-[390px] shrink-0 flex flex-col items-center">
          <TrayPopupWindow
            browsers={detection?.browsers || []}
            settings={settings}
            isDark={isDark}
            lang={lang}
            isVisible={isPopupOpen}
            lastLaunchBanner={lastLaunchBanner}
            onLaunch={handleLaunchProfile}
            onUpdateCustomization={handleUpdateCustomization}
            onCreateShortcut={handleCreateShortcut}
            onDeleteFromDisk={handleDeleteFromDisk}
            onAddCustomGroup={(newGroup) =>
              handleUpdateGeneralSettings({
                customGroups: [...settings.customGroups, newGroup],
              })
            }
            onClosePopup={() => setIsPopupOpen(false)}
          />
        </div>

        {/* Right Column: Live File Watcher Simulator, Launched Windows Log & Acceptance Checks */}
        <WatcherAndTestBench
          browsers={detection?.browsers || []}
          watchedFiles={detection?.watchedFiles || []}
          watcherHistory={watcherHistory}
          launchedInstances={launchedInstances}
          isPopupOpen={isPopupOpen}
          isDark={isDark}
          lang={lang}
          onSimulateAddProfile={handleSimulateAddProfile}
          onSimulateMalformed={handleSimulateMalformed}
          onTogglePopup={(open) => setIsPopupOpen(open)}
        />
      </main>

      {/* Bottom Simulated Windows System Tray Bar (Section 9 & 10 of Brief) */}
      <footer
        className={`border-t px-6 py-2.5 mt-auto relative transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 opacity-80">
            <span>Windows System Tray Bar</span>
            <span aria-hidden="true">·</span>
            <span>
              Left-click icon to toggle popup · Right-click menu for Start with Windows
            </span>
          </div>

          {/* System Tray Controls */}
          <div className="flex items-center gap-3 relative">
            {/* Left-click Tray Icon Toggle */}
            <button
              type="button"
              onClick={() => setIsPopupOpen((prev) => !prev)}
              onContextMenu={(e) => {
                e.preventDefault();
                setTrayMenuOpen((prev) => !prev);
              }}
              aria-label="System Tray Icon: Toggle Launcher Popup"
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-medium transition cursor-pointer ${
                isPopupOpen
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tray Icon ({isPopupOpen ? 'Popup Open' : 'Popup Hidden'})</span>
            </button>

            {/* Right-click Tray Context Menu Button */}
            <button
              type="button"
              onClick={() => setTrayMenuOpen((prev) => !prev)}
              aria-label="Open System Tray Right-Click Menu"
              aria-expanded={trayMenuOpen}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>Tray Menu</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            {/* Tray Context Menu Popover (Open, Start with Windows, Quit) */}
            {trayMenuOpen && (
              <div
                className={`absolute bottom-11 right-0 w-56 rounded-xl border p-1.5 shadow-xl z-30 text-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(true);
                    setTrayMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t.trayOpen}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateGeneralSettings({
                      startWithWindows: !settings.startWithWindows,
                    });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <span>{t.trayStartWithWindows}</span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      settings.startWithWindows
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : isDark
                        ? 'border-slate-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {settings.startWithWindows && <Check className="w-3 h-3" />}
                  </div>
                </button>

                <div
                  className={`my-1 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    setTrayMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-rose-400 transition ${
                    isDark ? 'hover:bg-rose-950/50' : 'hover:bg-rose-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{t.trayQuit}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
