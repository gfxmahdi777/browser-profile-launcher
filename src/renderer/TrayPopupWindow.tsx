import { useState } from 'react';
import {
  Search,
  Star,
  Plus,
  X,
  Compass,
  AlertTriangle,
  Settings2,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  AppSettings,
  BrowserProfile,
  CustomWebShortcut,
  DetectedBrowser,
  ProfileCustomization,
  UpdateStatusPayload,
} from '../shared/types.ts';
import {
  DEFAULT_GROUP_ICONS,
  getProfileGroups,
  getProfileKey,
} from '../shared/constants.ts';
import {
  BrowserLogo,
  GroupBadgeIcon,
} from './BrowserIcons.tsx';
import { ProfileCard } from './ProfileCard.tsx';
import {
  GroupFormModal,
  ManageGroupsModal,
  ProfileCustomizeModal,
} from './CustomizationModals.tsx';
import { Language, TRANSLATIONS } from './i18n.ts';

interface TrayPopupWindowProps {
  browsers: DetectedBrowser[];
  settings: AppSettings;
  isDark: boolean;
  lang: Language;
  isVisible: boolean;
  isStandaloneElectron?: boolean;
  lastLaunchBanner: string | null;
  updateStatus?: UpdateStatusPayload | null;
  onCheckUpdates?: () => void;
  onInstallUpdate?: () => void;
  onDismissUpdate?: () => void;
  onLaunch: (
    profile: BrowserProfile,
    effectiveName: string,
    targetUrl?: string
  ) => void;
  onUpdateCustomization: (
    profile: BrowserProfile,
    update: Partial<ProfileCustomization>
  ) => void;
  onCreateShortcut: (
    profile: BrowserProfile,
    effectiveName: string,
    targetUrl?: string
  ) => void;
  onDeleteFromDisk: (profile: BrowserProfile) => void;
  onAddCustomGroup: (newGroup: string, icon?: string) => void;
  onRenameGroup?: (oldName: string, newName: string, newIcon?: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onReorderGroups?: (newOrder: string[]) => void;
  onSaveCustomShortcuts?: (shortcuts: CustomWebShortcut[]) => void;
  onToggleTheme?: () => void;
  onToggleLanguage?: () => void;
  onClosePopup: () => void;
}

export function TrayPopupWindow({
  browsers,
  settings,
  isDark,
  lang,
  isVisible,
  isStandaloneElectron = false,
  lastLaunchBanner,
  updateStatus,
  onCheckUpdates,
  onInstallUpdate,
  onDismissUpdate,
  onLaunch,
  onUpdateCustomization,
  onCreateShortcut,
  onDeleteFromDisk,
  onAddCustomGroup,
  onRenameGroup,
  onDeleteGroup,
  onReorderGroups,
  onToggleTheme,
  onToggleLanguage,
  onClosePopup,
}: TrayPopupWindowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Modal states
  const [customizingProfile, setCustomizingProfile] =
    useState<BrowserProfile | null>(null);
  const [groupModalState, setGroupModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    targetGroup?: string;
  }>({ open: false, mode: 'create' });
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);

  const t = TRANSLATIONS[lang];
  const groupIcons: Record<string, string> = {
    ...DEFAULT_GROUP_ICONS,
    ...(settings.groupIcons || {}),
  };

  if (!isVisible && !isStandaloneElectron) {
    return (
      <div
        className={`w-full max-w-6xl mx-auto min-h-[420px] rounded-2xl border flex flex-col items-center justify-center p-6 text-center transition-all duration-200 ${
          isDark
            ? 'bg-slate-900/50 border-slate-800 text-slate-400'
            : 'bg-slate-100 border-slate-300 text-slate-600'
        }`}
      >
        <Compass className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm font-medium mb-1">
          Launcher Window Minimized to System Tray
        </p>
        <p className="text-xs opacity-75 mb-4">
          Any browser windows you opened remain running independently (detached processes).
        </p>
      </div>
    );
  }

  // Only show installed browsers
  const installedBrowsers = browsers.filter((b) => b.isInstalled);

