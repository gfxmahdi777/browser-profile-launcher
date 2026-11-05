import { useState } from 'react';
import {
  X,
  Check,
  Star,
  Globe,
  ExternalLink,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import {
  BrowserProfile,
  CustomWebShortcut,
  DetectedBrowser,
  ProfileCustomization,
} from '../shared/types.ts';
import {
  SUPPORTED_BROWSERS,
  URL_PRESETS,
  getProfileGroups,
} from '../shared/constants.ts';
import {
  BrowserLogo,
  GroupBadgeIcon,
  TikTokIcon,
  getUrlSiteBadgeInfo,
} from './BrowserIcons.tsx';
import { getInitials } from '../detect/parser.ts';
import { Language, TRANSLATIONS } from './i18n.ts';

export const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#FE2C55', // TikTok Pink/Red
  '#1877F2', // Facebook Blue
  '#FB542B', // Brave Orange
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
];

export const PRESET_EMOJIS = [
  '',
  '🎵',
  '📘',
  '💼',
  '👤',
  '🛍️',
  '🚀',
  '🦁',
  '🎯',
  '🔥',
  '🔒',
];

export const GROUP_ICON_OPTIONS = [
  '🎵',
  '📘',
  '💼',
  '👤',
  '🛍️',
  '🚀',
  '🎯',
  '🎮',
  '🔥',
  '💎',
  '📦',
  '⚡',
];

function normalizeInputUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface ProfileCustomizeModalProps {
  profile: BrowserProfile;
  customization: ProfileCustomization;
  customGroups: string[];
  groupIcons: Record<string, string>;
  isDark: boolean;
  lang: Language;
  onSave: (
    profile: BrowserProfile,
    update: Partial<ProfileCustomization>
  ) => void;
  onCreateShortcut: (
    profile: BrowserProfile,
    effectiveName: string,
    targetUrl?: string
  ) => void;
  onClose: () => void;
}

