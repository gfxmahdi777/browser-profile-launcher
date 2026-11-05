import { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Star,
  Edit3,
  Palette,
  Tag,
  ExternalLink,
  Trash2,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BrowserProfile,
  ProfileCustomization,
} from '../shared/types.ts';
import {
  SUPPORTED_BROWSERS,
  getProfileGroups,
} from '../shared/constants.ts';
import {
  BrowserLogo,
  GroupBadgeIcon,
  TikTokIcon,
  getUrlSiteBadgeInfo,
} from './BrowserIcons.tsx';
import { Language, TRANSLATIONS } from './i18n.ts';

interface ProfileCardProps {
  profile: BrowserProfile;
  customization: ProfileCustomization;
  groupIcons?: Record<string, string>;
  isDark: boolean;
  lang: Language;
  onLaunch: (
    profile: BrowserProfile,
    effectiveName: string,
    targetUrl?: string
  ) => void;
  onUpdateCustomization: (
    profile: BrowserProfile,
    update: Partial<ProfileCustomization>
  ) => void;
  onOpenCustomizeModal: (profile: BrowserProfile) => void;
  onCreateShortcut: (
    profile: BrowserProfile,
    effectiveName: string,
    targetUrl?: string
  ) => void;
  onDeleteFromDisk: (profile: BrowserProfile) => void;
}

export function ProfileCard({
  profile,
  customization,
  groupIcons = {},
  isDark,
  lang,
  onLaunch,
  onUpdateCustomization,
  onOpenCustomizeModal,
  onCreateShortcut,
  onDeleteFromDisk,
}: ProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [justLaunched, setJustLaunched] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const t = TRANSLATIONS[lang];
  const browserDef =
    SUPPORTED_BROWSERS.find((b) => b.id === profile.browserId) ||
    SUPPORTED_BROWSERS[0];

  const effectiveName = customization.nickname?.trim() || profile.displayName;
  const avatarColor = customization.color || browserDef.brandColor;
  const isFavorite = Boolean(customization.favorite);
  const assignedGroups = getProfileGroups(customization);
  const urlBadge = getUrlSiteBadgeInfo(customization.startupUrl);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCardClick = () => {
    setJustLaunched(true);
    onLaunch(profile, effectiveName, customization.startupUrl);
    setTimeout(() => setJustLaunched(false), 600);
  };

  return (
    <div
      className={`group relative rounded-xl transition-all duration-150 ${
        isDark
          ? 'bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800/80 hover:border-slate-700'
          : 'bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 shadow-xs'
      } ${justLaunched ? 'ring-2 ring-blue-500 scale-[0.99]' : ''}`}
    >
      <div className="flex items-center justify-between px-3.5 py-3 gap-2.5">
        {/* Main Clickable Launch Area */}
        <button
          type="button"
          onClick={handleCardClick}
          aria-label={`Launch ${effectiveName} in ${profile.browserName} (${profile.folderName})`}
          className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer active:scale-[0.99] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          {/* Round Avatar + Small Browser Badge */}
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs select-none transition-transform duration-150 group-hover:scale-105"
              style={{
                backgroundColor: `${avatarColor}20`,
                color: avatarColor,
                border: `1.5px solid ${avatarColor}45`,
              }}
            >
              {customization.emoji ? (
                <span className="text-base leading-none">
                  {customization.emoji}
                </span>
              ) : (
                <span>{profile.initials}</span>
              )}
            </div>
            {/* Small Browser Logo Badge */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center p-0.5 ${
                isDark
                  ? 'bg-slate-900 ring-1 ring-slate-700'
                  : 'bg-white ring-1 ring-slate-200'
              }`}
              title={profile.browserName}
            >
              <BrowserLogo
                browserId={profile.browserId}
                className="w-3.5 h-3.5"
              />
            </div>
          </div>

          {/* Profile Title, Startup URL Badge & Group Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-sm font-semibold truncate ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {effectiveName}
              </span>
              {isFavorite && (
                <Star
                  className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0"
                  aria-label="Pinned favorite"
                />
              )}
              {/* Startup URL Badge (TikTok, Facebook, YouTube, or Custom Web) */}
              {urlBadge && (
                <span
                  title={`Opens directly into ${customization.startupUrl}`}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0 ${
                    urlBadge.isTikTok
                      ? isDark
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                      : urlBadge.isFacebook
                      ? isDark
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                      : isDark
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {urlBadge.isTikTok ? (
                    <TikTokIcon className="w-3 h-3" />
                  ) : (
                    <Globe className="w-2.5 h-2.5" />
                  )}
                  <span className="max-w-[95px] truncate">{urlBadge.label}</span>
                </span>
              )}
            </div>

            {/* Clean metadata + multi-group tags */}
            <div
              className={`flex items-center gap-1.5 text-[11px] truncate mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span>{profile.folderName}</span>
              {customization.nickname &&
                customization.nickname !== profile.displayName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{profile.displayName}</span>
                  </>
                )}
              {assignedGroups.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`inline-flex items-center gap-1 truncate font-medium ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  >
                    <GroupBadgeIcon
                      groupName={assignedGroups[0]}
                      customIcon={groupIcons[assignedGroups[0]]}
                      className="w-3 h-3"
                    />
                    <span>
                      {assignedGroups.join(', ')}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Action Buttons (`Customize` & `...` Menu Trigger) with strict stopPropagation */}
        <div className="relative shrink-0 flex items-center gap-1" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(false);
              onOpenCustomizeModal(profile);
            }}
            aria-label={`Customize ${effectiveName} (${profile.browserName})`}
            title={t.menuCustomizeModal}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer opacity-75 group-hover:opacity-100 ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen((prev) => !prev);
            }}
            aria-label={`More actions for ${effectiveName} (${profile.browserName})`}
            aria-expanded={menuOpen}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              menuOpen
                ? isDark
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-200 text-slate-900'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-9 w-60 rounded-xl border p-1.5 shadow-2xl z-30 text-xs space-y-0.5 ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-100 shadow-black/70'
                  : 'border-slate-200 bg-white text-slate-800 shadow-slate-300/80'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onOpenCustomizeModal(profile);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left font-medium transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{t.menuCustomizeModal}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onOpenCustomizeModal(profile);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.menuColorEmoji}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onOpenCustomizeModal(profile);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="truncate">
                  {t.menuGroup}
                  {assignedGroups.length > 0
                    ? ` (${assignedGroups.join(', ')})`
                    : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onOpenCustomizeModal(profile);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{t.menuStartupUrl}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateCustomization(profile, { favorite: !isFavorite });
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isFavorite
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-amber-400'
                  }`}
                />
                <span>{isFavorite ? t.menuUnfavorite : t.menuFavorite}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateShortcut(
                    profile,
                    effectiveName,
                    customization.startupUrl
                  );
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{t.menuShortcut}</span>
              </button>

              <div
                className={`my-1 border-t ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFromDisk(profile);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-rose-400 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-rose-950/50' : 'hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t.menuDeleteDisk}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
