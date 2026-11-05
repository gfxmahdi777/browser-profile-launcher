import { spawn } from 'node:child_process';

export interface LaunchResult {
  success: boolean;
  command: string;
  executablePath: string;
  folderName: string;
  message: string;
  platform: string;
  isSimulated?: boolean;
}

/**
 * Launches a Chromium browser with the specified profile folder.
 * Uses detached: true, stdio: 'ignore', and unref() as specified in Section 8 of the brief.
 * This ensures that closing the launcher app does not close the opened browser windows.
 */
export function launchBrowserProfile(
  executablePath: string | null,
  folderName: string,
  fallbackBrowserName?: string
): LaunchResult {
  const profileArg = `--profile-directory="${folderName}"`;
  const exe = executablePath || `${fallbackBrowserName || 'browser'}.exe`;
  const fullCommand = `"${exe}" ${profileArg}`;

  // If running on Windows with a valid executable path, perform real process spawning
  if (process.platform === 'win32' && executablePath) {
    try {
      const child = spawn(executablePath, [`--profile-directory=${folderName}`], {
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
        message: `Successfully launched ${fallbackBrowserName || 'browser'} with profile "${folderName}".`,
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
    message:
      process.platform === 'win32'
        ? `Browser executable not found on disk at "${exe}". Launch command prepared.`
        : `Simulated launch on ${process.platform}: "${fullCommand}" (detached: true, unref).`,
    platform: process.platform,
    isSimulated: process.platform !== 'win32' || !executablePath,
  };
}
