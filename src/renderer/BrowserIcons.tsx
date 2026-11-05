import { BrowserId } from '../shared/types.ts';

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
