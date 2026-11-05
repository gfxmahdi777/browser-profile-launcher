import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { detectAllBrowsers } from '../src/detect/detect.ts';
import { LocalStateWatcher } from '../src/main/watcher.ts';
import { launchBrowserProfile } from '../src/main/launcher.ts';
import { SettingsManager } from '../src/main/settings.ts';
import { createDesktopShortcut } from '../src/main/shortcut.ts';
import { SUPPORTED_BROWSERS } from '../src/shared/constants.ts';
import { BrowserId, DetectionResult, ProfileCustomization } from '../src/shared/types.ts';

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

// Settings stored in Electron app userData folder (never in browser folders)
const settingsManager = new SettingsManager(app.getPath('userData'));

function getCachedDetection(): DetectionResult {
  return detectAllBrowsers();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 390,
    height: 560,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#020617', // Match dark slate-950 theme
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  // Load production HTML or local dev server
  if (app.isPackaged || process.env.NODE_ENV === 'production') {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  // Prevent app from quitting on window close; hide to system tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Fast startup: show window only when ready
  mainWindow.once('ready-to-show', () => {
    positionWindowNearTray();
    mainWindow?.show();
  });

  // Hide popup if focus is lost (like standard Windows tray popups)
  mainWindow.on('blur', () => {
    if (!mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow?.hide();
    }
  });
}

function positionWindowNearTray() {
  if (!mainWindow || !tray) return;

  const trayBounds = tray.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const [windowWidth, windowHeight] = mainWindow.getSize();

  // Position above the Windows taskbar near tray
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowWidth / 2);
  let y = Math.round(trayBounds.y - windowHeight - 8);

  // Fallback if tray bounds are unavailable
  if (x <= 0 || y <= 0 || x + windowWidth > screenWidth) {
    x = screenWidth - windowWidth - 16;
    y = screenHeight - windowHeight - 16;
  }

  mainWindow.setPosition(x, y, false);
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    positionWindowNearTray();
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Browser Profile Launcher');

  // Left click toggles the popup window near tray
  tray.on('click', () => {
    toggleWindow();
  });

  // Right-click context menu: Open, Start with Windows, Quit
  updateTrayContextMenu();
}

function updateTrayContextMenu() {
  if (!tray) return;

  const openAtLogin = app.getLoginItemSettings().openAtLogin;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Launcher',
      click: () => {
        if (!mainWindow) createWindow();
        positionWindowNearTray();
        mainWindow?.show();
        mainWindow?.focus();
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
        });
        settingsManager.updateGeneralSettings({ startWithWindows: menuItem.checked });
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

  ipcMain.handle(
    'launch-profile',
    (_event, { browserId, folderName, displayName }: { browserId: BrowserId; folderName: string; displayName?: string }) => {
      const detection = getCachedDetection();
      const browser = detection.browsers.find((b) => b.id === browserId);
      const def = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      const exe = browser?.executablePath || def?.standardExePaths[0] || null;

      return launchBrowserProfile(exe, folderName, browser?.name || displayName);
    }
  );

  ipcMain.handle(
    'update-profile-settings',
    (_event, { browserId, folderName, customization }: { browserId: BrowserId; folderName: string; customization: Partial<ProfileCustomization> }) => {
      return settingsManager.updateProfileCustomization(browserId, folderName, customization);
    }
  );

  ipcMain.handle('update-general-settings', (_event, settings) => {
    if (typeof settings.startWithWindows === 'boolean') {
      app.setLoginItemSettings({
        openAtLogin: settings.startWithWindows,
        path: process.execPath,
      });
      updateTrayContextMenu();
    }
    return settingsManager.updateGeneralSettings(settings);
  });

  ipcMain.handle('toggle-startup', (_event, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath,
    });
    settingsManager.updateGeneralSettings({ startWithWindows: enable });
    updateTrayContextMenu();
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle(
    'create-shortcut',
    (_event, { browserId, folderName, displayName }: { browserId: BrowserId; folderName: string; displayName: string }) => {
      const detection = getCachedDetection();
      const browser = detection.browsers.find((b) => b.id === browserId);
      const def = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      const exe = browser?.executablePath || def?.standardExePaths[0] || null;

      return createDesktopShortcut(browser?.name || browserId, exe, folderName, displayName);
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
  // If user tries to open a second instance, show existing window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    positionWindowNearTray();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  setupIpc();
  createWindow();
  createTray();

  // Milestone 3: Real fs.watch file watching with 500ms debounce
  // Purely event-driven: 0 polling intervals, 0 memory leaks
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
  // On Windows, keep running in background tray icon
  if (process.platform !== 'win32' && isQuitting) {
    app.quit();
  }
});
