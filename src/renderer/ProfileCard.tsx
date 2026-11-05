import { useState } from 'react';
import {
  MoreHorizontal,
  Star,
  Edit3,
  Palette,
  Tag,
  ExternalLink,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  BrowserProfile,
  ProfileCustomization,
} from '../shared/types.ts';
import { SUPPORTED_BROWSERS } from '../shared/constants.ts';
import { BrowserLogo } from './BrowserIcons.tsx';
import { Language, TRANSLATIONS } from './i18n.ts';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#FB542B', // Brave Orange
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#EF4444', // Red
];

const PRESET_EMOJIS = ['', '📘', '💼', '🚀', '🦁', '🛒', '🎯', '🔒'];

interface ProfileCardProps {
  profile: BrowserProfile;
  customization: ProfileCustomization;
  customGroups: string[];
  isDark: boolean;
  lang: Language;
  onLaunch: (profile: BrowserProfile, effectiveName: string) => void;
  onUpdateCustomization: (
    profile: BrowserProfile,
    update: Partial<ProfileCustomization>
  ) => void;
  onCreateShortcut: (profile: BrowserProfile, effectiveName: string) => void;
  onDeleteFromDisk: (profile: BrowserProfile) => void;
}

export function ProfileCard({
  profile,
  customization,
  customGroups,
  isDark,
  lang,
  onLaunch,
  onUpdateCustomization,
  onCreateShortcut,
  onDeleteFromDisk,
}: ProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubpanel, setActiveSubpanel] = useState<
    'none' | 'rename' | 'color' | 'group'
  >('none');
  const [nicknameDraft, setNicknameDraft] = useState(
    customization.nickname || profile.displayName
  );
  const [justLaunched, setJustLaunched] = useState(false);

  const t = TRANSLATIONS[lang];
  const browserDef =
    SUPPORTED_BROWSERS.find((b) => b.id === profile.browserId) ||
    SUPPORTED_BROWSERS[0];

  const effectiveName = customization.nickname?.trim() || profile.displayName;
  const avatarColor = customization.color || browserDef.brandColor;
  const isFavorite = Boolean(customization.favorite);

  const handleCardClick = () => {
    setJustLaunched(true);
    onLaunch(profile, effectiveName);
    setTimeout(() => setJustLaunched(false), 600);
  };

  const handleSaveNickname = () => {
    const trimmed = nicknameDraft.trim();
    onUpdateCustomization(profile, {
      nickname: trimmed === profile.displayName ? '' : trimmed,
    });
    setActiveSubpanel('none');
    setMenuOpen(false);
  };

  return (
    <div
      className={`group relative rounded-xl transition-all duration-150 ${
        isDark
          ? 'bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800/80 hover:border-slate-700'
          : 'bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 shadow-xs'
      } ${justLaunched ? 'ring-2 ring-blue-500 scale-[0.99]' : ''}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 gap-2.5">
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
                <span className="text-base leading-none">{customization.emoji}</span>
              ) : (
                <span>{profile.initials}</span>
              )}
            </div>
            {/* Small Browser Logo Badge */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center p-0.5 ${
                isDark ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-white ring-1 ring-slate-200'
              }`}
              title={profile.browserName}
            >
              <BrowserLogo browserId={profile.browserId} className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Profile Title & Clean Unboxed Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-medium truncate ${
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
            </div>

            {/* Clean unboxed metadata with typographic separator (Zero-Pill Discipline) */}
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
              {customization.group && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      isDark ? 'text-blue-400 font-medium' : 'text-blue-600 font-medium'
                    }
                  >
                    {customization.group}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* "..." Card Context Menu Trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
              setActiveSubpanel('none');
              setNicknameDraft(customization.nickname || profile.displayName);
            }}
            aria-label={`More actions for ${effectiveName} (${profile.browserName})`}
            aria-expanded={menuOpen}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Action Menu / Editor inside Card */}
      {menuOpen && (
        <div
          className={`px-3 pb-3 pt-2 border-t text-xs space-y-2 ${
            isDark
              ? 'border-slate-800 bg-slate-950/90 text-slate-200'
              : 'border-slate-200 bg-slate-50/95 text-slate-700'
          } rounded-b-xl`}
        >
          {activeSubpanel === 'none' && (
            <div className="grid grid-cols-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveSubpanel('rename')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200/70'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{t.menuRename}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubpanel('color')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200/70'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.menuColorEmoji}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateCustomization(profile, { favorite: !isFavorite });
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200/70'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isFavorite ? 'text-amber-400 fill-amber-400' : 'text-amber-400'
                  }`}
                />
                <span>{isFavorite ? t.menuUnfavorite : t.menuFavorite}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubpanel('group')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200/70'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>
                  {t.menuGroup}{' '}
                  {customization.group ? `(${customization.group})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCreateShortcut(profile, effectiveName);
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200/70'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{t.menuShortcut}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteFromDisk(profile);
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-400 transition-colors ${
                  isDark ? 'hover:bg-rose-950/50' : 'hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t.menuDeleteDisk}</span>
              </button>
            </div>
          )}

          {/* Subpanel: Rename Nickname */}
          {activeSubpanel === 'rename' && (
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-medium opacity-80">
                {t.menuRename}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  placeholder={t.nicknamePlaceholder}
                  aria-label="Profile Nickname"
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveNickname}
                  aria-label="Save nickname"
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubpanel('none')}
                  aria-label="Cancel rename"
                  className={`p-1.5 rounded-lg ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Subpanel: Color & Emoji Picker */}
          {activeSubpanel === 'color' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium opacity-80">
                  {t.menuColorEmoji}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSubpanel('none')}
                  className="text-[11px] underline opacity-75 hover:opacity-100"
                >
                  Done
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Select color ${hex}`}
                    onClick={() => onUpdateCustomization(profile, { color: hex })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      avatarColor === hex
                        ? 'scale-110 border-white shadow-xs'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {PRESET_EMOJIS.map((em) => (
                  <button
                    key={em || 'initials'}
                    type="button"
                    onClick={() => onUpdateCustomization(profile, { emoji: em })}
                    className={`px-2 py-1 rounded-md text-xs border transition ${
                      (customization.emoji || '') === em
                        ? 'border-blue-500 bg-blue-500/15 font-semibold'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    {em || profile.initials}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subpanel: Assign Group */}
          {activeSubpanel === 'group' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium opacity-80">
                  {t.menuGroup}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSubpanel('none')}
                  className="text-[11px] underline opacity-75 hover:opacity-100"
                >
                  {t.cancel}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateCustomization(profile, { group: '' });
                    setActiveSubpanel('none');
                    setMenuOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs border ${
                    !customization.group
                      ? 'border-blue-500 bg-blue-500/15 text-blue-400 font-medium'
                      : isDark
                      ? 'border-slate-800 hover:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  None
                </button>
                {customGroups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      onUpdateCustomization(profile, { group: grp });
                      setActiveSubpanel('none');
                      setMenuOpen(false);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs border ${
                      customization.group === grp
                        ? 'border-blue-500 bg-blue-500/15 text-blue-400 font-medium'
                        : isDark
                        ? 'border-slate-800 hover:bg-slate-800'
                        : 'border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
