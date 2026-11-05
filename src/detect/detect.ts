import fs from 'node:fs';
import path from 'node:path';
import {
  BrowserDefinition,
  BrowserProfile,
  DetectedBrowser,
  DetectionResult,
  RawLocalState,
} from '../shared/types.ts';
import { SUPPORTED_BROWSERS } from '../shared/constants.ts';
import { parseLocalState, getInitials } from './parser.ts';
import {
  findBrowserExecutable,
  findProfilePicture,
  getLocalAppDataDir,
} from './paths.ts';
export { parseLocalState, getInitials };

export interface DetectOptions {
  localAppDataDir?: string;
  customLocalStatePaths?: Partial<Record<BrowserDefinition['id'], string>>;
  checkExecutables?: boolean;
}

/**
 * Detects profiles for a single browser.
 */
export function detectBrowser(
  browserDef: BrowserDefinition,
  options?: DetectOptions
): DetectedBrowser {
  const lad = getLocalAppDataDir(options?.localAppDataDir);
  const localStatePath =
    options?.customLocalStatePaths?.[browserDef.id] ||
    path.join(lad, ...browserDef.localStateSubpath.split('/'));

  const userDataDir = path.dirname(localStatePath);

  // Check if Local State exists
  let fileExists = false;
  try {
    fileExists = fs.existsSync(localStatePath);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      id: browserDef.id,
      name: browserDef.name,
      isInstalled: false,
      executablePath: null,
      localStatePath: null,
      userDataDir: null,
      profiles: [],
      error: `Filesystem check failed: ${errorMsg}`,
    };
  }

  if (!fileExists) {
    return {
      id: browserDef.id,
      name: browserDef.name,
      isInstalled: false,
      executablePath: null,
      localStatePath: null,
      userDataDir: null,
      profiles: [],
    };
  }

  // Read Local State file with protection against file locks or permissions
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(localStatePath, 'utf8');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      id: browserDef.id,
      name: browserDef.name,
      isInstalled: true,
      executablePath: null,
      localStatePath,
      userDataDir,
      profiles: [],
      error: `Could not read Local State file (locked or access denied): ${errorMsg}`,
    };
  }

  // Parse JSON and extract profiles
  const { profiles, error: parseError } = parseLocalState(
    rawContent,
    browserDef,
    (folderName) => findProfilePicture(path.join(userDataDir, folderName))
  );

  // Find browser executable
  let executablePath: string | null = null;
  if (options?.checkExecutables !== false) {
    executablePath = findBrowserExecutable(browserDef, {
      localAppDataDir: lad,
    });
  }

  return {
    id: browserDef.id,
    name: browserDef.name,
    isInstalled: true,
    executablePath,
    localStatePath,
    userDataDir,
    profiles,
    error: parseError || null,
  };
}

/**
 * Detects profiles for all supported browsers (Chrome, Brave, Edge, Vivaldi).
 */
export function detectAllBrowsers(
  options?: DetectOptions,
  browserDefs: BrowserDefinition[] = SUPPORTED_BROWSERS
): DetectionResult {
  const browsers = browserDefs.map((def) => detectBrowser(def, options));

  const totalProfilesCount = browsers.reduce(
    (sum, b) => sum + b.profiles.length,
    0
  );
  const installedBrowsersCount = browsers.filter((b) => b.isInstalled).length;

  return {
    platform: process.platform,
    timestamp: new Date().toISOString(),
    browsers,
    totalProfilesCount,
    installedBrowsersCount,
  };
}
