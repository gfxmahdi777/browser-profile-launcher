import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } from 'electron';
import electronUpdater from 'electron-updater';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { detectAllBrowsers } from '../src/detect/detect.ts';
import { LocalStateWatcher } from '../src/main/watcher.ts';
import { launchBrowserProfile } from '../src/main/launcher.ts';
import { SettingsManager } from '../src/main/settings.ts';
import { createDesktopShortcut } from '../src/main/shortcut.ts';
import { SUPPORTED_BROWSERS } from '../src/shared/constants.ts';
import {
  BrowserId,
  DetectionResult,
  ProfileCustomization,
  RawLocalState,
  UpdateStatusPayload,
} from '../src/shared/types.ts';

const { autoUpdater } = electronUpdater;

// 1. Single Instance Lock (Allow only one running copy of the app)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let watcher: LocalStateWatcher | null = null;

// Check if launched with --hidden flag (e.g., background auto-start)
const startHidden = process.argv.includes('--hidden');

// Settings stored in Electron app userData folder (never in browser folders)
const settingsManager = new SettingsManager(app.getPath('userData'));

// Isolated temporary sandbox folder for safe test profile creation
const SAFE_SANDBOX_DIR = path.join(app.getPath('temp'), 'bpl-sandbox-test');

function sendUpdateStatus(payload: UpdateStatusPayload) {
  mainWindow?.webContents.send('update-status', payload);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({
      status: 'checking',
      message: 'Checking for updates...',
    });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      version: info?.version,
      message: `Update v${info?.version || 'new'} found. Downloading...`,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      status: 'up-to-date',
      version: info?.version,
      message: 'You are running the latest version.',
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const pct = Math.round(progressObj?.percent || 0);
    sendUpdateStatus({
      status: 'downloading',
      progress: pct,
      message: `Downloading update... ${pct}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      status: 'downloaded',
      version: info?.version,
      progress: 100,
      message: `Update v${info?.version || 'new'} ready to install. Restart now?`,
    });
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({
      status: 'error',
      message: err?.message || 'Could not check for updates.',
    });
  });
}

function triggerUpdateCheck() {
  if (!app.isPackaged) {
    sendUpdateStatus({
      status: 'up-to-date',
      version: app.getVersion(),
      message: 'Development build — auto-updates run in packaged .exe.',
    });
    return;
  }
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    sendUpdateStatus({
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

function getCachedDetection(): DetectionResult {
  const realDetection = detectAllBrowsers();
  realDetection.watchedFiles = watcher ? watcher.getWatchedFiles() : [];
  return realDetection;
}

function getTrayIconImage() {
  const icoPath = path.join(__dirname, 'assets', 'tray-icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'tray-icon.png');
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath);
  }
  if (fs.existsSync(pngPath)) {
    return nativeImage.createFromPath(pngPath);
  }
  return nativeImage.createEmpty();
}

function showAndFocusMainWindow() {
  if (!mainWindow) {
    createWindow(true);
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

function createWindow(forceShow = false) {
  const appIconPath = path.join(
    __dirname,
    'assets',
    process.platform === 'win32' ? 'app-icon.ico' : 'app-icon.png'
  );

  const shouldShowImmediately = forceShow || !startHidden;

  mainWindow = new BrowserWindow({
    width: 1050,
    height: 720,
    minWidth: 500,
    minHeight: 450,
    center: true,
    show: shouldShowImmediately,
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    movable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    title: 'Browser Profile Launcher',
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  // Remove default application menu bar on Windows for a clean native frame
  mainWindow.setMenuBarVisibility(false);

  // Always load the compiled local HTML file directly in the packaged app or when built
  const distIndex = path.join(__dirname, '../dist/index.html');
  if (app.isPackaged || fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  // Prevent app from quitting on window close; hide to system tray instead unless quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Ensure window is visible and focused once ready (unless started with --hidden), then check for updates
  mainWindow.once('ready-to-show', () => {
    if (shouldShowImmediately && mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }

    // Automatically check for updates on GitHub Releases once window is ready
    if (app.isPackaged) {
      setTimeout(() => {
        triggerUpdateCheck();
      }, 1500);
    }
  });
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow(true);
    return;
  }

  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    if (mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.focus();
    }
  } else {
    showAndFocusMainWindow();
  }
}

function createTray() {
  tray = new Tray(getTrayIconImage());
  tray.setToolTip('Browser Profile Launcher');

  // Left click toggles/focuses the desktop window
  tray.on('click', () => {
    toggleWindow();
  });

  // Right-click context menu: Open, Check for Updates, Start with Windows, Quit
  updateTrayContextMenu();
}

function updateTrayContextMenu() {
  if (!tray) return;

  const openAtLogin = app.getLoginItemSettings().openAtLogin;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        showAndFocusMainWindow();
      },
    },
    {
      label: 'Check for Updates',
      click: () => {
        showAndFocusMainWindow();
        triggerUpdateCheck();
      },
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          path: process.execPath,
          args: ['--hidden'],
        });
        settingsManager.updateGeneralSettings({
          startWithWindows: menuItem.checked,
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// 2. Setup IPC handlers securely
function setupIpc() {
  ipcMain.handle('get-state', () => {
    const detection = getCachedDetection();
    return {
      detection,
      settings: settingsManager.getSettings(),
      settingsFilePath: settingsManager.getSettingsPath(),
    };
  });

  ipcMain.handle('check-for-updates', () => {
    triggerUpdateCheck();
    return { ok: true };
  });

  ipcMain.handle('quit-and-install-update', () => {
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  // Launching a profile keeps mainWindow open so users can launch multiple profiles easily
  ipcMain.handle(
    'launch-profile',
    (
      _event,
      {
        browserId,
        folderName,
        displayName,
        targetUrl,
      }: {
        browserId: BrowserId;
        folderName: string;
        displayName?: string;
        targetUrl?: string;
      }
    ) => {
      const detection = getCachedDetection();
      const browser = detection.browsers.find((b) => b.id === browserId);
      const def = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      const exe = browser?.executablePath || def?.standardExePaths[0] || null;

      return launchBrowserProfile(
        exe,
        folderName,
        browser?.name || displayName,
        targetUrl
      );
    }
  );

  ipcMain.handle(
    'update-profile-settings',
    (
      _event,
      {
        browserId,
        folderName,
        customization,
      }: {
        browserId: BrowserId;
        folderName: string;
        customization: Partial<ProfileCustomization>;
      }
    ) => {
      return settingsManager.updateProfileCustomization(
        browserId,
        folderName,
        customization
      );
    }
  );

  ipcMain.handle('update-general-settings', (_event, settings) => {
    if (typeof settings.startWithWindows === 'boolean') {
      app.setLoginItemSettings({
        openAtLogin: settings.startWithWindows,
        path: process.execPath,
        args: ['--hidden'],
      });
      updateTrayContextMenu();
    }
    return settingsManager.updateGeneralSettings(settings);
  });

  ipcMain.handle(
    'rename-group',
    (
      _event,
      {
        oldName,
        newName,
        newIcon,
      }: { oldName: string; newName: string; newIcon?: string }
    ) => {
      return settingsManager.renameGroup(oldName, newName, newIcon);
    }
  );

  ipcMain.handle('delete-group', (_event, { groupName }: { groupName: string }) => {
    return settingsManager.deleteGroup(groupName);
  });

  ipcMain.handle('toggle-startup', (_event, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath,
      args: ['--hidden'],
    });
    settingsManager.updateGeneralSettings({ startWithWindows: enable });
    updateTrayContextMenu();
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle(
    'create-shortcut',
    (
      _event,
      {
        browserId,
        folderName,
        displayName,
        targetUrl,
      }: {
        browserId: BrowserId;
        folderName: string;
        displayName: string;
        targetUrl?: string;
      }
    ) => {
      const detection = getCachedDetection();
      const browser = detection.browsers.find((b) => b.id === browserId);
      const def = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      const exe = browser?.executablePath || def?.standardExePaths[0] || null;

      // Use Electron native shell.writeShortcutLink on Windows
      if (process.platform === 'win32' && exe) {
        try {
          const safeName = `${browser?.name || browserId} - ${displayName}`.replace(
            /[<>:"/\\|?*]/g,
            ''
          );
          const shortcutPath = path.join(
            os.homedir(),
            'Desktop',
            `${safeName}.lnk`
          );
          const validUrl =
            targetUrl && /^https?:\/\//i.test(targetUrl.trim())
              ? targetUrl.trim()
              : null;
          const shortcutArgs = validUrl
            ? `--profile-directory="${folderName}" "${validUrl}"`
            : `--profile-directory="${folderName}"`;
          const written = shell.writeShortcutLink(shortcutPath, {
            target: exe,
            args: shortcutArgs,
            description: `Launch ${browser?.name || browserId} (${displayName})`,
            icon: exe,
            iconIndex: 0,
          });
          if (written) {
            return {
              success: true,
              shortcutPath,
              targetExe: exe,
              arguments: shortcutArgs,
              message: `Created desktop shortcut: ${safeName}.lnk`,
              isSimulated: false,
            };
          }
        } catch {
          // Fallback to PowerShell shortcut helper
        }
      }

      return createDesktopShortcut(
        browser?.name || browserId,
        exe,
        folderName,
        displayName,
        targetUrl
      );
    }
  );

  // Safe Sandbox Test Profile Creation (strictly writes to temporary SAFE_SANDBOX_DIR, never real browser files)
  ipcMain.handle(
    'create-sandbox-profile',
    (
      _event,
      {
        browserId,
        profileName,
        email,
      }: { browserId: BrowserId; profileName: string; email?: string }
    ) => {
      const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      if (!browserDef) {
        return { ok: false, message: 'Invalid browser ID' };
      }
      const localStatePath = path.join(
        SAFE_SANDBOX_DIR,
        ...browserDef.localStateSubpath.split('/')
      );
      if (!localStatePath.startsWith(SAFE_SANDBOX_DIR)) {
        return { ok: false, message: 'Safety block: outside sandbox' };
      }
      fs.mkdirSync(path.dirname(localStatePath), { recursive: true });
      let stateObj: RawLocalState = { profile: { info_cache: {} } };
      if (fs.existsSync(localStatePath)) {
        try {
          stateObj = JSON.parse(
            fs.readFileSync(localStatePath, 'utf8')
          ) as RawLocalState;
        } catch {
          stateObj = { profile: { info_cache: {} } };
        }
      }
      if (!stateObj.profile) stateObj.profile = {};
      if (!stateObj.profile.info_cache) stateObj.profile.info_cache = {};
      const existingKeys = Object.keys(stateObj.profile.info_cache);
      let nextNum = 1;
      while (existingKeys.includes(`Profile ${nextNum}`)) {
        nextNum++;
      }
      const folderName =
        existingKeys.length === 0 ? 'Default' : `Profile ${nextNum}`;
      stateObj.profile.info_cache[folderName] = {
        name: profileName.trim() || `Test Profile ${nextNum}`,
        user_name: email?.trim() || `test${nextNum}@example.com`,
        active_time: Date.now() / 1000,
      };
      fs.writeFileSync(
        localStatePath,
        JSON.stringify(stateObj, null, 2),
        'utf8'
      );
      return {
        ok: true,
        message: `Created test profile "${profileName}" (${folderName}) in temporary sandbox.`,
      };
    }
  );

  ipcMain.handle(
    'delete-sandbox-profile',
    (
      _event,
      { browserId, folderName }: { browserId: BrowserId; folderName: string }
    ) => {
      const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      if (!browserDef) return { ok: false, message: 'Invalid browser ID' };
      const localStatePath = path.join(
        SAFE_SANDBOX_DIR,
        ...browserDef.localStateSubpath.split('/')
      );
      if (
        !localStatePath.startsWith(SAFE_SANDBOX_DIR) ||
        !fs.existsSync(localStatePath)
      ) {
        return { ok: false, message: 'Sandbox file not found' };
      }
      try {
        const stateObj = JSON.parse(
          fs.readFileSync(localStatePath, 'utf8')
        ) as RawLocalState;
        if (stateObj.profile?.info_cache?.[folderName]) {
          delete stateObj.profile.info_cache[folderName];
          fs.writeFileSync(
            localStatePath,
            JSON.stringify(stateObj, null, 2),
            'utf8'
          );
        }
        return {
          ok: true,
          message: `Removed "${folderName}" from temporary sandbox.`,
        };
      } catch {
        return { ok: false, message: 'Could not update sandbox file' };
      }
    }
  );

  ipcMain.handle('hide-window', () => {
    mainWindow?.hide();
  });

  ipcMain.handle('quit-app', () => {
    isQuitting = true;
    app.quit();
  });
}

// 3. App Lifecycle
app.on('second-instance', () => {
  showAndFocusMainWindow();
});

app.whenReady().then(() => {
  setupAutoUpdater();
  setupIpc();
  createTray();
  createWindow();

  // Milestone 3: Real fs.watch file watching with 500ms debounce on real Windows Local State files
  watcher = new LocalStateWatcher(
    {},
    (detection, eventLog) => {
      mainWindow?.webContents.send('profiles-updated', { detection, eventLog });
    },
    500
  );
  watcher.start();
});

app.on('before-quit', () => {
  isQuitting = true;
  watcher?.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'win32' && isQuitting) {
    app.quit();
  }
});
