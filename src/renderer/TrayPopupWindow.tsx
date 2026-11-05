import { useState } from 'react';
import {
  Search,
  Star,
  Plus,
  X,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import {
  AppSettings,
  BrowserProfile,
  DetectedBrowser,
  ProfileCustomization,
} from '../shared/types.ts';
import { getProfileKey } from '../shared/constants.ts';
import { BrowserLogo } from './BrowserIcons.tsx';
import { ProfileCard } from './ProfileCard.tsx';
import { Language, TRANSLATIONS } from './i18n.ts';

interface TrayPopupWindowProps {
  browsers: DetectedBrowser[];
  settings: AppSettings;
  isDark: boolean;
  lang: Language;
  isVisible: boolean;
  lastLaunchBanner: string | null;
  onLaunch: (profile: BrowserProfile, effectiveName: string) => void;
  onUpdateCustomization: (
    profile: BrowserProfile,
    update: Partial<ProfileCustomization>
  ) => void;
  onCreateShortcut: (profile: BrowserProfile, effectiveName: string) => void;
  onDeleteFromDisk: (profile: BrowserProfile) => void;
  onAddCustomGroup: (newGroup: string) => void;
  onClosePopup: () => void;
}

export function TrayPopupWindow({
  browsers,
  settings,
  isDark,
  lang,
  isVisible,
  lastLaunchBanner,
  onLaunch,
  onUpdateCustomization,
  onCreateShortcut,
  onDeleteFromDisk,
  onAddCustomGroup,
  onClosePopup,
}: TrayPopupWindowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupDraft, setNewGroupDraft] = useState('');

  const t = TRANSLATIONS[lang];

  if (!isVisible) {
    return (
      <div
        className={`w-full max-w-[390px] h-[560px] rounded-2xl border flex flex-col items-center justify-center p-6 text-center transition-all duration-200 ${
          isDark
            ? 'bg-slate-900/50 border-slate-800 text-slate-400'
            : 'bg-slate-100 border-slate-300 text-slate-600'
        }`}
      >
        <Compass className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm font-medium mb-1">
          Launcher Popup Hidden in System Tray
        </p>
        <p className="text-xs opacity-75 mb-4">
          Any browser windows you opened remain running independently (detached processes).
        </p>
      </div>
    );
  }

  // Only show installed browsers (Project Brief Section 7 Step 3: "If neither works, hide that browser's section")
  const installedBrowsers = browsers.filter((b) => b.isInstalled);

  // Filter helper
  const matchesFilter = (profile: BrowserProfile): boolean => {
    const key = getProfileKey(profile.browserId, profile.folderName);
    const custom = settings.profiles[key] || {};
    const effectiveName = custom.nickname || profile.displayName;

    if (selectedFilter === 'favorites' && !custom.favorite) {
      return false;
    }
    if (
      selectedFilter !== 'all' &&
      selectedFilter !== 'favorites' &&
      custom.group !== selectedFilter
    ) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      effectiveName.toLowerCase().includes(q) ||
      profile.displayName.toLowerCase().includes(q) ||
      profile.folderName.toLowerCase().includes(q) ||
      profile.browserName.toLowerCase().includes(q) ||
      (custom.group || '').toLowerCase().includes(q)
    );
  };

  // Gather favorite profiles that match search/filter
  const favoriteProfiles: BrowserProfile[] = [];
  for (const b of installedBrowsers) {
    for (const p of b.profiles) {
      const key = getProfileKey(p.browserId, p.folderName);
      if (settings.profiles[key]?.favorite && matchesFilter(p)) {
        favoriteProfiles.push(p);
      }
    }
  }

  const totalMatchingProfiles = installedBrowsers.reduce(
    (sum, b) => sum + b.profiles.filter(matchesFilter).length,
    0
  );

  const handleCreateGroup = () => {
    const clean = newGroupDraft.trim();
    if (clean && !settings.customGroups.includes(clean)) {
      onAddCustomGroup(clean);
      setSelectedFilter(clean);
    }
    setNewGroupDraft('');
    setAddingGroup(false);
  };

  return (
    <section
      aria-label="Browser Profile Launcher Popup Window"
      data-testid="tray-popup-window"
      className={`w-full max-w-[390px] h-[560px] rounded-2xl flex flex-col overflow-hidden transition-all duration-200 shadow-2xl border ${
        isDark
          ? 'bg-slate-950 border-slate-800/90 text-slate-100 shadow-black/60'
          : 'bg-slate-50 border-slate-200/90 text-slate-900 shadow-slate-300/70'
      }`}
    >
      {/* Top Window Header & Search Box */}
      <div
        className={`px-4 pt-3.5 pb-3 border-b space-y-2.5 shrink-0 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800/80'
            : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h2 className="text-xs font-semibold tracking-tight">
              {t.appTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] opacity-70">
            <span>{totalMatchingProfiles} profiles</span>
            <button
              type="button"
              onClick={onClosePopup}
              aria-label="Minimize popup to system tray"
              className="p-1 rounded hover:bg-slate-500/20 transition-colors"
              title="Minimize to Tray"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500'
                : 'bg-slate-100/80 border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Interactive Segmented Filter Bar (All / Favorites / Custom Groups) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-colors ${
              selectedFilter === 'all'
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            {t.filterAll}
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('favorites')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 flex items-center gap-1 transition-colors ${
              selectedFilter === 'favorites'
                ? 'bg-amber-500 text-slate-950'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            {t.filterFavorites}
          </button>

          {settings.customGroups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedFilter(group)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-colors ${
                selectedFilter === group
                  ? 'bg-blue-600 text-white'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {group}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setAddingGroup((prev) => !prev)}
            aria-label="Add custom group"
            className={`p-1 rounded-lg text-[11px] shrink-0 transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title={t.addGroup}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inline Add Group Form */}
        {addingGroup && (
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newGroupDraft}
              onChange={(e) => setNewGroupDraft(e.target.value)}
              placeholder={t.newGroupPlaceholder}
              aria-label={t.newGroupPlaceholder}
              className={`flex-1 px-2.5 py-1 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
            >
              {t.addGroup}
            </button>
          </div>
        )}
      </div>

      {/* Feedback Banner on Profile Launch */}
      {lastLaunchBanner && (
        <div className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-medium flex items-center justify-between shrink-0">
          <span className="truncate">{lastLaunchBanner}</span>
        </div>
      )}

      {/* Scrollable Profile List Grouped by Favorites & Browser Headings */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
        {/* Empty State */}
        {totalMatchingProfiles === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
            <Compass
              className={`w-9 h-9 mb-2.5 ${
                isDark ? 'text-slate-600' : 'text-slate-400'
              }`}
            />
            <h3 className="text-xs font-semibold mb-1">{t.noProfilesFound}</h3>
            <p
              className={`text-[11px] leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {t.noProfilesSub}
            </p>
          </div>
        )}

        {/* Pinned Favorites Section (when viewing All Profiles and favorites exist) */}
        {selectedFilter === 'all' &&
          !searchQuery.trim() &&
          favoriteProfiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{t.favoritesHeading}</span>
                </div>
                <span
                  className={`text-[11px] ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {favoriteProfiles.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {favoriteProfiles.map((prof) => {
                  const key = getProfileKey(prof.browserId, prof.folderName);
                  return (
                    <ProfileCard
                      key={`fav-${key}`}
                      profile={prof}
                      customization={settings.profiles[key] || {}}
                      customGroups={settings.customGroups}
                      isDark={isDark}
                      lang={lang}
                      onLaunch={onLaunch}
                      onUpdateCustomization={onUpdateCustomization}
                      onCreateShortcut={onCreateShortcut}
                      onDeleteFromDisk={onDeleteFromDisk}
                    />
                  );
                })}
              </div>
            </div>
          )}

        {/* Profiles Grouped Under Installed Browser Headings */}
        {installedBrowsers.map((browser) => {
          const visibleProfiles = browser.profiles.filter(matchesFilter);
          if (visibleProfiles.length === 0 && !browser.error) {
            return null;
          }

          return (
            <div key={browser.id} className="space-y-2">
              {/* Browser Group Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <BrowserLogo browserId={browser.id} className="w-4 h-4" />
                  <h3
                    className={`text-xs font-semibold ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    {browser.name}
                  </h3>
                </div>
                <span
                  className={`text-[11px] ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {visibleProfiles.length}
                </span>
              </div>

              {/* Safe error alert if Local State is malformed/locked (Acceptance Check #5) */}
              {browser.error && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                    isDark
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <div className="font-semibold">
                      Safe Recovery: Local State issue handled
                    </div>
                    <div className="opacity-85 mt-0.5">{browser.error}</div>
                  </div>
                </div>
              )}

              {/* Profile Cards */}
              <div className="space-y-1.5">
                {visibleProfiles.map((prof) => {
                  const key = getProfileKey(prof.browserId, prof.folderName);
                  return (
                    <ProfileCard
                      key={key}
                      profile={prof}
                      customization={settings.profiles[key] || {}}
                      customGroups={settings.customGroups}
                      isDark={isDark}
                      lang={lang}
                      onLaunch={onLaunch}
                      onUpdateCustomization={onUpdateCustomization}
                      onCreateShortcut={onCreateShortcut}
                      onDeleteFromDisk={onDeleteFromDisk}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
