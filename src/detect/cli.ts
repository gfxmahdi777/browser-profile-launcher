#!/usr/bin/env node
import { detectAllBrowsers } from './detect.ts';
import { getLocalAppDataDir } from './paths.ts';
import { SUPPORTED_BROWSERS } from '../shared/constants.ts';
import { BrowserProfile, DetectedBrowser } from '../shared/types.ts';

// Sample mock data for testing/demoing when running outside Windows or on a machine without installed browsers
export const MOCK_LOCAL_STATE_CHROME = {
  profile: {
    info_cache: {
      Default: {
        name: 'Personal Account',
        user_name: 'john.doe@gmail.com',
        gaia_name: 'John Doe',
        avatar_icon: 'chrome://theme/IDR_PROFILE_AVATAR_26',
      },
      'Profile 1': {
        name: 'Work / Clients',
        user_name: 'johndoe.work@company.com',
        gaia_name: 'John Doe (Work)',
      },
      'Profile 2': {
        name: 'Social Media / Facebook 1',
        user_name: 'fb.user1@outlook.com',
      },
    },
  },
};

export const MOCK_LOCAL_STATE_BRAVE = {
  profile: {
    info_cache: {
      Default: {
        name: 'Crypto & Web3',
        avatar_icon: 'chrome://theme/IDR_PROFILE_AVATAR_1',
      },
      'Profile 1': {
        name: 'Social Media / Facebook 2',
      },
    },
  },
};

export const MOCK_LOCAL_STATE_EDGE = {
  profile: {
    info_cache: {
      Default: {
        name: 'Microsoft 365 Work',
        user_name: 'john@enterprise.onmicrosoft.com',
      },
    },
  },
};

export function formatConsoleReport(
  browsers: DetectedBrowser[],
  options?: { isMock?: boolean; lad?: string }
): string {
  const lines: string[] = [];
  const divider = '━'.repeat(60);
  const thinDivider = '─'.repeat(60);

  lines.push('');
  lines.push(divider);
  lines.push('  🚀 BROWSER PROFILE LAUNCHER — Profile Detector (Milestone 1)');
  lines.push(divider);
  lines.push(`  Platform:       ${process.platform} ${options?.isMock ? '(DEMO / MOCK MODE)' : ''}`);
  lines.push(`  Local AppData:  ${options?.lad || getLocalAppDataDir()}`);
  lines.push(`  Time:           ${new Date().toLocaleString()}`);
  lines.push(divider);
  lines.push('');

  let totalProfiles = 0;
  let installedCount = 0;

  for (const browser of browsers) {
    if (browser.isInstalled) {
      installedCount++;
      totalProfiles += browser.profiles.length;
      lines.push(`▶ [FOUND] ${browser.name}`);
      if (browser.executablePath) {
        lines.push(`  ├─ Executable:  ${browser.executablePath}`);
      } else {
        lines.push(`  ├─ Executable:  (not located in standard registry/paths)`);
      }
      lines.push(`  ├─ Local State: ${browser.localStatePath}`);
      lines.push(`  └─ Profiles:    ${browser.profiles.length} found`);

      if (browser.profiles.length > 0) {
        lines.push('');
        for (let i = 0; i < browser.profiles.length; i++) {
          const prof = browser.profiles[i];
          const isLast = i === browser.profiles.length - 1;
          const prefix = isLast ? '     └─' : '     ├─';
          const innerPrefix = isLast ? '       ' : '     │ ';

          lines.push(`${prefix} Profile #${i + 1}: "${prof.displayName}"`);
          lines.push(`${innerPrefix} • Folder:       ${prof.folderName}`);
          lines.push(`${innerPrefix} • Initials:     [${prof.initials}]`);
          if (prof.avatarPath) {
            lines.push(`${innerPrefix} • Avatar File:  ${prof.avatarPath}`);
          }
          const exeDisplay = browser.executablePath || browser.id + '.exe';
          lines.push(`${innerPrefix} • Launch Cmd:   "${exeDisplay}" ${prof.launchArgument}`);
        }
      } else {
        lines.push('     (No profile entries in info_cache)');
      }
      lines.push('');
    } else {
      lines.push(`▷ [NOT FOUND] ${browser.name}`);
      if (browser.error) {
        lines.push(`  └─ Note: ${browser.error}`);
      } else {
        lines.push(`  └─ No Local State file found at default Windows location.`);
      }
      lines.push('');
    }
  }

  lines.push(thinDivider);
  lines.push(
    `  SUMMARY: Detected ${totalProfiles} profile(s) across ${installedCount} installed browser(s).`
  );
  lines.push(thinDivider);
  lines.push('');

  return lines.join('\n');
}

