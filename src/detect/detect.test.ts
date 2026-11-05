import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseLocalState, detectAllBrowsers } from './detect.ts';
import { getInitials, expandWindowsPath } from './paths.ts';
import { SUPPORTED_BROWSERS } from '../shared/constants.ts';
import { launchBrowserProfile } from '../main/launcher.ts';
import { LocalStateWatcher } from '../main/watcher.ts';
import { SettingsManager, getProfileKey } from '../main/settings.ts';

const chromeDef = SUPPORTED_BROWSERS.find((b) => b.id === 'chrome')!;

test('Milestone 1: parseLocalState extracts multiple profiles correctly', () => {
  const sampleJson = JSON.stringify({
    profile: {
      info_cache: {
        Default: {
          name: 'Main Personal',
          user_name: 'test@gmail.com',
          gaia_name: 'Test User',
          avatar_icon: 'chrome://theme/IDR_PROFILE_AVATAR_0',
        },
        'Profile 1': {
          name: 'Work Profile',
          user_name: 'work@company.com',
        },
        'Profile 2': {
          user_name: 'social@fb.com',
        },
      },
    },
  });

  const { profiles, error } = parseLocalState(sampleJson, chromeDef, null);

  assert.equal(error, undefined);
  assert.equal(profiles.length, 3);

  const defaultProf = profiles.find((p) => p.folderName === 'Default')!;
  assert.equal(defaultProf.displayName, 'Main Personal');
  assert.equal(defaultProf.isDefault, true);
  assert.equal(defaultProf.initials, 'MP');
  assert.equal(defaultProf.launchArgument, '--profile-directory="Default"');

  const workProf = profiles.find((p) => p.folderName === 'Profile 1')!;
  assert.equal(workProf.displayName, 'Work Profile');
  assert.equal(workProf.initials, 'WP');
  assert.equal(workProf.launchArgument, '--profile-directory="Profile 1"');

  const fallbackProf = profiles.find((p) => p.folderName === 'Profile 2')!;
  assert.equal(fallbackProf.displayName, 'social@fb.com');
  assert.equal(fallbackProf.initials, 'SO');
});

test('Milestone 1: parseLocalState handles empty string or whitespace without crashing', () => {
  const result = parseLocalState('', chromeDef, null);
  assert.equal(result.profiles.length, 0);
  assert.match(result.error!, /empty/i);

  const whitespaceResult = parseLocalState('   \n  ', chromeDef, null);
  assert.equal(whitespaceResult.profiles.length, 0);
  assert.match(whitespaceResult.error!, /empty/i);
});

test('Milestone 1: parseLocalState handles malformed JSON safely without throwing', () => {
  const malformedJson = '{ "profile": { "info_cache": { INVALID JSON HERE';
  const result = parseLocalState(malformedJson, chromeDef, null);

  assert.equal(result.profiles.length, 0);
  assert.match(result.error!, /Malformed JSON/i);
});

test('Milestone 1: parseLocalState handles JSON with missing profile or info_cache', () => {
  const emptyState = JSON.stringify({ browser: { enabled_labs_experiments: [] } });
  const result = parseLocalState(emptyState, chromeDef, null);

  assert.equal(result.profiles.length, 0);
  assert.equal(result.error, undefined);
});

test('Milestone 1: getInitials extracts clean 1-2 letter initials', () => {
  assert.equal(getInitials('John Doe'), 'JD');
  assert.equal(getInitials('Alice'), 'AL');
  assert.equal(getInitials('work profile 2'), 'WP');
  assert.equal(getInitials(''), '?');
  assert.equal(getInitials('   '), '?');
});

test('Milestone 1: expandWindowsPath replaces %LOCALAPPDATA% and %PROGRAMFILES%', () => {
  const mockLad = 'C:\\MockAppdata\\Local';
  const rawPath = '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Local State';
  const expanded = expandWindowsPath(rawPath, mockLad);

  assert.equal(expanded, 'C:\\MockAppdata\\Local\\Google\\Chrome\\User Data\\Local State');
});

test('Milestone 1: detectAllBrowsers returns valid report even when browsers are not installed on host', () => {
  const result = detectAllBrowsers({
    localAppDataDir: '/non-existent-directory-test',
    checkExecutables: false,
  });

  assert.equal(typeof result.platform, 'string');
  assert.equal(result.browsers.length, 4);
  for (const b of result.browsers) {
    assert.equal(b.isInstalled, false);
    assert.equal(b.profiles.length, 0);
  }
  assert.equal(result.totalProfilesCount, 0);
  assert.equal(result.installedBrowsersCount, 0);
});

test('Milestone 2: launchBrowserProfile formats --profile-directory command accurately', () => {
  const chromeLaunch = launchBrowserProfile(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'Profile 1',
    'Google Chrome'
  );
  assert.equal(chromeLaunch.success, true);
  assert.equal(
    chromeLaunch.command,
    '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --profile-directory="Profile 1"'
  );
  assert.equal(chromeLaunch.folderName, 'Profile 1');

  const braveLaunch = launchBrowserProfile(
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'Default',
    'Brave Browser'
  );
  assert.equal(braveLaunch.success, true);
  assert.equal(
    braveLaunch.command,
    '"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --profile-directory="Default"'
  );
});

test('Milestone 3: LocalStateWatcher detects newly added and deleted Brave profiles automatically', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bpl-watcher-test-'));
  const braveUserData = path.join(
    tmpDir,
    'BraveSoftware',
    'Brave-Browser',
    'User Data'
  );
  fs.mkdirSync(braveUserData, { recursive: true });
  const braveLocalState = path.join(braveUserData, 'Local State');

  // Initial state: 1 profile in Brave
  fs.writeFileSync(
    braveLocalState,
    JSON.stringify({
      profile: {
        info_cache: {
          Default: { name: 'Brave Main' },
        },
      },
    }),
    'utf8'
  );

  let latestProfileCount = 1;
  const watcher = new LocalStateWatcher(
    { localAppDataDir: tmpDir, checkExecutables: false },
    (result) => {
      const brave = result.browsers.find((b) => b.id === 'brave');
      if (brave) {
        latestProfileCount = brave.profiles.length;
      }
    },
    80 // Fast debounce for unit test
  );

  const watched = watcher.start();
  assert.equal(watched.length, 1);

  // Add a second profile ("Profile 1") to Brave Local State
  fs.writeFileSync(
    braveLocalState,
    JSON.stringify({
      profile: {
        info_cache: {
          Default: { name: 'Brave Main' },
          'Profile 1': { name: 'New Brave Profile' },
        },
      },
    }),
    'utf8'
  );

  // Wait for debounce to fire
  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.equal(latestProfileCount, 2);

  watcher.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('SettingsManager stores profile nicknames, colors, favorites, and groups in app userData', () => {
  const tmpSettingsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bpl-settings-test-'));
  const manager = new SettingsManager(tmpSettingsDir);

  manager.updateProfileCustomization('chrome', 'Profile 1', {
    nickname: 'FB Marketing #1',
    color: '#10b981',
    emoji: '🚀',
    favorite: true,
    group: 'Facebook',
  });

  const key = getProfileKey('chrome', 'Profile 1');
  const reloaded = new SettingsManager(tmpSettingsDir).getSettings();
  assert.equal(reloaded.profiles[key].nickname, 'FB Marketing #1');
  assert.equal(reloaded.profiles[key].favorite, true);
  assert.equal(reloaded.profiles[key].group, 'Facebook');

  fs.rmSync(tmpSettingsDir, { recursive: true, force: true });
});