export function ProfileCustomizeModal({
  profile,
  customization,
  customGroups,
  groupIcons,
  isDark,
  lang,
  onSave,
  onCreateShortcut,
  onClose,
}: ProfileCustomizeModalProps) {
  const t = TRANSLATIONS[lang];
  const browserDef =
    SUPPORTED_BROWSERS.find((b) => b.id === profile.browserId) ||
    SUPPORTED_BROWSERS[0];

  const [nickname, setNickname] = useState(
    customization.nickname || profile.displayName
  );
  const [color, setColor] = useState(
    customization.color || browserDef.brandColor
  );
  const [emoji, setEmoji] = useState(customization.emoji || '');
  const [favorite, setFavorite] = useState(Boolean(customization.favorite));
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    getProfileGroups(customization)
  );
  const [startupUrl, setStartupUrl] = useState(customization.startupUrl || '');

  const toggleGroup = (grp: string) => {
    setSelectedGroups((prev) =>
      prev.includes(grp) ? prev.filter((g) => g !== grp) : [...prev, grp]
    );
  };

  const handleSave = () => {
    const cleanNick = nickname.trim();
    const normalizedUrl = normalizeInputUrl(startupUrl);
    onSave(profile, {
      nickname: cleanNick === profile.displayName ? '' : cleanNick,
      color,
      emoji,
      favorite,
      groups: selectedGroups,
      group: selectedGroups[0] || '',
      startupUrl: normalizedUrl,
    });
    onClose();
  };

  const effectivePreviewName = nickname.trim() || profile.displayName;
  const previewInitials = getInitials(effectivePreviewName);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs relative"
              style={{
                backgroundColor: `${color}20`,
                color,
                border: `1.5px solid ${color}55`,
              }}
            >
              {emoji ? (
                <span className="text-base leading-none">{emoji}</span>
              ) : (
                <span>{previewInitials}</span>
              )}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center p-0.5 ${
                  isDark ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-white ring-1 ring-slate-200'
                }`}
              >
                <BrowserLogo browserId={profile.browserId} className="w-3 h-3" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold">{t.customizeProfileModalTitle}</h3>
              <p className="text-[11px] opacity-70">
                {profile.browserName} · {profile.folderName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-slate-500/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Nickname & Favorite Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold opacity-90">{t.menuRename}</label>
              <button
                type="button"
                onClick={() => setFavorite((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                  favorite
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                    : isDark
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    favorite ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
                <span>{favorite ? t.menuUnfavorite : t.menuFavorite}</span>
              </button>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.nicknamePlaceholder}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Avatar Color & Emoji */}
          <div className="space-y-2">
            <label className="block font-semibold opacity-90">
              {t.menuColorEmoji}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Select color ${hex}`}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    color === hex
                      ? 'scale-110 border-white shadow-sm'
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
                  onClick={() => setEmoji(em)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                    emoji === em
                      ? 'border-blue-500 bg-blue-500/20 font-semibold'
                      : isDark
                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {em || previewInitials}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Select Groups */}
          <div className="space-y-2">
            <label className="block font-semibold opacity-90">
              {t.menuGroup}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {customGroups.map((grp) => {
                const isSelected = selectedGroups.includes(grp);
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => toggleGroup(grp)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <GroupBadgeIcon
                      groupName={grp}
                      customIcon={groupIcons[grp]}
                      className="w-3.5 h-3.5"
                    />
                    <span>{grp}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Startup URL (TikTok / Facebook / YouTube / Custom) */}
          <div className="space-y-2 pt-1 border-t border-slate-500/15">
            <div className="flex items-center justify-between">
              <label className="font-semibold opacity-90 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.startupUrlLabel}</span>
              </label>
              {startupUrl && (
                <button
                  type="button"
                  onClick={() => setStartupUrl('')}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  {t.clearUrl}
                </button>
              )}
            </div>
            <p className="text-[11px] opacity-70">{t.startupUrlHint}</p>

            {/* 1-Click Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] opacity-75 mr-1">
                {t.urlPresetsLabel}
              </span>
              {URL_PRESETS.map((preset) => {
                const active =
                  startupUrl.trim().toLowerCase() === preset.url.toLowerCase();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStartupUrl(preset.url);
                      if (
                        preset.label === 'TikTok' &&
                        customGroups.includes('TikTok') &&
                        !selectedGroups.includes('TikTok')
                      ) {
                        setSelectedGroups((prev) => [...prev, 'TikTok']);
                      }
                      if (
                        preset.label === 'Facebook' &&
                        customGroups.includes('Facebook') &&
                        !selectedGroups.includes('Facebook')
                      ) {
                        setSelectedGroups((prev) => [...prev, 'Facebook']);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white border-blue-500'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label === 'TikTok' ? (
                      <TikTokIcon className="w-3.5 h-3.5" />
                    ) : (
                      <span>{preset.icon}</span>
                    )}
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            <input
              type="url"
              value={startupUrl}
              onChange={(e) => setStartupUrl(e.target.value)}
              placeholder={t.startupUrlPlaceholder}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Desktop Shortcut Quick Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() =>
                onCreateShortcut(
                  profile,
                  effectivePreviewName,
                  normalizeInputUrl(startupUrl) || undefined
                )
              }
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-cyan-300'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-cyan-700'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t.menuShortcut}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-end gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface GroupFormModalProps {
  mode: 'create' | 'edit';
  initialName?: string;
  initialIcon?: string;
  isDark: boolean;
  lang: Language;
  onSubmit: (name: string, icon: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function GroupFormModal({
  mode,
  initialName = '',
  initialIcon = '🎵',
  isDark,
  lang,
  onSubmit,
  onDelete,
  onClose,
}: GroupFormModalProps) {
  const t = TRANSLATIONS[lang];
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onSubmit(clean, icon);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <h3 className="text-sm font-bold">
            {mode === 'create' ? t.createGroupModalTitle : t.renameGroupLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold">{t.groupNameLabel}</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.newGroupPlaceholder}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">{t.groupIconLabel}</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {GROUP_ICON_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`w-8 h-8 rounded-xl border text-sm flex items-center justify-center transition cursor-pointer ${
                    icon === em
                      ? 'border-blue-500 bg-blue-500/20 scale-105'
                      : isDark
                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          {mode === 'edit' && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/15 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.delete}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{mode === 'create' ? t.create : t.save}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface ManageGroupsModalProps {
  customGroups: string[];
  groupIcons: Record<string, string>;
  isDark: boolean;
  lang: Language;
  onReorderGroups: (newOrder: string[]) => void;
  onEditGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
  onOpenCreateGroup: () => void;
  onClose: () => void;
}

export function ManageGroupsModal({
  customGroups,
  groupIcons,
  isDark,
  lang,
  onReorderGroups,
  onEditGroup,
  onDeleteGroup,
  onOpenCreateGroup,
  onClose,
}: ManageGroupsModalProps) {
  const t = TRANSLATIONS[lang];

  const moveGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= customGroups.length) return;
    const copy = [...customGroups];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onReorderGroups(copy);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <h3 className="text-sm font-bold">{t.manageGroupsModalTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[65vh] overflow-y-auto text-xs">
          {customGroups.map((grp, idx) => (
            <div
              key={grp}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                isDark
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GroupBadgeIcon
                  groupName={grp}
                  customIcon={groupIcons[grp]}
                  className="w-4 h-4"
                />
                <span className="font-semibold truncate">{grp}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveGroup(idx, -1)}
                  title={t.moveUp}
                  className="p-1.5 rounded-lg hover:bg-slate-500/20 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === customGroups.length - 1}
                  onClick={() => moveGroup(idx, 1)}
                  title={t.moveDown}
                  className="p-1.5 rounded-lg hover:bg-slate-500/20 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditGroup(grp);
                  }}
                  title={t.renameGroupLabel}
                  className="p-1.5 rounded-lg hover:bg-slate-500/20 text-blue-400 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteGroup(grp)}
                  title={t.delete}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            className="w-full py-2.5 rounded-xl border border-dashed border-blue-500/50 text-blue-400 hover:bg-blue-500/10 font-medium flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addGroup}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface WebShortcutModalProps {
  browsers: DetectedBrowser[];
  customGroups: string[];
  groupIcons: Record<string, string>;
  initialShortcut?: CustomWebShortcut | null;
  isDark: boolean;
  lang: Language;
  onSave: (shortcut: CustomWebShortcut) => void;
  onClose: () => void;
}

export function WebShortcutModal({
  browsers,
  customGroups,
  groupIcons,
  initialShortcut,
  isDark,
  lang,
  onSave,
  onClose,
}: WebShortcutModalProps) {
  const t = TRANSLATIONS[lang];
  const installedBrowsers = browsers.filter(
    (b) => b.isInstalled && b.profiles.length > 0
  );

  // Build flat list of available browser+profile options
  const profileOptions: {
    key: string;
    browserId: BrowserProfile['browserId'];
    browserName: string;
    folderName: string;
    displayName: string;
  }[] = [];

  for (const b of installedBrowsers) {
    for (const p of b.profiles) {
      profileOptions.push({
        key: `${p.browserId}:${p.folderName}`,
        browserId: p.browserId,
        browserName: b.name,
        folderName: p.folderName,
        displayName: p.displayName,
      });
    }
  }

  const defaultOpt = profileOptions[0] || {
    key: 'chrome:Default',
    browserId: 'chrome' as const,
    browserName: 'Google Chrome',
    folderName: 'Default',
    displayName: 'Default',
  };

  const [name, setName] = useState(initialShortcut?.name || 'TikTok Account #1');
  const [selectedProfileKey, setSelectedProfileKey] = useState(
    initialShortcut
      ? `${initialShortcut.browserId}:${initialShortcut.folderName}`
      : defaultOpt.key
  );
  const [url, setUrl] = useState(
    initialShortcut?.url || 'https://www.tiktok.com'
  );
  const [color, setColor] = useState(initialShortcut?.color || '#FE2C55');
  const [emoji, setEmoji] = useState(initialShortcut?.emoji || '🎵');
  const [favorite, setFavorite] = useState(
    Boolean(initialShortcut?.favorite ?? true)
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    initialShortcut?.groups ||
      (customGroups.includes('TikTok') ? ['TikTok'] : [])
  );

  const toggleGroup = (grp: string) => {
    setSelectedGroups((prev) =>
      prev.includes(grp) ? prev.filter((g) => g !== grp) : [...prev, grp]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const normalizedUrl = normalizeInputUrl(url);
    if (!cleanName || !normalizedUrl) return;

    const chosen =
      profileOptions.find((o) => o.key === selectedProfileKey) || defaultOpt;

    onSave({
      id:
        initialShortcut?.id ||
        `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      browserId: chosen.browserId,
      folderName: chosen.folderName,
      url: normalizedUrl,
      color,
      emoji,
      favorite,
      groups: selectedGroups,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <TikTokIcon className="w-4 h-4" />
            <h3 className="text-sm font-bold">
              {initialShortcut
                ? t.editWebShortcutTitle
                : t.createWebShortcutTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Card Name + Favorite */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold">{t.shortcutNameLabel}</label>
              <button
                type="button"
                onClick={() => setFavorite((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  favorite
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                    : isDark
                    ? 'border-slate-700 text-slate-400'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Star
                  className={`w-3 h-3 ${
                    favorite ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
                <span>{favorite ? t.menuUnfavorite : t.menuFavorite}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.shortcutNamePlaceholder}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Browser + Profile Select */}
          <div className="space-y-1.5">
            <label className="block font-semibold">
              {t.selectBrowserProfileLabel}
            </label>
            <select
              value={selectedProfileKey}
              onChange={(e) => setSelectedProfileKey(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              {profileOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.browserName} — {opt.displayName} ({opt.folderName})
                </option>
              ))}
            </select>
          </div>

          {/* Target URL + Presets */}
          <div className="space-y-2">
            <label className="block font-semibold">{t.targetUrlLabel}</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {URL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setUrl(preset.url);
                    setColor(preset.color);
                    setEmoji(preset.icon);
                    if (
                      customGroups.includes(preset.label) &&
                      !selectedGroups.includes(preset.label)
                    ) {
                      setSelectedGroups([preset.label]);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                    url.trim().toLowerCase() === preset.url.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-500'
                      : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {preset.label === 'TikTok' ? (
                    <TikTokIcon className="w-3.5 h-3.5" />
                  ) : (
                    <span>{preset.icon}</span>
                  )}
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.targetUrlPlaceholder}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Groups */}
          <div className="space-y-1.5">
            <label className="block font-semibold">{t.menuGroup}</label>
            <div className="flex flex-wrap gap-1.5">
              {customGroups.map((grp) => {
                const active = selectedGroups.includes(grp);
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => toggleGroup(grp)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <GroupBadgeIcon
                      groupName={grp}
                      customIcon={groupIcons[grp]}
                      className="w-3.5 h-3.5"
                    />
                    <span>{grp}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`px-5 py-3.5 border-t flex items-center justify-end gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{initialShortcut ? t.save : t.create}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

interface WebShortcutCardProps {
  shortcut: CustomWebShortcut;
  browsers: DetectedBrowser[];
  isDark: boolean;
  lang: Language;
  onLaunchShortcut: (shortcut: CustomWebShortcut) => void;
  onEditShortcut: (shortcut: CustomWebShortcut) => void;
  onDeleteShortcut: (shortcutId: string) => void;
  onCreateDesktopShortcut: (shortcut: CustomWebShortcut) => void;
}

export function WebShortcutCard({
  shortcut,
  browsers,
  isDark,
  lang,
  onLaunchShortcut,
  onEditShortcut,
  onDeleteShortcut,
  onCreateDesktopShortcut,
}: WebShortcutCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang];

  const browser = browsers.find((b) => b.id === shortcut.browserId);
  const profile = browser?.profiles.find(
    (p) => p.folderName === shortcut.folderName
  );
  const badge = getUrlSiteBadgeInfo(shortcut.url);
  const color = shortcut.color || '#FE2C55';

  return (
    <div
      className={`group relative rounded-xl transition-all duration-150 ${
        isDark
          ? 'bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800/80 hover:border-slate-700'
          : 'bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between px-3.5 py-3 gap-2.5">
        <button
          type="button"
          onClick={() => onLaunchShortcut(shortcut)}
          className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs select-none"
              style={{
                backgroundColor: `${color}20`,
                color,
                border: `1.5px solid ${color}45`,
              }}
            >
              {badge?.isTikTok ? (
                <TikTokIcon className="w-4 h-4" />
              ) : shortcut.emoji ? (
                <span className="text-base leading-none">{shortcut.emoji}</span>
              ) : (
                <span>{getInitials(shortcut.name)}</span>
              )}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center p-0.5 ${
                isDark ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-white ring-1 ring-slate-200'
              }`}
            >
              <BrowserLogo
                browserId={shortcut.browserId}
                className="w-3.5 h-3.5"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-sm font-semibold truncate ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {shortcut.name}
              </span>
              {shortcut.favorite && (
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              )}
              {badge && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0 ${
                    badge.isTikTok
                      ? isDark
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                      : isDark
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  {badge.isTikTok ? (
                    <TikTokIcon className="w-3 h-3" />
                  ) : (
                    <Globe className="w-2.5 h-2.5" />
                  )}
                  <span>{badge.label}</span>
                </span>
              )}
            </div>
            <div
              className={`flex items-center gap-1.5 text-[11px] truncate mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span>{browser?.name || shortcut.browserId}</span>
              <span aria-hidden="true">·</span>
              <span>{profile?.displayName || shortcut.folderName}</span>
            </div>
          </div>
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-9 w-52 rounded-xl border p-1.5 shadow-2xl z-30 text-xs space-y-0.5 ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-100'
                  : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEditShortcut(shortcut);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.menuEditCard}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onCreateDesktopShortcut(shortcut);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.menuShortcut}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteShortcut(shortcut.id);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-rose-400 cursor-pointer ${
                  isDark ? 'hover:bg-rose-950/50' : 'hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.menuDeleteCard}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