  // Filter helper for profiles (supports multi-group assignment)
  const matchesFilter = (profile: BrowserProfile): boolean => {
    const key = getProfileKey(profile.browserId, profile.folderName);
    const custom = settings.profiles[key] || {};
    const effectiveName = custom.nickname || profile.displayName;
    const assignedGroups = getProfileGroups(custom);

    if (selectedFilter === 'favorites' && !custom.favorite) {
      return false;
    }
    if (
      selectedFilter !== 'all' &&
      selectedFilter !== 'favorites' &&
      !assignedGroups.includes(selectedFilter)
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
      (custom.startupUrl || '').toLowerCase().includes(q) ||
      assignedGroups.some((g) => g.toLowerCase().includes(q))
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

  return (
    <section
      aria-label="Browser Profile Launcher Window"
      data-testid="tray-popup-window"
      className={`${
        isStandaloneElectron
          ? 'w-full min-h-screen rounded-none border-0'
          : 'w-full max-w-6xl mx-auto min-h-[560px] rounded-2xl shadow-2xl border'
      } flex flex-col overflow-hidden transition-all duration-200 ${
        isDark
          ? 'bg-slate-950 border-slate-800/90 text-slate-100 shadow-black/60'
          : 'bg-slate-50 border-slate-200/90 text-slate-900 shadow-slate-300/70'
      }`}
    >
      {/* Top Window Header & Search Box */}
      <div
        className={`px-6 pt-4 pb-3.5 border-b shrink-0 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800/80'
            : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="w-full max-w-6xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-semibold tracking-tight">
                {t.appTitle}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-md ${
                  isDark
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalMatchingProfiles} profiles
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">

              {onCheckUpdates && (
                <button
                  type="button"
                  onClick={onCheckUpdates}
                  aria-label={t.checkUpdateBtn}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title={t.checkUpdateBtn}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t.checkUpdateBtn}</span>
                </button>
              )}

              {onToggleLanguage && (
                <button
                  type="button"
                  onClick={onToggleLanguage}
                  aria-label="Toggle language"
                  className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title="Switch Language (EN / বাংলা)"
                >
                  {lang === 'en' ? 'বাংলা' : 'EN'}
                </button>
              )}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label="Toggle theme"
                  className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title="Switch Light / Dark Mode"
                >
                  {isDark ? '☀ Light' : '☾ Dark'}
                </button>
              )}
              {!isStandaloneElectron && (
                <button
                  type="button"
                  onClick={onClosePopup}
                  aria-label="Minimize popup to system tray"
                  className="p-1.5 rounded-lg hover:bg-slate-500/20 transition-colors cursor-pointer"
                  title="Minimize to Tray"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Field & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative md:w-72 lg:w-80 shrink-0">
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className={`w-full pl-10 pr-8 py-2 rounded-xl text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

            {/* Interactive Segmented Group Bar (All / Favorites / Facebook / TikTok / Work / Personal / Custom) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 flex-1">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedFilter === 'favorites'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{t.filterFavorites}</span>
              </button>

              {settings.customGroups.map((group) => {
                const isSelected = selectedFilter === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedFilter(group)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setGroupModalState({
                        open: true,
                        mode: 'edit',
                        targetGroup: group,
                      });
                    }}
                    title={t.editGroupTooltip}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <GroupBadgeIcon
                      groupName={group}
                      customIcon={groupIcons[group]}
                      className="w-3.5 h-3.5"
                    />
                    <span>{group}</span>
                  </button>
                );
              })}

              {/* "+" Button: Opens Create Custom Group Modal */}
              <button
                type="button"
                onClick={() =>
                  setGroupModalState({ open: true, mode: 'create' })
                }
                aria-label="Add custom group"
                className={`p-1.5 rounded-xl text-xs shrink-0 border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title={t.addGroup}
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Manage / Edit / Reorder / Delete Groups Button */}
              <button
                type="button"
                onClick={() => setManageGroupsOpen(true)}
                aria-label={t.manageGroupsBtn}
                className={`p-1.5 rounded-xl text-xs shrink-0 border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title={t.manageGroupsModalTitle}
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Built-in Auto-Updater Notification Banner */}
      {updateStatus && updateStatus.status !== 'idle' && (
        <div
          className={`px-6 py-2.5 text-xs font-medium shrink-0 border-b ${
            updateStatus.status === 'downloaded'
              ? 'bg-blue-600 text-white border-blue-500'
              : updateStatus.status === 'error'
              ? 'bg-amber-600 text-white border-amber-500'
              : isDark
              ? 'bg-slate-900 text-slate-200 border-slate-800'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>
                {updateStatus.status === 'checking'
                  ? t.updateChecking
                  : updateStatus.status === 'downloading'
                  ? `${t.updateDownloading} (${updateStatus.progress ?? 0}%)`
                  : updateStatus.status === 'downloaded'
                  ? t.updateReadyPrompt
                  : updateStatus.status === 'up-to-date'
                  ? `${t.upToDateMsg}${
                      updateStatus.version ? ` (v${updateStatus.version})` : ''
                    }`
                  : updateStatus.message}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {updateStatus.status === 'downloaded' && onInstallUpdate && (
                <button
                  type="button"
                  onClick={onInstallUpdate}
                  className="px-3 py-1 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-semibold transition cursor-pointer shadow-xs"
                >
                  {t.restartAndInstallBtn}
                </button>
              )}
              {onDismissUpdate && (
                <button
                  type="button"
                  onClick={onDismissUpdate}
                  aria-label="Dismiss update notification"
                  className="p-1 rounded hover:bg-black/15 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Banner on Profile Launch */}
      {lastLaunchBanner && (
        <div className="px-6 py-2 bg-emerald-600 text-white text-xs font-medium shrink-0">
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
            <span className="truncate">{lastLaunchBanner}</span>
          </div>
        </div>
      )}

      {/* Scrollable Profile List Grouped by Favorites & Browser Headings */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Empty State */}
          {totalMatchingProfiles === 0 && (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center py-12 px-4">
              <Compass
                className={`w-10 h-10 mb-3 ${
                  isDark ? 'text-slate-600' : 'text-slate-400'
                }`}
              />
              <h3 className="text-sm font-semibold mb-1">
                {t.noProfilesFound}
              </h3>
              <p
                className={`text-xs leading-relaxed max-w-md ${
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
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{t.favoritesHeading}</span>
                  </div>
                  <span
                    className={`text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {favoriteProfiles.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteProfiles.map((prof) => {
                    const key = getProfileKey(prof.browserId, prof.folderName);
                    return (
                      <ProfileCard
                        key={`fav-${key}`}
                        profile={prof}
                        customization={settings.profiles[key] || {}}
                        groupIcons={groupIcons}
                        isDark={isDark}
                        lang={lang}
                        onLaunch={onLaunch}
                        onUpdateCustomization={onUpdateCustomization}
                        onOpenCustomizeModal={(p) => setCustomizingProfile(p)}
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
              <div key={browser.id} className="space-y-3">
                {/* Browser Group Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <BrowserLogo browserId={browser.id} className="w-4 h-4" />
                    <h3
                      className={`text-sm font-semibold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {browser.name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {visibleProfiles.length}
                  </span>
                </div>

                {/* Safe error alert if Local State is malformed/locked */}
                {browser.error && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
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

                {/* Responsive Multi-Column Profile Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleProfiles.map((prof) => {
                    const key = getProfileKey(prof.browserId, prof.folderName);
                    return (
                      <ProfileCard
                        key={key}
                        profile={prof}
                        customization={settings.profiles[key] || {}}
                        groupIcons={groupIcons}
                        isDark={isDark}
                        lang={lang}
                        onLaunch={onLaunch}
                        onUpdateCustomization={onUpdateCustomization}
                        onOpenCustomizeModal={(p) => setCustomizingProfile(p)}
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
      </div>

      {/* Modal 1: Rich Profile Customization Modal */}
      {customizingProfile && (
        <ProfileCustomizeModal
          profile={customizingProfile}
          customization={
            settings.profiles[
              getProfileKey(
                customizingProfile.browserId,
                customizingProfile.folderName
              )
            ] || {}
          }
          customGroups={settings.customGroups}
          groupIcons={groupIcons}
          isDark={isDark}
          lang={lang}
          onSave={onUpdateCustomization}
          onCreateShortcut={onCreateShortcut}
          onClose={() => setCustomizingProfile(null)}
        />
      )}

      {/* Modal 2: Create / Edit Group Modal */}
      {groupModalState.open && (
        <GroupFormModal
          mode={groupModalState.mode}
          initialName={
            groupModalState.mode === 'edit'
              ? groupModalState.targetGroup || ''
              : ''
          }
          initialIcon={
            groupModalState.mode === 'edit' && groupModalState.targetGroup
              ? groupIcons[groupModalState.targetGroup] || '🎵'
              : '🎵'
          }
          isDark={isDark}
          lang={lang}
          onSubmit={(name, icon) => {
            if (groupModalState.mode === 'create') {
              onAddCustomGroup(name, icon);
              setSelectedFilter(name);
            } else if (groupModalState.targetGroup && onRenameGroup) {
              onRenameGroup(groupModalState.targetGroup, name, icon);
              if (selectedFilter === groupModalState.targetGroup) {
                setSelectedFilter(name);
              }
            }
          }}
          onDelete={
            groupModalState.mode === 'edit' &&
            groupModalState.targetGroup &&
            onDeleteGroup
              ? () => {
                  const target = groupModalState.targetGroup!;
                  onDeleteGroup(target);
                  if (selectedFilter === target) {
                    setSelectedFilter('all');
                  }
                }
              : undefined
          }
          onClose={() => setGroupModalState({ open: false, mode: 'create' })}
        />
      )}

      {/* Modal 3: Manage & Reorder Groups Modal */}
      {manageGroupsOpen && (
        <ManageGroupsModal
          customGroups={settings.customGroups}
          groupIcons={groupIcons}
          isDark={isDark}
          lang={lang}
          onReorderGroups={(newOrder) => {
            onReorderGroups?.(newOrder);
          }}
          onEditGroup={(grp) =>
            setGroupModalState({
              open: true,
              mode: 'edit',
              targetGroup: grp,
            })
          }
          onDeleteGroup={(grp) => {
            onDeleteGroup?.(grp);
            if (selectedFilter === grp) {
              setSelectedFilter('all');
            }
          }}
          onOpenCreateGroup={() =>
            setGroupModalState({ open: true, mode: 'create' })
          }
          onClose={() => setManageGroupsOpen(false)}
        />
      )}
    </section>
  );
}
