import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { BrowserDefinition } from '../shared/types.ts';

/**
 * Returns the Windows LOCALAPPDATA path, with fallback for cross-platform/mock testing.
 */
export function getLocalAppDataDir(overridePath?: string): string {
  if (overridePath) {
    return overridePath;
  }

  if (process.env.LOCALAPPDATA) {
    return process.env.LOCALAPPDATA;
  }

  // Fallback if running on Windows without LOCALAPPDATA env var set
  const homeDir = os.homedir();
  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Local');
  }

  // Cross-platform mock fallback
  return path.join(homeDir, '.local', 'share');
}

/**
 * Expands Windows environment variables (%VAR%) in a path.
 */
export function expandWindowsPath(rawPath: string, localAppData?: string): string {
  const lad = localAppData || getLocalAppDataDir();
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  return rawPath
    .replace(/%LOCALAPPDATA%/gi, lad)
    .replace(/%PROGRAMFILES\(X86\)%/gi, programFilesX86)
    .replace(/%PROGRAMFILES%/gi, programFiles);
}

/**
 * Checks Windows Registry for an App Path executable key.
 * Registry path: HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\<exe>
 * and HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\<exe>
 */
export function findExecutableInRegistry(exeKey: string): string | null {
  if (process.platform !== 'win32') {
    return null;
  }

  const hives = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths',
  ];

  for (const hive of hives) {
    try {
      const regCommand = `reg query "${hive}\\${exeKey}" /ve`;
      const output = execSync(regCommand, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      // Example output:
      // HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe
      //     (Default)    REG_SZ    C:\Program Files\Google\Chrome\Application\chrome.exe
      const lines = output.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('REG_SZ')) {
          const parts = trimmed.split('REG_SZ');
          if (parts.length >= 2) {
            const foundPath = parts[1].trim().replace(/^"|"$/g, '');
            if (fs.existsSync(foundPath)) {
              return foundPath;
            }
          }
        }
      }
    } catch {
      // Ignore registry query errors and continue checking
    }
  }

  return null;
}

/**
 * Finds the executable for a given browser by checking:
 * 1. Windows Registry (HKLM & HKCU App Paths)
 * 2. Standard filesystem paths
 */
export function findBrowserExecutable(
  browserDef: BrowserDefinition,
  options?: { localAppDataDir?: string; mockFs?: boolean }
): string | null {
  // Step 1: Windows Registry check
  const regPath = findExecutableInRegistry(browserDef.registryAppPathKey);
  if (regPath) {
    return regPath;
  }

  // Step 2: Standard folder locations
  for (const rawPath of browserDef.standardExePaths) {
    const resolvedPath = expandWindowsPath(rawPath, options?.localAppDataDir);
    try {
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    } catch {
      // Ignore filesystem access errors
    }
  }

  return null;
}

/**
 * Checks for profile image files in the profile directory.
 * Common Chromium profile image names:
 * - Google Profile Picture.png
 * - Edge Profile Picture.png
 * - Profile Picture.png
 */
export function findProfilePicture(profileDirPath: string): string | null {
  const candidateNames = [
    'Google Profile Picture.png',
    'Edge Profile Picture.png',
    'Profile Picture.png',
    'Google Profile Picture.jpg',
    'Profile Picture.jpg',
  ];

  for (const name of candidateNames) {
    const fullPath = path.join(profileDirPath, name);
    try {
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    } catch {
      // Ignore access errors
    }
  }

  return null;
}

export { getInitials } from './parser.ts';
