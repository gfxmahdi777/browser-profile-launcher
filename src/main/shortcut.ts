import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

export interface ShortcutResult {
  success: boolean;
  shortcutPath: string;
  targetExe: string;
  arguments: string;
  message: string;
  isSimulated: boolean;
}

/**
 * Creates a Windows Desktop shortcut (.lnk) for a specific browser profile.
 * Equivalent to Electron's shell.writeShortcutLink with target exe and --profile-directory argument.
 */
export function createDesktopShortcut(
  browserName: string,
  executablePath: string | null,
  folderName: string,
  profileDisplayName: string
): ShortcutResult {
  const safeName = `${browserName} - ${profileDisplayName}`.replace(/[<>:"/\\|?*]/g, '');
  const desktopDir = path.join(os.homedir(), 'Desktop');
  const shortcutPath = path.join(desktopDir, `${safeName}.lnk`);
  const targetExe = executablePath || `${browserName.toLowerCase().replace(/\s+/g, '')}.exe`;
  const args = `--profile-directory="${folderName}"`;

  if (process.platform === 'win32' && executablePath) {
    try {
      // Create .lnk shortcut on Windows Desktop using PowerShell WScript.Shell
      const psScript = `
        $WshShell = New-Object -ComObject WScript.Shell;
        $Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
        $Shortcut.TargetPath = '${executablePath.replace(/'/g, "''")}';
        $Shortcut.Arguments = '${args.replace(/'/g, "''")}';
        $Shortcut.Description = 'Launch ${browserName.replace(/'/g, "''")} (${profileDisplayName.replace(/'/g, "''")})';
        $Shortcut.Save();
      `;
      execSync(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\r?\n/g, ' ')}"`, {
        stdio: 'ignore',
      });

      return {
        success: true,
        shortcutPath,
        targetExe,
        arguments: args,
        message: `Created desktop shortcut: ${safeName}.lnk`,
        isSimulated: false,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        shortcutPath,
        targetExe,
        arguments: args,
        message: `Could not create .lnk file: ${errorMsg}`,
        isSimulated: false,
      };
    }
  }

  return {
    success: true,
    shortcutPath: `C:\\Users\\User\\Desktop\\${safeName}.lnk`,
    targetExe,
    arguments: args,
    message: `Desktop shortcut prepared: "${safeName}.lnk" → "${targetExe}" ${args}`,
    isSimulated: true,
  };
}
