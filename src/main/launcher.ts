import { spawn } from 'node:child_process';

export interface LaunchResult {
  success: boolean;
  command: string;
  executablePath: string;
  folderName: string;
  targetUrl?: string;
  message: string;
  platform: string;
  isSimulated?: boolean;
}

/**
 * Validates and normalizes an optional HTTP/HTTPS startup URL.
 * Returns the validated URL string if valid http:// or https://, or null otherwise.
 */
export function validateLaunchUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Launches a Chromium browser with the specified profile folder and optional target URL.
 * Uses detached: true, stdio: 'ignore', and unref() as specified in Section 8 of the brief.
 * This ensures that closing the launcher app does not close the opened browser windows.
 */
export function launchBrowserProfile(
  executablePath: string | null,
  folderName: string,
  fallbackBrowserName?: string,
  targetUrl?: string | null
): LaunchResult {
  const validUrl = validateLaunchUrl(targetUrl);
  const profileArg = `--profile-directory="${folderName}"`;
  const exe = executablePath || `${fallbackBrowserName || 'browser'}.exe`;
  const fullCommand = validUrl
    ? `"${exe}" ${profileArg} "${validUrl}"`
    : `"${exe}" ${profileArg}`;

  const spawnArgs = validUrl
    ? [`--profile-directory=${folderName}`, validUrl]
    : [`--profile-directory=${folderName}`];

  // If running on Windows with a valid executable path, perform real process spawning
  if (process.platform === 'win32' && executablePath) {
    try {
      const child = spawn(executablePath, spawnArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });

      child.unref();

      return {
        success: true,
        command: fullCommand,
        executablePath,
        folderName,
        targetUrl: validUrl || undefined,
        message: validUrl
          ? `Successfully launched ${fallbackBrowserName || 'browser'} (${folderName}) → ${validUrl}`
          : `Successfully launched ${fallbackBrowserName || 'browser'} with profile "${folderName}".`,
        platform: 'win32',
        isSimulated: false,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        command: fullCommand,
        executablePath,
        folderName,
        targetUrl: validUrl || undefined,
        message: `Failed to spawn process: ${errorMsg}`,
        platform: 'win32',
        isSimulated: false,
      };
    }
  }

  // Cross-platform environment / Cloud preview simulation
  return {
    success: true,
    command: fullCommand,
    executablePath: exe,
    folderName,
    targetUrl: validUrl || undefined,
    message:
      process.platform === 'win32'
        ? `Browser executable not found on disk at "${exe}". Launch command prepared.`
        : `Simulated launch on ${process.platform}: "${fullCommand}" (detached: true, unref).`,
    platform: process.platform,
    isSimulated: process.platform !== 'win32' || !executablePath,
  };
}
