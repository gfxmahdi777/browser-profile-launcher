import { BrowserId } from '../shared/types.ts';
import { DEFAULT_GROUP_ICONS } from '../shared/constants.ts';

interface IconProps {
  browserId: BrowserId;
  className?: string;
}

export function BrowserLogo({ browserId, className = 'w-4 h-4' }: IconProps) {
  switch (browserId) {
    case 'chrome':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#4285F4" />
          <path
            d="M12 2a10 10 0 0 1 8.66 5H12a5 5 0 0 0-4.33 2.5L3.34 7A10 10 0 0 1 12 2z"
            fill="#EA4335"
          />
          <path
            d="M3.34 7l4.33 7.5A5 5 0 0 0 12 17l-4.33 4.33A10 10 0 0 1 3.34 7z"
            fill="#34A853"
          />
          <path
            d="M20.66 7a10 10 0 0 1-8.66 15 9.9 9.9 0 0 1-4.33-1l4.33-4a5 5 0 0 0 4.33-7.5H12V7h8.66z"
            fill="#FBBC05"
          />
          <circle cx="12" cy="12" r="4" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="3" fill="#4285F4" />
        </svg>
      );
    case 'brave':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2L4 5.5v6.5c0 5.25 3.4 9.65 8 11 4.6-1.35 8-5.75 8-11V5.5L12 2z"
            fill="#FB542B"
          />
          <path
            d="M12 5.5l4.2 2.2-1.1 4.3-3.1 2.5-3.1-2.5-1.1-4.3L12 5.5z"
            fill="#FFFFFF"
          />
          <circle cx="12" cy="11.2" r="1.5" fill="#FB542B" />
        </svg>
      );
    case 'edge':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#0078D7" />
          <path
            d="M7.5 14.5c0-3 2.5-5.5 5.5-5.5 2.2 0 4 1.3 4.8 3.2A6.5 6.5 0 0 0 6 12c0 3.6 2.9 6.5 6.5 6.5 2.1 0 4-1 5.2-2.5-1.2.6-2.6.8-4 .5-3.5-.5-6.2-2-6.2-2z"
            fill="#38BDF8"
          />
          <circle cx="12.5" cy="11.5" r="2.2" fill="#FFFFFF" />
        </svg>
      );
    case 'vivaldi':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#EF3939" />
          <path
            d="M7.2 7.5h2.6l2.2 5.8 2.2-5.8h2.6l-3.6 9h-2.4l-3.6-9z"
            fill="#FFFFFF"
          />
        </svg>
      );
  }
}

export function TikTokIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
        fill="#FE2C55"
      />
      <path
        d="M15.8 5.2A4.28 4.28 0 0 1 14.74 2.4h-2.5v12.4a2.59 2.59 0 0 1-2.59 2.5c-.7 0-1.34-.28-1.8-.73a2.58 2.58 0 0 0 2.4 1.53c1.43 0 2.6-1.12 2.6-2.5V3.2h2.3c.2 1.1.82 2.08 1.65 2.72v2.45a7.34 7.34 0 0 0 3.04.62V6.68s-1.88.09-3.24-1.48z"
        fill="#25F4EE"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export function GroupBadgeIcon({
  groupName,
  customIcon,
  className = 'w-3.5 h-3.5',
}: {
  groupName: string;
  customIcon?: string;
  className?: string;
}) {
  if (groupName.toLowerCase() === 'tiktok' && (!customIcon || customIcon === '🎵')) {
    return <TikTokIcon className={className} />;
  }
  const icon = customIcon || DEFAULT_GROUP_ICONS[groupName];
  if (icon) {
    return <span className="leading-none text-xs select-none">{icon}</span>;
  }
  return null;
}

export function getUrlSiteBadgeInfo(rawUrl?: string): {
  label: string;
  isTikTok: boolean;
  isFacebook: boolean;
  isYouTube: boolean;
  hostname: string;
} | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host.includes('tiktok.com')) {
      return {
        label: 'TikTok',
        isTikTok: true,
        isFacebook: false,
        isYouTube: false,
        hostname: host,
      };
    }
    if (host.includes('facebook.com') || host.includes('fb.com')) {
      return {
        label: 'Facebook',
        isTikTok: false,
        isFacebook: true,
        isYouTube: false,
        hostname: host,
      };
    }
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return {
        label: 'YouTube',
        isTikTok: false,
        isFacebook: false,
        isYouTube: true,
        hostname: host,
      };
    }
    return {
      label: host,
      isTikTok: false,
      isFacebook: false,
      isYouTube: false,
      hostname: host,
    };
  } catch {
    return null;
  }
}