/**
 * CLI execution handler
 */
export async function runCli() {
  const args = process.argv.slice(2);
  const isMock = args.includes('--mock') || process.platform !== 'win32';
  const asJson = args.includes('--json');

  let result;

  if (isMock && process.platform !== 'win32' && !args.includes('--real')) {
    // Generate simulated profiles for testing on non-Windows/demo platforms
    const mockBrowsers: DetectedBrowser[] = [
      {
        id: 'chrome',
        name: 'Google Chrome',
        isInstalled: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        localStatePath: 'C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\User Data\\Local State',
        userDataDir: 'C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\User Data',
        profiles: [
          {
            browserId: 'chrome',
            browserName: 'Google Chrome',
            folderName: 'Default',
            displayName: 'Personal Account',
            initials: 'PA',
            avatarPath: null,
            avatarIcon: 'chrome://theme/IDR_PROFILE_AVATAR_26',
            gaiaId: null,
            isDefault: true,
            launchArgument: '--profile-directory="Default"',
          },
          {
            browserId: 'chrome',
            browserName: 'Google Chrome',
            folderName: 'Profile 1',
            displayName: 'Work / Clients',
            initials: 'WC',
            avatarPath: null,
            avatarIcon: null,
            gaiaId: null,
            isDefault: false,
            launchArgument: '--profile-directory="Profile 1"',
          },
          {
            browserId: 'chrome',
            browserName: 'Google Chrome',
            folderName: 'Profile 2',
            displayName: 'Social Media / Facebook 1',
            initials: 'SM',
            avatarPath: null,
            avatarIcon: null,
            gaiaId: null,
            isDefault: false,
            launchArgument: '--profile-directory="Profile 2"',
          },
        ],
      },
      {
        id: 'brave',
        name: 'Brave Browser',
        isInstalled: true,
        executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        localStatePath: 'C:\\Users\\User\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\Local State',
        userDataDir: 'C:\\Users\\User\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data',
        profiles: [
          {
            browserId: 'brave',
            browserName: 'Brave Browser',
            folderName: 'Default',
            displayName: 'Crypto & Web3',
            initials: 'CW',
            avatarPath: null,
            avatarIcon: null,
            gaiaId: null,
            isDefault: true,
            launchArgument: '--profile-directory="Default"',
          },
          {
            browserId: 'brave',
            browserName: 'Brave Browser',
            folderName: 'Profile 1',
            displayName: 'Social Media / Facebook 2',
            initials: 'SM',
            avatarPath: null,
            avatarIcon: null,
            gaiaId: null,
            isDefault: false,
            launchArgument: '--profile-directory="Profile 1"',
          },
        ],
      },
      {
        id: 'edge',
        name: 'Microsoft Edge',
        isInstalled: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        localStatePath: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\Edge\\User Data\\Local State',
        userDataDir: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\Edge\\User Data',
        profiles: [
          {
            browserId: 'edge',
            browserName: 'Microsoft Edge',
            folderName: 'Default',
            displayName: 'Microsoft 365 Work',
            initials: 'M3',
            avatarPath: null,
            avatarIcon: null,
            gaiaId: null,
            isDefault: true,
            launchArgument: '--profile-directory="Default"',
          },
        ],
      },
      {
        id: 'vivaldi',
        name: 'Vivaldi',
        isInstalled: false,
        executablePath: null,
        localStatePath: null,
        userDataDir: null,
        profiles: [],
      },
    ];

    if (asJson) {
      console.log(JSON.stringify(mockBrowsers, null, 2));
      return;
    }

    console.log(formatConsoleReport(mockBrowsers, { isMock: true, lad: 'C:\\Users\\User\\AppData\\Local' }));
    return;
  }

  // Real detection against the current filesystem
  result = detectAllBrowsers();

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatConsoleReport(result.browsers, { isMock: false }));
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    console.error('Error running profile detection:', err);
    process.exit(1);
  });
}
